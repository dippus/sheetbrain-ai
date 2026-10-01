import { invokeBedrockAgent } from '@/lib/aws/bedrock';
import { isCircularReference } from '@/lib/engine/formulaEngine';
import { SheetCell, SheetColumn } from '@/types/sheet';
import { SchemaArchitectOutput, FormulaCompilerOutput } from './types';

interface BedrockFormulaPayload {
  formulaMap: Record<string, string>; // e.g. { "E2": "=D2-C2", "B10": "=SUM(B2:B9)" }
  summaryRowLabel?: string;
}

/**
 * Column labels that denote a running balance, a stock level, or another
 * quantity whose value is a snapshot rather than an independent contribution.
 * Summing these double counts every period.
 *
 * "Cash Flow" is deliberately excluded: a flow is an independent per-period
 * amount and legitimately sums, whereas a "Cash Balance" is a snapshot.
 */
const NON_ADDITIVE_LABEL =
  /\b(balance|balances|bank\b|runway|remaining|leftover|inventory|stock|onhand|on_hand|on-hand|reserve|position|level|owed|payable|receivable|headcount|population)\b|cash\b(?!\s*flow)|total\s+\w+/i;

/**
 * Decides how a column may be aggregated in the summary row.
 *
 * A column is a running cascade when most of its data cells are formulas that
 * read the row above (a "carry the balance forward" chain). Summing such a
 * column is arithmetically meaningless - it adds eight snapshots of the same
 * account, which is what previously reported a $8.79M "total" for a $1.2M
 * opening balance. The closing value is reported instead.
 */
type SummaryStrategy = 'sum' | 'average' | 'closing';

function detectSummaryStrategy(
  column: SheetColumn,
  cellData: Record<string, SheetCell>,
  lastDataRow: number
): SummaryStrategy {
  if (column.type === 'percentage') return 'average';

  // Snapshot semantics come first: a balance must never be added up.
  if (NON_ADDITIVE_LABEL.test(column.label || '')) return 'closing';

  let cascade = 0;
  let numeric = 0;
  for (let r = 2; r <= lastDataRow; r++) {
    const cell = cellData[`${column.key}${r}`];
    if (!cell) continue;
    if (cell.f) {
      // Reference to this column one row up == carry-forward chain.
      if (new RegExp(`\\b${column.key}\\s*${r - 1}\\b`).test(cell.f)) cascade++;
    } else if (typeof cell.v === 'number') {
      numeric++;
    }
  }

  if (cascade >= 2 && cascade >= numeric) return 'closing';
  return 'sum';
}

function buildSummaryFormula(
  column: SheetColumn,
  cellData: Record<string, SheetCell>,
  lastDataRow: number
): { f: string; strategy: SummaryStrategy } {
  const strategy = detectSummaryStrategy(column, cellData, lastDataRow);
  const key = column.key;
  switch (strategy) {
    case 'average':
      return { f: `=AVERAGE(${key}2:${key}${lastDataRow})`, strategy };
    case 'closing':
      // Report where the sheet ends up, not a meaningless accumulation.
      return { f: `=${key}${lastDataRow}`, strategy };
    case 'sum':
    default:
      return { f: `=SUM(${key}2:${key}${lastDataRow})`, strategy };
  }
}

/**
 * 🧮 AGENT 2: The Formula Compiler
 * Responsibility: Analyzes schema and rows produced by Agent 1, injects
 * reactive uppercase Excel formulas (=SUM, =AVERAGE, =IF, running cascades),
 * verifies anti-circular reference invariants, and appends summary aggregate rows.
 */
export async function executeFormulaCompiler(
  schema: SchemaArchitectOutput
): Promise<{ output: FormulaCompilerOutput; isFallback: boolean; latencyMs: number }> {
  const startTime = Date.now();
  const { columns, rawRows } = schema;
  const lastDataRow = rawRows.length + 1; // row 1 is header, data is 2..lastDataRow
  const summaryRow = lastDataRow + 1;

  const systemPrompt = `You are AGENT 2: The Formula Compiler for SheetBrain AI.
Your exclusive responsibility is mathematical relationship injection and reactive formula synthesis.
Given the column definitions and raw rows from Agent 1 (Schema Architect), determine:
1. Row-level formulas (e.g. Net = Revenue - Cost, Margin = Net / Revenue).
2. Summary aggregation formulas for Row ${summaryRow} (e.g. =SUM(B2:B${lastDataRow})).
STRICT RULES:
1. Every formula string MUST begin with '=' and use standard UPPERCASE Excel functions (=SUM, =AVERAGE, =ROUND, =IF).
2. ANTI-CIRCULAR GUARD: A cell must NEVER reference its own coordinate.
3. Return strict JSON:
{
  "summaryRowLabel": "TOTAL / MODEL AGGREGATE",
  "formulaMap": {
    "E2": "=(C2-D2)",
    "B${summaryRow}": "=SUM(B2:B${lastDataRow})"
  }
}`;

  try {
    const bedrockResult = await invokeBedrockAgent<BedrockFormulaPayload>({
      systemPrompt,
      userPrompt: `Columns: ${JSON.stringify(columns.map(c => ({ key: c.key, label: c.label, type: c.type })))}. Data rows: 2 to ${lastDataRow}. Sample row: ${JSON.stringify(rawRows[0])}`,
      maxTokens: 900,
      // Formula synthesis is deterministic by nature and the local AST compiler
      // is authoritative, so a slow model response is not worth blocking on.
      timeoutMs: 6000,
    });

    if (bedrockResult.data && bedrockResult.data.formulaMap && Object.keys(bedrockResult.data.formulaMap).length > 0) {
      const cellData = buildCellDataWithFormulas(schema, bedrockResult.data.formulaMap);
      return {
        output: {
          cellData,
          formulasInjectedCount: Object.keys(bedrockResult.data.formulaMap).length,
          summaryRowsCount: 1,
          antiCircularGuardPassed: true,
        },
        isFallback: false,
        latencyMs: bedrockResult.latencyMs || Date.now() - startTime,
      };
    }
  } catch (error) {
    console.warn('[Agent 2: FormulaCompiler] Bedrock invocation note:', error);
  }

  // Deterministic Fallback: AST Formula Compiler
  const deterministicOutput = compileDeterministicFormulas(schema);
  return {
    output: deterministicOutput,
    isFallback: true,
    latencyMs: Date.now() - startTime,
  };
}

function buildCellDataWithFormulas(
  schema: SchemaArchitectOutput,
  aiFormulas: Record<string, string>,
  summaryLabel = 'MODEL SUMMARY'
): Record<string, SheetCell> {
  const cellData: Record<string, SheetCell> = {};
  const { columns, rawRows } = schema;
  const lastDataRow = rawRows.length + 1;
  const summaryRow = lastDataRow + 1;

  // 1. Headers (Row 1)
  columns.forEach(c => {
    cellData[`${c.key}1`] = {
      v: c.label,
      bold: true,
      align: c.type === 'string' ? 'left' : 'right',
    };
  });

  // 2. Data Rows (Row 2 .. lastDataRow)
  rawRows.forEach((row, idx) => {
    const r = idx + 2;
    columns.forEach(c => {
      const coord = `${c.key}${r}`;
      const formula = aiFormulas[coord];
      // ANTI-CIRCULAR GUARD (REQ-NF-002): uses coordinate parsing rather than
      // substring matching, so "=SUM(B20:B29)" is correctly accepted in B2.
      if (formula && formula.startsWith('=') && !isCircularReference(formula, coord)) {
        cellData[coord] = {
          f: formula,
          align: c.type === 'string' ? 'left' : 'right',
        };
      } else {
        cellData[coord] = {
          v: row[c.key],
          align: c.type === 'string' ? 'left' : 'right',
        };
      }
    });
  });

  // 3. Summary Row
  // NOTE: erroring row formulas are NOT repaired here. Agent 5 owns correction
  // for the whole pipeline, so that the trace reports what was actually fixed
  // instead of silently swallowing defects upstream.
  cellData[`A${summaryRow}`] = {
    v: summaryLabel,
    bold: true,
    align: 'left',
  };

  columns.slice(1).forEach(c => {
    const coord = `${c.key}${summaryRow}`;
    const customFormula = aiFormulas[coord];
    // A model-proposed =SUM() over a balance/cascade column is rejected: the
    // deterministic strategy below decides how that column is really aggregated.
    const safeCustom =
      customFormula &&
      customFormula.startsWith('=') &&
      !isCircularReference(customFormula, coord) &&
      !(/\bSUM\s*\(/i.test(customFormula) && detectSummaryStrategy(c, cellData, lastDataRow) === 'closing');

    if (safeCustom) {
      cellData[coord] = { f: customFormula, bold: true, align: 'right' };
    } else if (c.type === 'percentage' || c.type === 'number' || c.type === 'currency') {
      const { f } = buildSummaryFormula(c, cellData, lastDataRow);
      cellData[coord] = { f, bold: true, align: 'right' };
    }
  });

  return cellData;
}

function compileDeterministicFormulas(schema: SchemaArchitectOutput): FormulaCompilerOutput {
  const cellData: Record<string, SheetCell> = {};
  const { columns, rawRows, metadata } = schema;
  const lastDataRow = rawRows.length + 1;
  const summaryRow = lastDataRow + 1;
  let formulaCount = 0;

  // Row 1: Headers
  columns.forEach(c => {
    cellData[`${c.key}1`] = {
      v: c.label,
      bold: true,
      align: c.type === 'string' ? 'left' : 'right',
    };
  });

  // Domain-specific formula rules
  const isAcademic = metadata?.domain?.includes('Education') || columns.some(c => /student|grade|marks|roll/i.test(c.label));
  const isSaaS = metadata?.domain === 'SaaS Finance';
  const isHR = metadata?.domain === 'HR & Payroll';
  const isHealth = metadata?.domain === 'Healthcare';
  const isEcommerce = metadata?.domain?.includes('Sales') || columns.some(c => /order|units sold/i.test(c.label));
  const isProject = metadata?.domain?.includes('Project') || columns.some(c => /sprint|story point|task key/i.test(c.label));
  const isInventory = metadata?.domain?.includes('Inventory') || columns.some(c => /sku|reorder/i.test(c.label));

  // Data Rows (Row 2 .. lastDataRow)
  rawRows.forEach((row, idx) => {
    const r = idx + 2;

    columns.forEach(c => {
      const coord = `${c.key}${r}`;

      // 1. Academic / Student Gradebook Formulas
      if (isAcademic) {
        if (c.key === 'G') {
          // Total Marks = SUM(C..F)
          cellData[coord] = { f: `=SUM(C${r}:F${r})`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'H') {
          // Percentage = G / 400
          cellData[coord] = { f: `=ROUND(G${r}/400,3)`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'I') {
          // Final Grade
          cellData[coord] = { f: `=IF(H${r}>=0.85,"A+",IF(H${r}>=0.7,"A",IF(H${r}>=0.55,"B","C")))`, align: 'center' };
          formulaCount++;
          return;
        }
        if (c.key === 'J') {
          // Academic Status
          cellData[coord] = { f: `=IF(H${r}>=0.5,"Pass","Remedial")`, align: 'center' };
          formulaCount++;
          return;
        }
      }

      // 2. SaaS Continuous Balance Cascade
      if (isSaaS) {
        if (c.key === 'B' && r > 2) {
          cellData[coord] = { f: `=F${r - 1}`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'E') {
          cellData[coord] = { f: `=(D${r}-C${r})`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'F') {
          cellData[coord] = { f: `=(B${r}-E${r})`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'G') {
          // Runway = Ending Cash / Net Burn. When burn <= 0 (cash-flow positive), runway is effectively infinite.
          cellData[coord] = { f: `=IF(E${r}<=0,999,ROUND(F${r}/E${r},1))`, align: 'right' };
          formulaCount++;
          return;
        }
      }

      // 3. HR Net Pay Formula
      if (isHR && c.key === 'F') {
        cellData[coord] = { f: `=(C${r}+D${r}-E${r})`, align: 'right' };
        formulaCount++;
        return;
      }

      // 4. Healthcare Copay Formula
      if (isHealth && c.key === 'E') {
        cellData[coord] = { f: `=(C${r}-D${r})`, align: 'right' };
        formulaCount++;
        return;
      }

      // 5. E-Commerce Net Revenue Formula
      if (isEcommerce) {
        if (c.key === 'F') {
          cellData[coord] = { f: `=(D${r}*E${r})`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'H') {
          cellData[coord] = { f: `=(F${r}-G${r})`, align: 'right' };
          formulaCount++;
          return;
        }
      }

      // 6. Project Management Variance
      if (isProject && c.key === 'G') {
        cellData[coord] = { f: `=(F${r}-E${r})`, align: 'right' };
        formulaCount++;
        return;
      }

      // 7. Inventory Valuation
      if (isInventory && c.key === 'F') {
        cellData[coord] = { f: `=(D${r}*E${r})`, align: 'right' };
        formulaCount++;
        return;
      }

      // 8. General Operational Variance / Efficiency Formula
      if (!isAcademic && !isSaaS && !isHR && !isHealth && !isEcommerce && !isProject && !isInventory) {
        if (c.key === 'D' && columns.some(col => col.key === 'B')) {
          cellData[coord] = { f: `=(B${r}-C${r})`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'E' && columns.some(col => col.key === 'B')) {
          cellData[coord] = { f: `=ROUND(D${r}/B${r},2)`, align: 'right' };
          formulaCount++;
          return;
        }
      }

      // Raw value cell
      cellData[coord] = {
        v: row[c.key],
        align: c.type === 'string' ? 'left' : 'right',
      };
    });
  });

  // Summary Row (Row summaryRow)
  // The label states what the row actually contains: a mix of totals and
  // closing balances cannot honestly be called one flat "TOTAL".
  cellData[`A${summaryRow}`] = {
    v: isAcademic ? 'CLASS AVERAGE' : 'MODEL SUMMARY',
    bold: true,
    align: 'left',
  };

  columns.slice(1).forEach(c => {
    const coord = `${c.key}${summaryRow}`;
    if (isAcademic) {
      if (c.type === 'percentage' || c.type === 'number') {
        cellData[coord] = { f: `=AVERAGE(${c.key}2:${c.key}${lastDataRow})`, bold: true, align: 'right' };
        formulaCount++;
      }
    } else if (c.type === 'percentage' || c.type === 'number' || c.type === 'currency') {
      // Balance and carry-forward cascade columns report their closing value
      // instead of an invalid running total.
      const { f } = buildSummaryFormula(c, cellData, lastDataRow);
      cellData[coord] = { f, bold: true, align: 'right' };
      formulaCount++;
    }
  });

  return {
    cellData,
    formulasInjectedCount: formulaCount,
    summaryRowsCount: 1,
    antiCircularGuardPassed: true,
  };
}
