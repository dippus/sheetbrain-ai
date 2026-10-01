import { ChartConfig } from '@/types/sheet';
import { invokeBedrockAgent } from '@/lib/aws/bedrock';
import { SchemaArchitectOutput, FormulaCompilerOutput, VisualAnalyticsOutput } from './types';

interface BedrockAnalyticsPayload {
  chartType: 'line' | 'bar' | 'area';
  title?: string;
  primarySeriesKey: string;
  primarySeriesLabel: string;
  secondarySeriesKey?: string;
  secondarySeriesLabel?: string;
  narrativeInsight?: string;
}

/**
 * 📊 AGENT 3: The Visual Analytics Engine
 * Responsibility: Synthesizes intelligent narrative data visualizations by analyzing
 * schema dimensions, mathematical dependencies, and numerical distributions.
 * Features dedicated Amazon Bedrock reasoning with seamless deterministic fallback.
 */
export async function executeVisualAnalytics(
  schema: SchemaArchitectOutput,
  compiledData: FormulaCompilerOutput
): Promise<{ output: VisualAnalyticsOutput; isFallback: boolean; latencyMs: number }> {
  const startTime = Date.now();
  const { columns, metadata, title, rawRows } = schema;
  const numericCols = columns.filter(c => c.type === 'currency' || c.type === 'number');

  // Attempt Amazon Bedrock Visual Intelligence Invocation
  const systemPrompt = `You are AGENT 3: The Visual Analytics Engine for SheetBrain AI.
Analyze the spreadsheet schema, column definitions, and compiled numerical data.
Determine:
1. Optimal visualization model ('area' for continuous time-series / runway, 'bar' for categorical / payroll / departments, 'line' for general trends).
2. The most critical primary metric column and optional secondary comparison column.
3. A 1-sentence executive narrative insight.
Return strict JSON:
{
  "chartType": "area" | "line" | "bar",
  "title": string,
  "primarySeriesKey": "B",
  "primarySeriesLabel": "Metric Label",
  "secondarySeriesKey": "C",
  "secondarySeriesLabel": "Comparison Label",
  "narrativeInsight": string
}`;

  try {
    const bedrockResult = await invokeBedrockAgent<BedrockAnalyticsPayload>({
      systemPrompt,
      userPrompt: `Dataset: "${title}". Columns: ${JSON.stringify(columns.map(c => ({ key: c.key, label: c.label, type: c.type })))}. Rows count: ${rawRows.length}. Sample compiled cells: ${JSON.stringify(Object.keys(compiledData.cellData).slice(0, 10))}`,
      maxTokens: 1000,
      // Chart selection is a rule-based decision; the local synthesiser produces
      // an equivalent config, so a slow model adds latency without adding value.
      timeoutMs: 12000,
    });

    if (bedrockResult.data && bedrockResult.data.primarySeriesKey) {
      const validTypes: Array<'line' | 'bar' | 'area'> = ['line', 'bar', 'area'];
      const chartType = validTypes.includes(bedrockResult.data.chartType) ? bedrockResult.data.chartType : 'area';

      const series = [
        {
          key: bedrockResult.data.primarySeriesKey,
          label: bedrockResult.data.primarySeriesLabel || 'Primary Metric',
          color: '#06b6d4', // Cyan
        },
      ];

      if (bedrockResult.data.secondarySeriesKey && bedrockResult.data.secondarySeriesKey !== bedrockResult.data.primarySeriesKey) {
        series.push({
          key: bedrockResult.data.secondarySeriesKey,
          label: bedrockResult.data.secondarySeriesLabel || 'Secondary Metric',
          color: '#10b981', // Emerald
        });
      }

      const chartConfig: ChartConfig = {
        type: chartType,
        title: bedrockResult.data.title || `${title} — Strategic Horizon`,
        xAxisKey: columns[0]?.key || 'A',
        series,
      };

      return {
        output: {
          chartConfig,
          primaryMetricKey: bedrockResult.data.primarySeriesKey,
          narrativeInsight: bedrockResult.data.narrativeInsight || `AI synthesized ${chartType} visualization across active data horizons.`,
        },
        isFallback: false,
        latencyMs: bedrockResult.latencyMs || Date.now() - startTime,
      };
    }
  } catch (error) {
    console.warn('[Agent 3: VisualAnalytics] Bedrock invocation note:', error);
  }

  // Deterministic Fallback: Rule-Based Narrative Synthesizer
  const isAcademic = metadata?.domain?.includes('Education') || columns.some(c => /student|grade|marks|roll/i.test(c.label));
  const isTimeSeries = metadata?.hasTimeDimension ?? (!isAcademic);

  let xAxisCol = columns[0];
  let primaryCol = numericCols[0];
  let secondaryCol: typeof numericCols[0] | undefined;
  let chartType: 'line' | 'bar' | 'area' = isTimeSeries ? 'area' : 'bar';
  let chartTitle = `${title} — Operational Trajectory`;
  let insight = `Synthesized visual telemetry tracking performance across active horizons.`;

  if (isAcademic) {
    chartType = 'bar';
    // X-Axis should be Student Name if present, else Roll No
    xAxisCol = columns.find(c => /student|name/i.test(c.label)) || columns[1] || columns[0];
    // Primary metric should be Total Marks or Percentage
    primaryCol = numericCols.find(c => /total marks|aggregate|score/i.test(c.label)) ||
                 numericCols.find(c => /percentage/i.test(c.label)) ||
                 numericCols[0] || columns[2];
    secondaryCol = numericCols.find(c => c.key !== primaryCol?.key && /dbms|web|software|python|math|science/i.test(c.label));
    chartTitle = `${title} — Student Academic Performance`;
    insight = `Academic marks distribution across student cohort demonstrating curriculum mastery and performance spread.`;
  } else {
    primaryCol = numericCols[numericCols.length > 2 ? 1 : 0] || numericCols[0] || columns[1] || columns[0];
    secondaryCol = numericCols.length > 1 ? numericCols[numericCols.length - 1] : undefined;
  }

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
    title: chartTitle,
    xAxisKey: xAxisCol?.key || 'A',
    series,
  };

  return {
    output: {
      chartConfig,
      primaryMetricKey: primaryCol?.key || 'B',
      narrativeInsight: insight,
    },
    isFallback: true,
    latencyMs: Date.now() - startTime,
  };
}
