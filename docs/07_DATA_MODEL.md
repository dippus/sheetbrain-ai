# 07 — Data Model & Schema Specifications

> **Traceability**: Supports `REQ-F-001`, `REQ-F-002`, `REQ-F-007`, `REQ-F-008`.

---

## 1. SheetBrain Workbook Schema (`WorkbookJSON`)

```typescript
export interface SheetBrainWorkbook {
  id: string;
  title: string;
  category: 'finance' | 'marketing' | 'operations' | 'general';
  createdAt: string;
  sheets: SheetBrainWorksheet[];
  chartConfig?: SheetBrainChartConfig;
}

export interface SheetBrainWorksheet {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  columns: SheetBrainColumnDef[];
  cellData: Record<string, SheetBrainCell>; // key: "A1", "B2", "C10"
}

export interface SheetBrainColumnDef {
  key: string;       // e.g. "A", "B", "C"
  label: string;     // Header text, e.g. "Month", "Revenue"
  type: 'string' | 'currency' | 'percentage' | 'number' | 'date';
  width?: number;
}

export interface SheetBrainCell {
  v?: string | number | boolean; // Raw value
  f?: string;                    // Formula, e.g. "=SUM(C2:C9)"
  t?: 's' | 'n' | 'b' | 'd';     // Cell type
  s?: SheetBrainCellStyle;       // Formatting / styling
}

export interface SheetBrainCellStyle {
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  bg?: string;                   // Hex color or severity tag
  fontColor?: string;
  format?: string;               // e.g. "$#,##0", "0.0%"
}
```

---

## 2. What-If Scenario Delta Schema

```typescript
export interface ScenarioDeltaResponse {
  scenarioId: string;
  hypothesis: string;
  summary: string;
  overallImpact: 'positive' | 'neutral' | 'critical';
  modifiedCells: Array<{
    coordinate: string; // e.g. "C10"
    originalValue: number | string;
    newValue: number | string;
    deltaPercent: string; // e.g. "+15.0%"
    severity: 'normal' | 'warning' | 'critical';
  }>;
}
```

---

## 3. Chart Configuration Schema

```typescript
export interface SheetBrainChartConfig {
  type: 'bar' | 'line' | 'waterfall' | 'donut';
  title: string;
  xAxisKey: string;
  dataRange: string; // e.g. "A1:E12"
  series: Array<{
    key: string;
    label: string;
    color: string;
  }>;
}
```
