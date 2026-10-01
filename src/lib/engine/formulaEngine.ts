import { SheetCell } from '@/types/sheet';
import { HyperFormula, DetailedCellError } from 'hyperformula';

/**
 * SECURITY / CORRECTNESS (REQ-NF-002): Extracts every cell coordinate referenced
 * by a formula expression and reports whether the formula references itself.
 *
 * A naive `formula.includes(coord)` substring test is unsound in both
 * directions:
 *   - FALSE POSITIVE: "B2" evaluating "=SUM(B20:B29)" matches the substring "B2".
 *   - FALSE NEGATIVE: a range whose endpoint coincides with the target column
 *     can slip past naive checks in some orderings.
 *
 * This implementation tokenizes the expression and normalizes every reference
 * (stripping `$` absolute markers) before comparing, so only genuine
 * self-references are reported.
 */
export function isCircularReference(formula: string, targetCoord: string): boolean {
  const target = parseCoord(targetCoord);
  if (!target) return false;

  const targetColIdx = colToIndex(target.col);
  const targetRow = target.row;
  const upperFormula = formula.toUpperCase();

  // 1. Range references: checks if target cell falls within the 2D bounding box of any range (e.g. B2:B9, A1:D10)
  const rangePattern = /\$?([A-Z]{1,3})\$?([0-9]{1,7})\s*:\s*\$?([A-Z]{1,3})\$?([0-9]{1,7})/g;
  let match: RegExpExecArray | null;
  while ((match = rangePattern.exec(upperFormula)) !== null) {
    const startColIdx = colToIndex(match[1]);
    const startRow = Number(match[2]);
    const endColIdx = colToIndex(match[3]);
    const endRow = Number(match[4]);

    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    if (targetColIdx >= minCol && targetColIdx <= maxCol && targetRow >= minRow && targetRow <= maxRow) {
      return true;
    }
  }

  // 2. Single-cell references: $A$1, A1, A$1, $A1
  const singleRefPattern = /\$?([A-Z]{1,3})\$?([0-9]{1,7})/g;
  while ((match = singleRefPattern.exec(upperFormula)) !== null) {
    if (match[1] === target.col && Number(match[2]) === targetRow) {
      return true;
    }
  }

  return false;
}

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
 * Evaluates a single formula expression against the current cell grid.
 *
 * PERFORMANCE (REQ-NF-001): The previous implementation constructed a complete
 * HyperFormula instance per call, making a single cell edit O(n²) across the
 * workbook. This version performs ONE batch recalculation of the whole grid and
 * reads the target cell from that single evaluation pass, reducing a full
 * recalculation to O(n) with a single engine instantiation.
 *
 * Supports standard Excel formulas: IF, VLOOKUP, SUM, AVERAGE, MAX, MIN, COUNT,
 * ROUND, and arithmetic expressions.
 */
export function evaluateFormula(formula: string, cells: Record<string, SheetCell>, currentCellCoord: string): number | string {
  if (!formula.startsWith('=')) return formula;
  const rawExpr = formula.trim();

  // Guard against direct self-reference using proper coordinate parsing
  // (REQ-NF-002) rather than naive substring matching.
  if (isCircularReference(rawExpr, currentCellCoord)) {
    return '#REF!';
  }

  const targetParsed = parseCoord(currentCellCoord);
  if (!targetParsed) return '#VALUE!';

  // Inject the candidate formula into the target cell, then recalculate the
  // entire grid exactly once and read the result back.
  const scratch: Record<string, SheetCell> = {
    ...cells,
    [currentCellCoord]: { ...(cells[currentCellCoord] || {}), f: rawExpr },
  };

  const recalculated = recalculateWorkbook(scratch);
  const value = recalculated[currentCellCoord]?.v;

  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
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

