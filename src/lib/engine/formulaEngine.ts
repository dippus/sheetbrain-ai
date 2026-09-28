import { SheetCell } from '@/types/sheet';

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
  let col = "";
  let temp = idx + 1;
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    temp = Math.floor((temp - 1) / 26);
  }
  return col;
}

/**
 * Evaluates a single formula expression against current cell grid.
 * Supports: =SUM(C2:C9), =AVERAGE(C2:C9), =MAX(C2:C9), =MIN(C2:C9), and basic arithmetic =(B5-B4)/B4, =B2*0.2
 */
export function evaluateFormula(formula: string, cells: Record<string, SheetCell>, currentCellCoord: string): number | string {
  if (!formula.startsWith('=')) return formula;
  const rawExpr = formula.substring(1).trim().toUpperCase();

  // Guard against self-reference
  if (rawExpr.includes(currentCellCoord.toUpperCase())) {
    return '#REF!';
  }

  // 1. Range functions: =SUM(B2:B9), =AVERAGE(B2:B9), =MAX(B2:B9), =MIN(B2:B9)
  const rangeMatch = rawExpr.match(/^(SUM|AVERAGE|MAX|MIN|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
  if (rangeMatch) {
    const fn = rangeMatch[1];
    const startCoord = parseCoord(rangeMatch[2]);
    const endCoord = parseCoord(rangeMatch[3]);

    if (!startCoord || !endCoord) return '#VALUE!';

    const values: number[] = [];
    const startColIdx = colToIndex(startCoord.col);
    const endColIdx = colToIndex(endCoord.col);
    const minRow = Math.min(startCoord.row, endCoord.row);
    const maxRow = Math.max(startCoord.row, endCoord.row);

    for (let c = Math.min(startColIdx, endColIdx); c <= Math.max(startColIdx, endColIdx); c++) {
      const colLetter = indexToCol(c);
      for (let r = minRow; r <= maxRow; r++) {
        const cKey = `${colLetter}${r}`;
        const cell = cells[cKey];
        if (cell && cell.v !== undefined && cell.v !== '') {
          const num = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) values.push(num);
        }
      }
    }

    if (fn === 'SUM') return values.reduce((a, b) => a + b, 0);
    if (fn === 'AVERAGE') return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    if (fn === 'MAX') return values.length ? Math.max(...values) : 0;
    if (fn === 'MIN') return values.length ? Math.min(...values) : 0;
    if (fn === 'COUNT') return values.length;
  }

  // 2. Arithmetic expressions: =B5-C5, =B2*0.2, =(B5-B4)/B4
  try {
    let replacedExpr = rawExpr;
    // Replace all cell references (e.g. B2, C10) with their current numeric values
    replacedExpr = replacedExpr.replace(/([A-Z]+\d+)/g, (match) => {
      const cell = cells[match];
      if (!cell || cell.v === undefined || cell.v === '') return '0';
      const num = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v).replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? '0' : String(num);
    });

    // Clean expression to prevent arbitrary code execution
    if (/^[0-9+\-*/().\s]+$/.test(replacedExpr)) {
      // Divide by zero check
      if (/\/\s*0(?!\.)/.test(replacedExpr)) {
        return '#DIV/0!';
      }
      // Safe mathematical evaluation
      const result = Function('"use strict"; return (' + replacedExpr + ')')();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.round(result * 100) / 100;
      }
    }
  } catch (err) {
    return '#VALUE!';
  }

  return '#VALUE!';
}

/**
 * Recomputes all formula cells in the workbook deterministically.
 */
export function recalculateWorkbook(cells: Record<string, SheetCell>): Record<string, SheetCell> {
  const updated = { ...cells };
  
  // Two passes to ensure simple 1-level dependent formulas resolve
  for (let pass = 0; pass < 2; pass++) {
    Object.keys(updated).forEach(coord => {
      const cell = updated[coord];
      if (cell.f && cell.f.startsWith('=')) {
        const computed = evaluateFormula(cell.f, updated, coord);
        updated[coord] = {
          ...cell,
          v: computed,
          t: typeof computed === 'number' ? 'n' : 's',
        };
      }
    });
  }

  return updated;
}
