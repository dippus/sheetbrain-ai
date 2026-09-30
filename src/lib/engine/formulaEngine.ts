import { SheetCell } from '@/types/sheet';
import { HyperFormula, DetailedCellError } from 'hyperformula';

/**
 * Extracts coordinate column and row, e.g. "B12" -> { col: "B", row: 12 }
 */
export function parseCoord(coord: string): { col: string; row: number } | null {
  const match = coord.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return { col: match[1], row: parseInt(match[2], 10) };
}

/**
 * Converts column letter to 0-based index: "A" -> 0, "B" -> 1
 */
export function colToIndex(col: string): number {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Converts 0-based index to column letter: 0 -> "A", 1 -> "B"
 */
export function indexToCol(idx: number): string {
  let col = '';
  let temp = idx + 1;
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    temp = Math.floor((temp - 1) / 26);
  }
  return col;
}

/**
 * Cleans string representation of cell values into numbers if applicable (e.g. "$12,000" -> 12000)
 * and strips dangerous formula injection prefixes from raw text inputs.
 */
function sanitizeCellValue(v: unknown): string | number | boolean {
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    let trimmed = v.trim();

    // Security: Formula Injection Prevention (strip dangerous OS command prefixes on raw text inputs)
    if (/^[=@+-]\s*(cmd|powershell|certutil|bash|sh|curl|wget|calc|mshta|rundll32|wscript|cscript)/i.test(trimmed)) {
      trimmed = trimmed.replace(/^[=@+-]\s*/, '');
    }

    // Currency or clean formatted number e.g. "$12,000", "-$5,000", "1,234.50"
    if (/^\$?\s*-?[\d,]+(\.\d+)?$/.test(trimmed)) {
      const cleaned = trimmed.replace(/^\$|\s/g, '').replace(/,/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(cleaned)) {
        return num;
      }
    }
    return trimmed;
  }
  return '';
}

/**
 * Evaluates a single formula expression against current cell grid using HyperFormula.
 * Supports standard Excel formulas: IF, VLOOKUP, SUM, AVERAGE, MAX, MIN, COUNT, ROUND, and mathematical expressions.
 */
export function evaluateFormula(formula: string, cells: Record<string, SheetCell>, currentCellCoord: string): number | string {
  if (!formula.startsWith('=')) return formula;
  const rawExpr = formula.trim();

  // Guard against direct self-reference
  if (rawExpr.toUpperCase().includes(currentCellCoord.toUpperCase())) {
    return '#REF!';
  }

  const coords = Object.keys(cells);
  let maxRow = 0;
  let maxCol = 0;

  const targetParsed = parseCoord(currentCellCoord);
  if (targetParsed) {
    maxCol = colToIndex(targetParsed.col);
    maxRow = targetParsed.row - 1;
  }

  for (const coord of coords) {
    const p = parseCoord(coord);
    if (!p) continue;
    const c = colToIndex(p.col);
    const r = p.row - 1;
    if (c > maxCol) maxCol = c;
    if (r > maxRow) maxRow = r;
  }

  const grid: (string | number | boolean)[][] = Array.from(
    { length: maxRow + 1 },
    () => Array(maxCol + 1).fill('')
  );

  for (const [coord, cell] of Object.entries(cells)) {
    if (coord.toUpperCase() === currentCellCoord.toUpperCase()) continue;
    const p = parseCoord(coord);
    if (!p) continue;
    const c = colToIndex(p.col);
    const r = p.row - 1;
    if (cell.f && typeof cell.f === 'string' && cell.f.startsWith('=')) {
      grid[r][c] = cell.f;
    } else {
      grid[r][c] = sanitizeCellValue(cell.v);
    }
  }

  if (targetParsed) {
    grid[targetParsed.row - 1][colToIndex(targetParsed.col)] = rawExpr;
  }

  try {
    const hf = HyperFormula.buildFromSheets({ Sheet1: grid }, { licenseKey: 'gpl-v3' });
    const sheetId = hf.getSheetId('Sheet1');
    if (sheetId === undefined) return '#VALUE!';

    const colIdx = targetParsed ? colToIndex(targetParsed.col) : 0;
    const rowIdx = targetParsed ? targetParsed.row - 1 : 0;
    const val = hf.getCellValue({ col: colIdx, row: rowIdx, sheet: sheetId });

    if (val instanceof DetailedCellError || (val && typeof val === 'object' && 'value' in val)) {
      return (val as { value: string }).value || '#VALUE!';
    }
    if (typeof val === 'number') {
      return Number.isInteger(val) ? val : Math.round(val * 100) / 100;
    }
    return (val as string | number) ?? '';
  } catch {
    return '#VALUE!';
  }
}

/**
 * Recomputes all formula cells in the workbook deterministically using HyperFormula DAG engine.
 * Full topological dependency sorting resolves multi-level formula chains, IF logic, and range aggregations.
 */
export function recalculateWorkbook(cells: Record<string, SheetCell>): Record<string, SheetCell> {
  const coords = Object.keys(cells);
  if (coords.length === 0) return { ...cells };

  // Determine grid bounding dimensions
  let maxRow = 0;
  let maxCol = 0;
  let hasAnyFormula = false;

  for (const coord of coords) {
    const p = parseCoord(coord);
    if (!p) continue;
    const colIdx = colToIndex(p.col);
    const rowIdx = p.row - 1;
    if (colIdx > maxCol) maxCol = colIdx;
    if (rowIdx > maxRow) maxRow = rowIdx;

    const cell = cells[coord];
    if (cell?.f && typeof cell.f === 'string' && cell.f.startsWith('=')) {
      hasAnyFormula = true;
    }
  }

  // If no formulas exist, return cells directly
  if (!hasAnyFormula) {
    return { ...cells };
  }

  // Build 2D matrix representing worksheet
  const grid: (string | number | boolean)[][] = Array.from(
    { length: maxRow + 1 },
    () => Array(maxCol + 1).fill('')
  );

  for (const [coord, cell] of Object.entries(cells)) {
    const p = parseCoord(coord);
    if (!p) continue;
    const colIdx = colToIndex(p.col);
    const rowIdx = p.row - 1;

    if (cell.f && typeof cell.f === 'string' && cell.f.startsWith('=')) {
      grid[rowIdx][colIdx] = cell.f;
    } else {
      grid[rowIdx][colIdx] = sanitizeCellValue(cell.v);
    }
  }

  try {
    const hf = HyperFormula.buildFromSheets(
      { Sheet1: grid },
      { licenseKey: 'gpl-v3' }
    );
    const sheetId = hf.getSheetId('Sheet1');
    if (sheetId === undefined) return { ...cells };

    const updated = { ...cells };

    for (const [coord, cell] of Object.entries(cells)) {
      if (cell.f && typeof cell.f === 'string' && cell.f.startsWith('=')) {
        const p = parseCoord(coord);
        if (!p) continue;
        const colIdx = colToIndex(p.col);
        const rowIdx = p.row - 1;

        const rawVal = hf.getCellValue({ col: colIdx, row: rowIdx, sheet: sheetId });
        let computed: string | number | boolean = '';

        if (rawVal instanceof DetailedCellError || (rawVal && typeof rawVal === 'object' && 'value' in rawVal)) {
          computed = (rawVal as { value: string }).value || '#VALUE!';
        } else if (typeof rawVal === 'number' && !isNaN(rawVal) && isFinite(rawVal)) {
          computed = Number.isInteger(rawVal) ? rawVal : Math.round(rawVal * 100) / 100;
        } else if (typeof rawVal === 'boolean' || typeof rawVal === 'string') {
          computed = rawVal;
        }

        let type: 's' | 'n' | 'b' = 's';
        if (typeof computed === 'number') type = 'n';
        else if (typeof computed === 'boolean') type = 'b';

        updated[coord] = {
          ...cell,
          v: computed,
          t: type,
        };
      }
    }

    return updated;
  } catch (err) {
    console.error('[formulaEngine] HyperFormula evaluation error:', err);
    return { ...cells };
  }
}

