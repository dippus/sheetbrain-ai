export type CellFormatType = 'currency' | 'percentage' | 'number' | 'date' | 'string';

export interface SheetCell {
  v?: string | number | boolean;
  f?: string; // Formula string, e.g. "=SUM(B2:B9)"
  t?: 's' | 'n' | 'b' | 'd';
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  bg?: string;
  fontColor?: string;
  format?: string;
  isModified?: boolean;
  deltaPercent?: string;
}

export interface SheetColumn {
  key: string;       // "A", "B", "C"
  label: string;     // e.g. "Month", "MRR"
  type: CellFormatType;
  width?: number;
}

export interface SheetData {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  columns: SheetColumn[];
  cellData: Record<string, SheetCell>; // "A1", "B2", "C10"
}

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area';
  title: string;
  xAxisKey: string;
  series: ChartSeries[];
}

export interface WorkbookModel {
  id: string;
  title: string;
  description: string;
  category: string;
  sheets: SheetData[];
  chartConfig: ChartConfig;
  lastSimulatedScenario?: string;
}
