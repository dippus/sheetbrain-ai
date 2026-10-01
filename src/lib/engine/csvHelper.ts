import { SheetColumn, SheetCell, SheetData, ChartConfig, WorkbookModel, CellFormatType } from '@/types/sheet';

// Helper to convert index (0, 1, 2...) to column letter ('A', 'B'...'Z', 'AA'...)
export function indexToColLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// RFC 4180 Compliant High-Performance CSV Streaming Parser
export function parseCSVLines(csvText: string): string[][] {
  const rows: string[][] = [];
  if (!csvText || !csvText.trim()) return rows;

  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  const len = csvText.length;

  for (let i = 0; i < len; i++) {
    const char = csvText[i];

    if (char === '"') {
      if (inQuotes && i + 1 < len && csvText[i + 1] === '"') {
        // Escaped quote: "" -> "
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && i + 1 < len && csvText[i + 1] === '\n') {
        i++; // skip \n in CRLF
      }
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  // Push final cell and row
  currentRow.push(currentCell.trim());
  if (currentRow.some(c => c.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

const PALETTE = ['#2563eb', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export function parseCSVToWorkbook(fileName: string, csvText: string): WorkbookModel {
  const rawRows = parseCSVLines(csvText);
  if (rawRows.length === 0) {
    throw new Error('CSV file is empty');
  }

  const rawHeader = rawRows[0];
  const dataRows = rawRows.slice(1);

  // Safe iterative calculation to prevent RangeError: Maximum call stack size exceeded on large datasets (>50k rows)
  let colCount = 1;
  for (let i = 0; i < rawRows.length; i++) {
    if (rawRows[i].length > colCount) {
      colCount = rawRows[i].length;
    }
  }
  const rowCount = Math.max(rawRows.length, 6);

  const columns: SheetColumn[] = [];
  const cellData: Record<string, SheetCell> = {};

  // Infer Column types from data rows
  for (let c = 0; c < colCount; c++) {
    const colKey = indexToColLetter(c);
    const headerLabel = (rawHeader[c] || `Column ${colKey}`).replace(/^["']|["']$/g, '');

    // Sample first few data rows to infer format
    let isCurrency = false;
    let isPercentage = false;
    let isNumeric = false;
    let sampleCount = 0;

    for (const r of dataRows.slice(0, 5)) {
      const rawVal = r[c]?.trim();
      if (!rawVal) continue;
      sampleCount++;
      if (rawVal.startsWith('$')) isCurrency = true;
      if (rawVal.endsWith('%')) isPercentage = true;
      const cleanNum = rawVal.replace(/[$,]/g, '').replace(/%$/, '');
      if (!isNaN(Number(cleanNum))) isNumeric = true;
    }

    let type: CellFormatType = 'string';
    if (isCurrency) type = 'currency';
    else if (isPercentage) type = 'percentage';
    else if (isNumeric && sampleCount > 0) type = 'number';

    // Calculate column width dynamically from header and data sample
    let maxLen = headerLabel.length;
    for (const r of dataRows.slice(0, 25)) {
      const cellText = String(r[c] || '');
      if (cellText.length > maxLen) maxLen = cellText.length;
    }
    const computedWidth = Math.max(130, Math.min(360, maxLen * 9 + 24));

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

  // Populate Data Cells
  dataRows.forEach((row, rIdx) => {
    const rowNum = rIdx + 2;
    for (let c = 0; c < colCount; c++) {
      const colKey = indexToColLetter(c);
      const coord = `${colKey}${rowNum}`;
      const raw = row[c] !== undefined ? row[c].trim().replace(/^["']|["']$/g, '') : '';
      const colType = columns[c]?.type;

      if (!raw) continue;

      if (raw.startsWith('=')) {
        cellData[coord] = { f: raw.toUpperCase() };
      } else if (colType === 'currency') {
        const clean = Number(raw.replace(/[$,]/g, ''));
        cellData[coord] = { v: isNaN(clean) ? raw : clean };
      } else if (colType === 'percentage') {
        const clean = Number(raw.replace(/%/g, ''));
        cellData[coord] = { v: isNaN(clean) ? raw : clean > 1 ? clean / 100 : clean };
      } else if (colType === 'number') {
        // Keep strings with leading zeroes (e.g. '0123' or '0054') as strings
        if (/^0\d+/.test(raw)) {
          cellData[coord] = { v: raw };
        } else {
          const clean = Number(raw.replace(/,/g, ''));
          cellData[coord] = { v: isNaN(clean) ? raw : clean };
        }
      } else {
        cellData[coord] = { v: raw };
      }
    }
  });

  // Automatically configure Chart
  const numericCols = columns.filter(c => c.type === 'number' || c.type === 'currency');
  const labelCol = columns.find(c => c.type === 'string') || columns[0];

  const series = numericCols.slice(0, 3).map((col, idx) => ({
    key: col.key,
    label: col.label,
    color: PALETTE[idx % PALETTE.length],
  }));

  const chartConfig: ChartConfig = {
    type: series.length > 1 ? 'bar' : 'line',
    title: `${fileName.replace(/\.[^/.]+$/, '')} Visualization`,
    xAxisKey: labelCol.key,
    series: series.length > 0 ? series : [{ key: columns[1]?.key || 'B', label: 'Value', color: '#2563eb' }],
  };

  const baseName = fileName.replace(/\.[^/.]+$/, '');
  let displayTitle = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  let sheetName = 'Sheet 1';

  if (baseName === 'blank_sheet') {
    displayTitle = 'Untitled Spreadsheet';
    sheetName = 'Sheet 1';
  } else if (baseName === 'git_commits') {
    displayTitle = 'Git Commit History';
    sheetName = 'Commits';
  } else if (baseName === 'project_dependencies') {
    displayTitle = 'Project Dependencies';
    sheetName = 'Packages';
  } else if (baseName === 'codebase_inventory') {
    displayTitle = 'Codebase File Inventory';
    sheetName = 'Files';
  } else if (baseName === 'git_file_churn') {
    displayTitle = 'Git File Churn';
    sheetName = 'Diffs';
  }

  return {
    id: `wb_${Date.now()}`,
    title: displayTitle,
    description: `Live dataset from ${fileName} with ${rawRows.length} rows and ${colCount} columns.`,
    category: 'Local Data',
    sheets: [{
      id: 'sheet_1',
      name: sheetName,
      rowCount,
      columnCount: colCount,
      columns,
      cellData,
    }],
    chartConfig,
  };
}
