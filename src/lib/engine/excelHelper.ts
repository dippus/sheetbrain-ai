import * as XLSX from 'xlsx';
import { SheetColumn, SheetCell, SheetData, ChartConfig, WorkbookModel, CellFormatType } from '@/types/sheet';
import { indexToColLetter } from './csvHelper';

const PALETTE = ['#2563eb', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

/**
 * Parses an Excel (.xlsx / .xls) binary ArrayBuffer into SheetBrain's WorkbookModel.
 * Preserves multi-sheet structure, native cell formulas, numbers, and dates.
 */
export function parseXLSXToWorkbook(fileName: string, data: ArrayBuffer | Uint8Array | Buffer): WorkbookModel {
  const isBuffer = typeof Buffer !== 'undefined' && Buffer.isBuffer(data);
  const wb = XLSX.read(data, {
    type: isBuffer ? 'buffer' : 'array',
    cellFormula: true,
    cellDates: true,
  });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('Excel workbook contains no sheets.');
  }

  const sheets: SheetData[] = [];
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const cleanTitle = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  wb.SheetNames.forEach((sheetName, sheetIdx) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Convert to 2D array of rows for structural analysis
    const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
    if (rawRows.length === 0) return;

    const rawHeader = rawRows[0] || [];
    const dataRows = rawRows.slice(1);
    const colCount = Math.max(...rawRows.map(r => r.length), 1);
    const rowCount = Math.max(rawRows.length, 6);

    const columns: SheetColumn[] = [];
    const cellData: Record<string, SheetCell> = {};

    // Determine Column Headers and Data Types
    for (let c = 0; c < colCount; c++) {
      const colKey = indexToColLetter(c);
      const headerLabel = String(rawHeader[c] || `Column ${colKey}`).trim();

      // Sample column cells to detect type
      let isNumeric = false;
      let isCurrency = false;
      let sampleCount = 0;
      let maxLen = headerLabel.length;

      for (const r of dataRows.slice(0, 30)) {
        const valStr = String(r[c] !== undefined ? r[c] : '').trim();
        if (!valStr) continue;
        sampleCount++;
        if (valStr.length > maxLen) maxLen = valStr.length;

        if (valStr.startsWith('$') || valStr.includes('USD') || valStr.includes('EUR') || valStr.includes('GBP')) {
          isCurrency = true;
        }
        const numClean = valStr.replace(/[$,]/g, '');
        if (!isNaN(Number(numClean)) && numClean !== '') {
          isNumeric = true;
        }
      }

      let type: CellFormatType = 'string';
      if (isCurrency || /amount|cost|price|total|fee|expense|revenue/i.test(headerLabel)) {
        type = 'currency';
      } else if (isNumeric && sampleCount > 0) {
        type = 'number';
      }

      const computedWidth = Math.max(130, Math.min(380, maxLen * 9 + 28));

      columns.push({
        key: colKey,
        label: headerLabel,
        type,
        width: computedWidth,
      });

      // Header cell
      cellData[`${colKey}1`] = {
        v: headerLabel,
        bold: true,
        align: type === 'string' ? 'left' : 'right',
      };
    }

    // Populate Cell Data including formulas from sheet object
    dataRows.forEach((row, rIdx) => {
      const rowNum = rIdx + 2;
      for (let c = 0; c < colCount; c++) {
        const colKey = indexToColLetter(c);
        const coord = `${colKey}${rowNum}`;
        const rawCell = ws[coord];
        const val = row[c];

        if (val === undefined || val === null || val === '') continue;

        if (rawCell && rawCell.f) {
          cellData[coord] = { f: `=${rawCell.f.toUpperCase()}` };
        } else {
          const colType = columns[c]?.type;
          const cleanStr = String(val).trim();

          if (colType === 'currency' || colType === 'number') {
            const num = Number(cleanStr.replace(/[$,]/g, ''));
            cellData[coord] = { v: isNaN(num) ? cleanStr : num };
          } else {
            cellData[coord] = { v: cleanStr };
          }
        }
      }
    });

    sheets.push({
      id: `sheet_${sheetIdx + 1}`,
      name: sheetName,
      rowCount,
      columnCount: colCount,
      columns,
      cellData,
    });
  });

  const activeFirstSheet = sheets[0];
  const numericCols = activeFirstSheet?.columns?.filter(c => c.type === 'number' || c.type === 'currency') || [];
  const labelCol = activeFirstSheet?.columns?.find(c => c.type === 'string') || activeFirstSheet?.columns?.[0];

  const chartSeries = numericCols.slice(0, 3).map((col, idx) => ({
    key: col.key,
    label: col.label,
    color: PALETTE[idx % PALETTE.length],
  }));

  const chartConfig: ChartConfig = {
    type: chartSeries.length > 1 ? 'bar' : 'line',
    title: `${cleanTitle} Analytics`,
    xAxisKey: labelCol?.key || 'A',
    series: chartSeries.length > 0 ? chartSeries : [{ key: 'B', label: 'Value', color: '#2563eb' }],
  };

  return {
    id: `xlsx_${Date.now()}`,
    title: cleanTitle,
    description: `Imported from ${fileName} with ${sheets.length} sheet(s) and ${activeFirstSheet?.rowCount || 0} rows.`,
    category: 'Excel Import',
    sheets,
    chartConfig,
  };
}

/**
 * Exports a SheetBrain WorkbookModel into native Microsoft Excel (.xlsx) file.
 */
export function exportWorkbookToXLSX(workbook: WorkbookModel): Blob {
  const wb = XLSX.utils.book_new();

  for (const sheet of workbook.sheets || []) {
    const wsData: any[][] = [];
    const colKeys = (sheet.columns || []).map(c => c.key);

    // Row 1: Header labels
    wsData.push((sheet.columns || []).map(c => c.label));

    // Rows 2..N: Data and formulas
    for (let r = 2; r <= sheet.rowCount; r++) {
      const rowVals: any[] = [];
      for (const k of colKeys) {
        const cell = sheet.cellData[`${k}${r}`];
        if (cell?.f) {
          // If formula exists, provide object with formula
          rowVals.push({ t: 'n', f: cell.f.replace(/^=/, '') });
        } else if (cell?.v !== undefined) {
          rowVals.push(cell.v);
        } else {
          rowVals.push('');
        }
      }
      wsData.push(rowVals);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name || 'Sheet1');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
