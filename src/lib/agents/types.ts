import { SheetColumn, SheetCell, ChartConfig, WorkbookModel } from '@/types/sheet';

export interface AgentExecutionStep {
  agentId: 'agent_1_schema_architect' | 'agent_2_formula_compiler' | 'agent_3_visual_analytics' | 'agent_4_deterministic_engine' | 'agent_5_self_correction';
  name: string;
  role: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FALLBACK' | 'ERROR';
  latencyMs: number;
  details?: Record<string, unknown>;
}

/**
 * One defect the self-correction agent found and repaired.
 * `coord` is null for workbook-wide repairs (for example an unsafe summary).
 */
export interface CorrectionFinding {
  coord: string | null;
  defect: 'erroring_formula' | 'circular_reference' | 'blank_formula_cell' | 'summary_over_snapshot';
  detail: string;
  action: 'replaced_with_value' | 'removed_formula' | 'restored_aggregate';
}

export interface SelfCorrectionReport {
  iterations: number;
  issuesFound: number;
  issuesFixed: number;
  converged: boolean;
  findings: CorrectionFinding[];
}

export interface AgentPipelineTrace {
  pipelineId: string;
  timestamp: number;
  totalLatencyMs: number;
  userPrompt: string;
  steps: AgentExecutionStep[];
  isPureDeterministic: boolean;
  /** Present whenever the self-correction pass ran. */
  selfCorrection?: SelfCorrectionReport;
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
