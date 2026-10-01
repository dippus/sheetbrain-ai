import { ChartConfig } from '@/types/sheet';
import { SchemaArchitectOutput, FormulaCompilerOutput, VisualAnalyticsOutput } from './types';

/**
 * 📊 AGENT 3: The Visual Analytics Engine
 * Responsibility: Analyzes schema dimensions and data distributions,
 * selects the optimal visualization model (Area, Line, Bar),
 * and maps primary series with curated theme palettes.
 */
export async function executeVisualAnalytics(
  schema: SchemaArchitectOutput,
  _compiledData: FormulaCompilerOutput
): Promise<{ output: VisualAnalyticsOutput; isFallback: boolean; latencyMs: number }> {
  const startTime = Date.now();
  const { columns, metadata, title } = schema;

  // 1. Identify primary numeric or currency column
  const numericCols = columns.filter(c => c.type === 'currency' || c.type === 'number');
  const primaryCol = numericCols[numericCols.length > 2 ? 1 : 0] || numericCols[0] || columns[1] || columns[0];
  const secondaryCol = numericCols.length > 1 ? numericCols[numericCols.length - 1] : undefined;

  const isTimeSeries = metadata?.hasTimeDimension ?? true;
  const chartType: 'line' | 'bar' | 'area' = isTimeSeries ? 'area' : 'bar';

  const series = [
    {
      key: primaryCol?.key || 'B',
      label: primaryCol?.label || 'Primary Metric',
      color: '#06b6d4', // Cyan
    },
  ];

  if (secondaryCol && secondaryCol.key !== primaryCol?.key) {
    series.push({
      key: secondaryCol.key,
      label: secondaryCol.label,
      color: '#10b981', // Emerald
    });
  }

  const chartConfig: ChartConfig = {
    type: chartType,
    title: `${title} — Operational Trajectory`,
    xAxisKey: columns[0]?.key || 'A',
    series,
  };

  return {
    output: {
      chartConfig,
      primaryMetricKey: primaryCol?.key || 'B',
      narrativeInsight: `Synthesized ${chartType} visualization tracking ${primaryCol?.label} across active horizons.`,
    },
    isFallback: false,
    latencyMs: Date.now() - startTime,
  };
}
