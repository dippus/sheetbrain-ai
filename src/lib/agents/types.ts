import { SheetColumn, SheetCell, ChartConfig, WorkbookModel } from '@/types/sheet';

export interface AgentExecutionStep {
  agentId: 'agent_1_schema_architect' | 'agent_2_formula_compiler' | 'agent_3_visual_analytics' | 'agent_4_deterministic_engine';
  name: string;
  role: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FALLBACK' | 'ERROR';
  latencyMs: number;
  details?: Record<string, unknown>;
}

export interface AgentPipelineTrace {
  pipelineId: string;
  timestamp: number;
  totalLatencyMs: number;
  userPrompt: string;
  steps: AgentExecutionStep[];
  isPureDeterministic: boolean;
}

export interface SchemaArchitectOutput {
  title: string;
  category: string;
  description: string;
  columns: SheetColumn[];
  rawRows: Array<Record<string, number | string | boolean | undefined>>;
  metadata?: {
    domain: string;
    currencySymbol?: string;
    hasTimeDimension: boolean;
  };
}

export interface FormulaCompilerOutput {
  cellData: Record<string, SheetCell>;
  formulasInjectedCount: number;
  summaryRowsCount: number;
  antiCircularGuardPassed: boolean;
}

export interface VisualAnalyticsOutput {
  chartConfig: ChartConfig;
  primaryMetricKey: string;
  narrativeInsight: string;
}

export interface MultiAgentPipelineResult {
  workbook: WorkbookModel;
  trace: AgentPipelineTrace;
  source: 'bedrock_multi_agent' | 'deterministic_multi_agent';
}
