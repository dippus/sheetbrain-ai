import { invokeBedrockAgent } from '@/lib/aws/bedrock';
import { SheetData } from '@/types/sheet';
import { EditPlan, EditOp, FillSeriesOp, columnKeyToIndex, extractPreviewRows } from '@/lib/engine/editApplier';

interface BedrockEditPlanPayload {
  ops?: EditOp[];
  summary?: string;
}

/**
 * AGENT: The Edit Planner.
 *
 * Given the CURRENT sheet plus a plain-English instruction, it returns a small
 * typed operation list. It never writes cell values itself - every concrete
 * value (especially sequences like 12 monthly dates) is produced by the
 * deterministic applier, which guarantees correctness and ordering.
 */
export async function planEdit(
  instruction: string,
  sheet: SheetData
): Promise<{ plan: EditPlan; isFallback: boolean; latencyMs: number }> {
  const startTime = Date.now();

  const columnBrief = sheet.columns
    .map(c => `${c.key}="${c.label}" (${c.type})`)
    .join(', ');

  const preview = extractPreviewRows(sheet, 5);
  const lastRow = Object.keys(sheet.cellData).reduce((max, ref) => {
    const m = ref.match(/^[A-Za-z]+(\d+)$/);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 1);

  const systemPrompt = `You are the Edit Planner for SheetBrain AI. You translate a user's instruction into a JSON list of cell-editing operations.

You NEVER write cell values directly. You only choose which operation to use and its parameters. The application computes every value deterministically.

Available operations (use ONLY these):
1. fillSeries - write a repeating sequence into a column. Use this for dates, months, years, or incrementing numbers.
   { "op":"fillSeries", "column":"B", "startRow":2, "count":12, "series":"date", "start":"2005-10-01", "step":"month", "format":"dd/mm/yyyy" }
   series is "date" or "number". step for dates is one of: day, week, month, quarter, year. For numbers, "start" is the first value and "step" is the increment.
   start MUST be an ISO date (YYYY-MM-DD) whenever series is "date".
2. setColumnValues - write an explicit list of values down one column.
   { "op":"setColumnValues", "column":"B", "startRow":2, "values":[1,2,3] }
3. setCells - write specific cells by address.
   { "op":"setCells", "cells":{"B2":"01/10/2005","C2":"yes"} }
4. setHeader - rename a column's header.
   { "op":"setHeader", "column":"B", "label":"Date" }
5. addColumn - append a new column, optionally filled.
   { "op":"addColumn", "label":"Notes", "type":"string", "values":["a","b"] }
6. addRows - { "op":"addRows", "count":10 }
7. deleteRows - { "op":"deleteRows", "startRow":5, "count":2 }

RULES:
- Row 1 is the header. Data starts at row 2.
- For fillSeries, setColumnValues and setHeader, startRow MUST be 2 (the first data row under the header) unless the user explicitly names a different starting row. Do not append below the last populated row.
- Only use column keys that exist in the sheet, unless the user explicitly asks for a new column.
- For a request like "add 12 months of dates from 01-10-2005", emit ONE fillSeries op with count:12, series:"date", start:"2005-10-01", step:"month". Do not list the dates yourself.
- Copy any literal date, number or list verbatim from the instruction. Never invent a date that the user did not give.
- Never emit a value that starts with =, +, - or @. This planner cannot write formulas.
- Prefer a single operation over many setCells.
- Return ONLY strict JSON, no prose, no markdown:
{ "ops":[ ... ], "summary":"one short sentence describing what changed" }`;

  const userPrompt = `Instruction: "${instruction}"

Sheet name: ${sheet.name}
Current columns: ${columnBrief}
Last populated row: ${lastRow}
Sample data rows: ${JSON.stringify(preview)}`;

  try {
    const result = await invokeBedrockAgent<BedrockEditPlanPayload>({
      systemPrompt,
      userPrompt,
      maxTokens: 900,
      // Editing is interactive: a plan that arrives late is worse than a plan
      // that never arrives, so this stage is held to a short budget and falls
      // back to the rule-based planner below.
      timeoutMs: 12000,
    });

    if (result.data && Array.isArray(result.data.ops) && result.data.ops.length > 0) {
      const ops = result.data.ops
        .filter(op => op && typeof op === 'object' && typeof (op as { op?: string }).op === 'string')
        .map(op => reconcileWithInstruction(op, instruction))
        // `__rejected` marks an op the reconciliation pass refused to sign off on.
        .filter(op => op.op !== ('__rejected' as EditOp['op']));
      if (ops.length > 0) {
        return {
          plan: { ops, summary: result.data.summary || 'Applied requested changes.' },
          isFallback: false,
          latencyMs: result.latencyMs || Date.now() - startTime,
        };
      }

      // Every proposed op was refused, so fall through to the deterministic
      // planner and let it decide whether the request is safe at all.
    }
  } catch (error) {
    console.warn('[EditPlanner] Bedrock invocation note:', error);
  }

  return {
    plan: planEditDeterministically(instruction, sheet),
    isFallback: true,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Overrides model-proposed literal values with values parsed straight out of the
 * user's own words.
 *
 * A model asked to read "31-31-2005" invents a plausible date instead of
 * reporting the input is invalid, and a model told the sheet ends at row 9
 * happily starts a fill at row 10. Both are corrected here: the model keeps
 * ownership of intent (which operation, which column, how many) while literal
 * values and the default start row come from deterministic parsing.
 */
function reconcileWithInstruction(op: EditOp, instruction: string): EditOp {
  if (op.op !== 'fillSeries') return op;

  const next: FillSeriesOp = { ...op };

  // Only trust an explicitly named row. Matching a bare number after "from"
  // would read the day out of "from 03-04-2005" as row 3.
  const explicitRow = instruction.match(/\brow\s+(\d{1,5})\b/i);
  next.startRow = explicitRow ? clampStartRow(Number(explicitRow[1])) : 2;

  if (next.series === 'date') {
    const literal = extractStartDate(instruction);
    // Prefer the literal reading; fall back to the model's value only if the
    // instruction genuinely contains no parseable date.
    if (literal) {
      next.start = literal;
    } else if (hasDateShapedToken(instruction)) {
      // The user wrote something date-shaped but it is not a real date
      // ("31-31-2005"). The model will happily invent a plausible one, so the
      // op is dropped rather than filled with a fabricated value.
      return { ...op, op: '__rejected' } as unknown as EditOp;
    }
  }

  return next;
}

/** True when the text contains something that looks like a date but is not one. */
function hasDateShapedToken(instruction: string): boolean {
  return /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/.test(instruction) ||
         /\b\d{4}-\d{1,2}-\d{1,2}\b/.test(instruction);
}

function clampStartRow(row: number): number {
  if (!Number.isFinite(row)) return 2;
  return Math.min(5000, Math.max(2, Math.floor(row)));
}

const ORDINAL_WORDS: Record<string, number> = {  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, '11': 11, '12': 12, '24': 24, '30': 30, '36': 36, '60': 60,
};

function firstNumber(text: string, fallback: number): number {
  // Remove any date-like token first: in "from 01-10-2005 for 7 months" the
  // digits 01/10/2005 must not be mistaken for the requested count.
  const withoutDates = text
    .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, ' ')
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, ' ');

  const digit = withoutDates.match(/\b(\d{1,4})\b/);
  if (digit) return Number(digit[1]);
  for (const [word, value] of Object.entries(ORDINAL_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(withoutDates)) return value;
  }
  return fallback;
}

function resolveColumn(instruction: string, sheet: SheetData): string | null {
  const lower = instruction.toLowerCase();

  // 1) Natural phrasing wins: "the Date column", "in the Department column".
  for (const col of sheet.columns) {
    const label = col.label.toLowerCase();
    if (label.length >= 3 && lower.includes(`${label} column`)) return col.key.toUpperCase();
  }

  // 2) Explicit key: "column B", "col C".
  // The lookahead matters - without it "column from ..." yields the phantom key
  // "FR" and writes the whole series into a column that does not exist.
  const named = instruction.match(/\b(?:column|col|field)\s+\(?([A-Za-z]{1,2})(?![A-Za-z])/i);
  if (named) {
    const key = named[1].toUpperCase();
    if (columnKeyToIndex(key) >= 0) return key;
  }

  // 3) Bare mention of an existing column label.
  for (const col of sheet.columns) {
    const label = col.label.toLowerCase();
    if (label.length >= 3 && new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower)) {
      return col.key.toUpperCase();
    }
  }

  return null;
}

function detectStep(instruction: string): string {
  const t = instruction.toLowerCase();
  if (/\b(week|weekly|fortnight)\b/.test(t)) return 'week';
  if (/\b(quarter|quarterly|3 month)\b/.test(t)) return 'quarter';
  if (/\b(year|yearly|annual|annually)\b/.test(t)) return 'year';
  if (/\b(day|daily)\b/.test(t)) return 'day';
  return 'month';
}

function detectFormat(instruction: string): string {
  const t = instruction.toLowerCase();
  if (/yyyy-mm-dd/.test(t)) return 'yyyy-mm-dd';
  if (/\bmmm\b|month name/.test(t)) return 'mmm yyyy';
  if (/dd-mmm-yy/.test(t)) return 'dd-mmm-yy';
  if (/dd-mmm-yyyy/.test(t)) return 'd-mmm-yyyy';
  if (/mm\/dd\/yyyy/.test(t)) return 'mm/dd/yyyy';
  return 'dd/mm/yyyy';
}

function extractStartDate(instruction: string): string | null {
  // dd-mm-yyyy, dd/mm/yyyy, dd.mm.yyyy
  const dmy = instruction.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const month = Number(m);
    const day = Number(d);
    // Disambiguate d/m vs m/d by which value cannot be a month.
    let dd = day;
    let mm = month;
    if (month > 12 && day <= 12) { dd = month; mm = day; }
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }

  // yyyy-mm-dd
  const iso = instruction.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;

  // "1 Oct 2005" / "Oct 2005"
  const MON: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  const named = instruction.match(/\b(\d{1,2})?\s*([A-Za-z]{3,9})\.?\s*(\d{4})?\b/);
  if (named) {
    const key = named[2].slice(0, 3).toLowerCase();
    const month = MON[key];
    if (month) {
      const day = named[1] ? Number(named[1]) : 1;
      const year = named[3] || String(new Date().getUTCFullYear());
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return null;
}

/**
 * Rule-based planner used when Bedrock is slow or unavailable.
 * Deliberately narrow: it only claims to handle a fill-a-column-with-a-sequence
 * request, and otherwise returns no ops so the UI can report "not understood"
 * instead of guessing and damaging the sheet.
 */
export function planEditDeterministically(instruction: string, sheet: SheetData): EditPlan {
  const t = instruction.toLowerCase();
  const isFill = /\b(add|fill|insert|put|write|generate|populate)\b/.test(t);
  const wantsDate = /\b(date|dates|month|months|day|daily|weekly|quarter|year|annual)\b/.test(t);
  const column = resolveColumn(instruction, sheet);
  const start = extractStartDate(instruction);

  if (isFill && wantsDate && column && start) {
    const count = firstNumber(instruction, 12);
    const step = detectStep(instruction);
    return {
      ops: [{
        op: 'fillSeries',
        column,
        startRow: 2,
        count: Math.min(500, Math.max(1, count)),
        series: 'date',
        start,
        step,
        format: detectFormat(instruction),
      }],
      summary: `Filled ${column}2:${column}${1 + count} with ${count} ${step}ly dates from ${start}.`,
    };
  }

  // 2. Deterministic TOTAL / SUMMARY Row
  const wantsTotal = /\b(total|sum|summary|subtotal|calculate total|add total)\b/.test(t);
  if (wantsTotal) {
    let maxRow = 1;
    for (const ref of Object.keys(sheet.cellData)) {
      const m = ref.match(/^[A-Za-z]+(\d+)$/);
      if (m) maxRow = Math.max(maxRow, Number(m[1]));
    }
    const summaryRow = maxRow + 1;
    const cellsToAdd: Record<string, string | number> = {};
    const firstColKey = sheet.columns[0]?.key || 'A';
    cellsToAdd[`${firstColKey}${summaryRow}`] = 'TOTAL';

    const targetCol = resolveColumn(instruction, sheet);
    const colsToSum = targetCol
      ? sheet.columns.filter(c => c.key === targetCol)
      : sheet.columns.filter(c => c.type === 'number' || c.type === 'currency');

    let sumCount = 0;
    colsToSum.forEach(c => {
      let colSum = 0;
      for (let r = 2; r <= maxRow; r++) {
        const val = Number(sheet.cellData[`${c.key}${r}`]?.v);
        if (!isNaN(val) && isFinite(val)) {
          colSum += val;
        }
      }
      cellsToAdd[`${c.key}${summaryRow}`] = Math.round(colSum * 100) / 100;
      sumCount++;
    });

    if (sumCount > 0) {
      return {
        ops: [{ op: 'setCells', cells: cellsToAdd }],
        summary: `Computed and injected deterministic TOTAL summary at row ${summaryRow}.`,
      };
    }
  }

  // 3. Deterministic Column Scale / Percentage Math
  const mathMod = instruction.match(/\b(multiply|increase|decrease|scale)\s+(?:column\s+)?([A-Za-z]{1,2})\s+by\s+([0-9.]+)(%?)/i);
  if (mathMod) {
    const colKey = mathMod[2].toUpperCase();
    const factorNum = parseFloat(mathMod[3]);
    const isPercent = mathMod[4] === '%';
    const action = mathMod[1].toLowerCase();

    let multiplier = factorNum;
    if (isPercent) {
      multiplier = action === 'increase' ? 1 + factorNum / 100 : action === 'decrease' ? 1 - factorNum / 100 : factorNum / 100;
    }

    let maxRow = 1;
    for (const ref of Object.keys(sheet.cellData)) {
      const m = ref.match(/^[A-Za-z]+(\d+)$/);
      if (m) maxRow = Math.max(maxRow, Number(m[1]));
    }

    const modifiedCells: Record<string, number> = {};
    for (let r = 2; r <= maxRow; r++) {
      const ref = `${colKey}${r}`;
      const cell = sheet.cellData[ref];
      if (cell && typeof cell.v === 'number') {
        modifiedCells[ref] = Math.round(cell.v * multiplier * 100) / 100;
      }
    }

    if (Object.keys(modifiedCells).length > 0) {
      return {
        ops: [{ op: 'setCells', cells: modifiedCells }],
        summary: `Scaled column ${colKey} by ${multiplier}.`,
      };
    }
  }

  // 4. Deterministic Add Column
  const addColMatch = instruction.match(/\b(?:add|new|insert|create)\s+column\s+["']?([^"']+)["']?/i);
  if (addColMatch) {
    const label = addColMatch[1].trim();
    return {
      ops: [{ op: 'addColumn', label, type: 'string' }],
      summary: `Added new column "${label}".`,
    };
  }

  // 5. Deterministic Rename Column Header
  const renameMatch = instruction.match(/\b(?:rename|change header of)\s+(?:column\s+)?([A-Za-z]{1,2})\s+to\s+["']?([^"']+)["']?/i);
  if (renameMatch) {
    const col = renameMatch[1].toUpperCase();
    const label = renameMatch[2].trim();
    return {
      ops: [{ op: 'setHeader', column: col, label }],
      summary: `Renamed column ${col} to "${label}".`,
    };
  }

  return { ops: [], summary: 'Instruction could not be mapped to a supported edit.' };
}
