import { SheetData, SheetCell, SheetColumn, CellFormatType } from '@/types/sheet';

/**
 * Deterministic edit engine for conversational spreadsheet instructions.
 *
 * Design rule (matches the rest of SheetBrain): the model PLANS, this module
 * EXECUTES. A foundation model never writes cell values directly - it returns a
 * small typed operation list, and every value is produced and validated here.
 * That is what stops a request like "add 12 monthly dates from 01-10-2005" from
 * becoming 12 hallucinated or mis-ordered date strings.
 */

export type EditOp =
  | FillSeriesOp
  | SetCellsOp
  | SetColumnValuesOp
  | SetHeaderOp
  | AddColumnOp
  | AddRowsOp
  | DeleteRowsOp;

export interface FillSeriesOp {
  op: 'fillSeries';
  column: string;
  startRow: number;
  count: number;
  series: 'date' | 'number' | 'text';
  /** ISO date (YYYY-MM-DD) or numeric start, depending on `series`. */
  start?: string | number;
  /** For dates: 'day' | 'week' | 'month' | 'quarter' | 'year'. For numbers: increment. */
  step?: string | number;
  /** Optional date format understood by the formatter. */
  format?: string;
}

export interface SetCellsOp {
  op: 'setCells';
  cells: Record<string, string | number | boolean>;
}

export interface SetColumnValuesOp {
  op: 'setColumnValues';
  column: string;
  startRow: number;
  values: Array<string | number | boolean>;
}

export interface SetHeaderOp {
  op: 'setHeader';
  column: string;
  label: string;
}

export interface AddColumnOp {
  op: 'addColumn';
  key?: string;
  label: string;
  type?: CellFormatType;
  values?: Array<string | number | boolean>;
}

export interface AddRowsOp {
  op: 'addRows';
  count: number;
}

export interface DeleteRowsOp {
  op: 'deleteRows';
  startRow: number;
  count: number;
}

export interface EditPlan {
  ops: EditOp[];
  summary: string;
}

export interface EditAppliedResult {
  sheet: SheetData;
  appliedOps: number;
  skippedOps: Array<{ op: string; reason: string }>;
  summary: string;
}

const MAX_ROWS = 5000;
const MAX_COLS = 64;

export function columnKeyToIndex(key: string): number {
  const k = key.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(k)) return -1;
  let n = 0;
  for (const ch of k) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function indexToColumnKey(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function cellRef(colKey: string, row: number): string {
  return `${colKey.toUpperCase()}${row}`;
}

function isValidColKey(key: string): boolean {
  return /^[A-Za-z]{1,2}$/.test(key.trim());
}

function inferType(value: string | number | boolean): CellFormatType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'string';
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'date';
  return 'string';
}

/**
 * A value that begins with = + - @ would be interpreted by the spreadsheet
 * engine as a formula, not as text. The planner has no operation for writing
 * formulas, so such a value is always unintended and is rejected outright
 * rather than silently executed (formula-injection defence, REQ-NF-002).
 */
function isFormulaLike(value: string | number | boolean): boolean {
  if (typeof value !== 'string') return false;
  return /^[=+\-@\t\r]/.test(value.trim());
}

function toCell(value: string | number | boolean, type?: CellFormatType): SheetCell {
  const cell: SheetCell = { v: value };
  if (typeof value === 'number') {
    cell.t = 'n';
    cell.align = 'right';
  } else if (typeof value === 'boolean') {
    cell.t = 'b';
  } else if (type === 'date' || /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
    cell.t = 'd';
  } else {
    cell.t = 's';
  }
  return cell;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Builds an exact, calendar-correct date sequence.
 *
 * Every element is computed from the START date, never from the previous element.
 * Advancing iteratively compounds the clamp ("31 Jan + 1 month" overflows into
 * March, and the next step inherits that error), which produced nonsense like
 * 03/03/2005 in the February slot. The day is also clamped to the length of the
 * target month, so a series anchored on the 31st lands on Feb 28/29.
 */
function buildDateSeries(startIso: string, count: number, step: string, format: string): string[] {
  const start = new Date(`${startIso}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return [];

  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const startDay = start.getUTCDate();

  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(startYear, startMonth, 1));

    switch (step) {
      case 'day':
        d.setUTCDate(startDay + i);
        break;
      case 'week':
        d.setUTCDate(startDay + i * 7);
        break;
      case 'quarter':
        d.setUTCMonth(startMonth + i * 3);
        d.setUTCDate(Math.min(startDay, daysInMonth(d.getUTCFullYear(), d.getUTCMonth())));
        break;
      case 'year':
        d.setUTCFullYear(startYear + i);
        d.setUTCMonth(startMonth);
        d.setUTCDate(Math.min(startDay, daysInMonth(d.getUTCFullYear(), startMonth)));
        break;
      case 'month':
      default:
        d.setUTCMonth(startMonth + i);
        d.setUTCDate(Math.min(startDay, daysInMonth(d.getUTCFullYear(), d.getUTCMonth())));
        break;
    }

    out.push(formatDate(d, format));
  }
  return out;
}

function formatDate(d: Date, format: string): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monName = MON[d.getUTCMonth()];

  switch (format) {
    case 'dd/mm/yyyy': return `${day}/${m}/${y}`;
    case 'mm/dd/yyyy': return `${m}/${day}/${y}`;
    case 'd-mmm-yyyy': return `${day}-${monName}-${y}`;
    case 'mmm yyyy': return `${monName} ${y}`;
    case 'yyyy-mm-dd': return `${y}-${m}-${day}`;
    case 'dd-mmm-yy': return `${day}-${monName}-${String(y).slice(2)}`;
    case 'dd/mm/yy': return `${day}/${m}/${String(y).slice(2)}`;
    default: return `${day}/${m}/${y}`;
  }
}

function toIso(value: string | number | undefined): string | null {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value).trim();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd-mm-yyyy / dd/mm/yyyy / dd.mm.yyyy
  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // yyyy-mm-dd already handled; try Date parse for things like "1 Oct 2005"
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
  }
  return null;
}

function clampRow(row: number): number {
  if (!Number.isFinite(row)) return 2;
  return Math.min(MAX_ROWS, Math.max(2, Math.floor(row)));
}

function maxDataRow(sheet: SheetData): number {
  let max = 1;
  for (const ref of Object.keys(sheet.cellData)) {
    const m = ref.match(/^[A-Za-z]+(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

function ensureColumn(sheet: SheetData, key: string, label?: string, type?: CellFormatType): SheetColumn {
  const k = key.toUpperCase();
  let col = sheet.columns.find(c => c.key.toUpperCase() === k);
  if (!col) {
    col = { key: k, label: label || k, type: type || 'string', width: 140 };
    sheet.columns.push(col);
    sheet.columns.sort((a, b) => columnKeyToIndex(a.key) - columnKeyToIndex(b.key));
  } else if (label) {
    col.label = label;
  }
  return col;
}

/**
 * Applies a validated plan to a copy of the sheet.
 * Never throws: a bad operation is recorded in `skippedOps` and the rest still
 * apply, so one bad instruction cannot wipe a user's work.
 */
export function applyEditPlan(sheet: SheetData, plan: EditPlan): EditAppliedResult {
  const next: SheetData = {
    ...sheet,
    columns: sheet.columns.map(c => ({ ...c })),
    cellData: { ...sheet.cellData },
  };

  const skippedOps: Array<{ op: string; reason: string }> = [];
  let applied = 0;

  for (const rawOp of plan.ops) {
    try {
      switch (rawOp.op) {
        case 'fillSeries': {
          const col = rawOp.column?.toUpperCase();
          if (!col || !isValidColKey(col)) throw new Error(`invalid column "${rawOp.column}"`);
          const count = Math.min(MAX_ROWS, Math.max(1, Math.floor(rawOp.count || 0)));
          if (count === 0) throw new Error('count must be at least 1');
          const startRow = clampRow(rawOp.startRow);

          let values: Array<string | number>;
          if (rawOp.series === 'date') {
            const iso = toIso(rawOp.start);
            if (!iso) throw new Error(`could not read start date "${rawOp.start}"`);
            values = buildDateSeries(iso, count, String(rawOp.step || 'month').toLowerCase(), rawOp.format || 'dd/mm/yyyy');
            if (values.length === 0) throw new Error('date series produced no values');
          } else if (rawOp.series === 'number') {
            const begin = Number(rawOp.start ?? 1);
            const inc = Number(rawOp.step ?? 1);
            if (!Number.isFinite(begin)) throw new Error('numeric start is not a number');
            values = Array.from({ length: count }, (_, i) => begin + i * (Number.isFinite(inc) ? inc : 1));
          } else {
            throw new Error('fillSeries supports series "date" or "number"');
          }

          const colMeta = ensureColumn(next, col);
          values.forEach((v, i) => {
            next.cellData[cellRef(col, startRow + i)] = toCell(v, rawOp.series === 'date' ? 'date' : 'number');
          });
          if (rawOp.series === 'date' && colMeta.type !== 'date') colMeta.type = 'date';
          applied++;
          break;
        }

        case 'setCells': {
          if (!rawOp.cells || typeof rawOp.cells !== 'object') throw new Error('setCells needs a cells object');
          for (const [ref, value] of Object.entries(rawOp.cells)) {
            if (isFormulaLike(value)) throw new Error(`refused formula-like value in ${ref}`);
          }
          let wrote = 0;
          for (const [ref, value] of Object.entries(rawOp.cells)) {
            const m = ref.trim().toUpperCase().match(/^([A-Z]{1,2})(\d+)$/);
            if (!m) throw new Error(`invalid cell reference "${ref}"`);
            const col = m[1];
            const row = Number(m[2]);
            if (row < 1 || row > MAX_ROWS) throw new Error(`row ${row} out of range`);
            const type = row === 1 ? 'string' : inferType(value);
            ensureColumn(next, col, undefined, type);
            next.cellData[cellRef(col, row)] = toCell(value, type);
            wrote++;
          }
          if (wrote === 0) throw new Error('no valid cells');
          applied++;
          break;
        }

        case 'setColumnValues': {
          const col = rawOp.column?.toUpperCase();
          if (!col || !isValidColKey(col)) throw new Error(`invalid column "${rawOp.column}"`);
          if (!Array.isArray(rawOp.values) || rawOp.values.length === 0) throw new Error('values must be a non-empty array');
          if (rawOp.values.some(isFormulaLike)) throw new Error('refused formula-like value in column data');
          const startRow = clampRow(rawOp.startRow);
          const colMeta = ensureColumn(next, col);
          rawOp.values.forEach((v, i) => {
            next.cellData[cellRef(col, startRow + i)] = toCell(v, inferType(v));
          });
          if (rawOp.values.every(v => typeof v === 'number') && colMeta.type === 'string') colMeta.type = 'number';
          applied++;
          break;
        }

        case 'setHeader': {
          const col = rawOp.column?.toUpperCase();
          if (!col || !isValidColKey(col)) throw new Error(`invalid column "${rawOp.column}"`);
          const colMeta = ensureColumn(next, col, String(rawOp.label || col));
          next.cellData[cellRef(col, 1)] = { v: colMeta.label, t: 's', bold: true };
          applied++;
          break;
        }

        case 'addColumn': {
          const used = next.columns.map(c => c.key.toUpperCase());
          // A model-supplied key is only honoured when it is a real column key;
          // otherwise the next free column is allocated.
          const proposed = rawOp.key?.toUpperCase();
          let key = proposed && isValidColKey(proposed) && !used.includes(proposed)
            ? proposed
            : indexToColumnKey(Math.max(0, ...used.map(columnKeyToIndex)) + 1);
          while (used.includes(key)) key = indexToColumnKey(columnKeyToIndex(key) + 1);
          if (next.columns.length >= MAX_COLS) throw new Error('column limit reached');
          if (Array.isArray(rawOp.values) && rawOp.values.some(isFormulaLike)) {
            throw new Error('refused formula-like value in new column');
          }
          const colMeta = ensureColumn(next, key, rawOp.label || key, rawOp.type || 'string');
          next.cellData[cellRef(key, 1)] = { v: colMeta.label, t: 's', bold: true };
          if (Array.isArray(rawOp.values)) {
            rawOp.values.forEach((v, i) => { next.cellData[cellRef(key, i + 2)] = toCell(v, colMeta.type); });
          }
          applied++;
          break;
        }

        case 'addRows': {
          const count = Math.min(1000, Math.max(1, Math.floor(rawOp.count || 0)));
          if (maxDataRow(next) + count > MAX_ROWS) throw new Error('row limit reached');
          next.rowCount = Math.max(next.rowCount, maxDataRow(next) + count);
          applied++;
          break;
        }

        case 'deleteRows': {
          const startRow = clampRow(rawOp.startRow);
          const count = Math.min(MAX_ROWS, Math.max(1, Math.floor(rawOp.count || 0)));
          const last = startRow + count - 1;

          // A single natural-language instruction must not be able to erase the
          // sheet. Refuse anything that would remove most of the populated body.
          const populated = Object.keys(next.cellData).filter(ref => {
            const m = ref.match(/^[A-Za-z]+(\d+)$/);
            return m && Number(m[1]) > 1;
          }).length;
          const dataRows = maxDataRow(next) - 1;
          if (dataRows > 0 && count >= dataRows) {
            throw new Error(`refusing to delete all ${count} data rows in one instruction; delete a smaller range`);
          }
          if (populated === 0) throw new Error('sheet has no data rows to delete');

          if (last > maxDataRow(next)) throw new Error('row range is outside the sheet');
          for (const ref of Object.keys(next.cellData)) {
            const m = ref.match(/^([A-Za-z]+)(\d+)$/);
            if (!m) continue;
            const row = Number(m[2]);
            if (row >= startRow && row <= last) {
              delete next.cellData[ref];
            } else if (row > last) {
              // Shift the tail up so there is no gap left behind.
              const moved = cellRef(m[1], row - count);
              next.cellData[moved] = next.cellData[ref];
              delete next.cellData[ref];
            }
          }
          next.rowCount = Math.max(2, maxDataRow(next));
          applied++;
          break;
        }

        default:
          throw new Error(`unsupported operation "${(rawOp as { op: string }).op}"`);
      }
    } catch (err) {
      skippedOps.push({
        op: (rawOp as { op: string }).op,
        reason: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  // Re-derive geometry so the grid and the auditor agree with the cells.
  const lastRow = maxDataRow(next);
  const lastColIndex = next.columns.reduce((acc, c) => Math.max(acc, columnKeyToIndex(c.key)), 0);
  next.rowCount = Math.max(next.rowCount, lastRow);
  next.columnCount = Math.max(next.columnCount, next.columns.length, lastColIndex + 1);

  if (next.columns.length === 0) throw new Error('edit removed every column');

  return {
    sheet: next,
    appliedOps: applied,
    skippedOps,
    summary: plan.summary,
  };
}

/**
 * Extracts the final labelled data rows, ignoring header and any TOTAL row.
 * The Bedrock planner uses this so it can reason about real values.
 */
export function extractPreviewRows(sheet: SheetData, maxRows = 12): Array<Record<string, string | number>> {
  const last = maxDataRow(sheet);
  const rows: Array<Record<string, string | number>> = [];
  for (let r = 2; r <= Math.min(last, maxRows + 1); r++) {
    const a = sheet.cellData[cellRef(sheet.columns[0]?.key || 'A', r)]?.v;
    if (typeof a === 'string' && /total|summary|subtotal/i.test(a)) break;
    const row: Record<string, string | number> = {};
    let has = false;
    for (const col of sheet.columns) {
      const v = sheet.cellData[cellRef(col.key, r)]?.v;
      if (v !== undefined && v !== '') { row[col.key] = v as string | number; has = true; }
    }
    if (has) rows.push(row);
  }
  return rows;
}
