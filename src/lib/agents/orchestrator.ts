import { recalculateWorkbook } from '@/lib/engine/formulaEngine';
import { logCloudWatchMetric } from '@/lib/aws/cloudwatch';
import { WorkbookModel } from '@/types/sheet';
import { executeSchemaArchitect } from './schemaArchitectAgent';
import { executeFormulaCompiler } from './formulaCompilerAgent';
import { executeVisualAnalytics } from './visualAnalyticsAgent';
import { AgentExecutionStep, AgentPipelineTrace, MultiAgentPipelineResult } from './types';

/**
 * 🚀 MULTI-AGENT AUTONOMOUS ORCHESTRATOR
 * Orchestrates the 4-agent neuro-symbolic pipeline:
 * Step 1: Agent 1 (Schema Architect) -> Schema & Rows
 * Step 2: Agent 2 (Formula Compiler) -> Reactive Math & Summary Rows
 * Step 3: Agent 3 (Visual Analytics) -> Chart Specs & Telemetry
 * Step 4: Agent 4 (Deterministic Engine) -> HyperFormula 0-Hallucination Math Recalculation
 */
export async function executeMultiAgentPipeline(userPrompt: string): Promise<MultiAgentPipelineResult> {
  const pipelineStartTime = Date.now();
  const pipelineId = `pipe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const steps: AgentExecutionStep[] = [];

  // ==========================================
  // STAGE 1: AGENT 1 — SCHEMA ARCHITECT
  // ==========================================
  const step1Start = Date.now();
  const schemaResult = await executeSchemaArchitect(userPrompt);
  const step1Latency = Date.now() - step1Start;

  steps.push({
    agentId: 'agent_1_schema_architect',
    name: 'Agent 1: Schema Architect',
    role: 'Domain Taxonomy & Column Architecture',
    status: schemaResult.isFallback ? 'FALLBACK' : 'SUCCESS',
    latencyMs: step1Latency,
    details: {
      columnsCount: schemaResult.output.columns.length,
      rawRowsCount: schemaResult.output.rawRows.length,
      domain: schemaResult.output.metadata?.domain,
    },
  });

  logCloudWatchMetric({
    operation: 'Agent1_SchemaArchitect',
    latencyMs: step1Latency,
    status: 'SUCCESS',
    isFallback: schemaResult.isFallback,
    metadata: { domain: schemaResult.output.metadata?.domain || 'General' },
  });

  // ==========================================
  // STAGE 2: AGENT 2 — FORMULA COMPILER
  // ==========================================
  const step2Start = Date.now();
  const formulaResult = await executeFormulaCompiler(schemaResult.output);
  const step2Latency = Date.now() - step2Start;

  steps.push({
    agentId: 'agent_2_formula_compiler',
    name: 'Agent 2: Formula Compiler',
    role: 'Mathematical Relationship & Formula Synthesis',
    status: formulaResult.isFallback ? 'FALLBACK' : 'SUCCESS',
    latencyMs: step2Latency,
    details: {
      formulasInjected: formulaResult.output.formulasInjectedCount,
      summaryRows: formulaResult.output.summaryRowsCount,
      antiCircularPassed: formulaResult.output.antiCircularGuardPassed,
    },
  });

  logCloudWatchMetric({
    operation: 'Agent2_FormulaCompiler',
    latencyMs: step2Latency,
    status: 'SUCCESS',
    isFallback: formulaResult.isFallback,
    metadata: { formulasInjected: formulaResult.output.formulasInjectedCount },
  });

  // ==========================================
  // STAGE 3: AGENT 3 — VISUAL ANALYTICS
  // ==========================================
  const step3Start = Date.now();
  const analyticsResult = await executeVisualAnalytics(schemaResult.output, formulaResult.output);
  const step3Latency = Date.now() - step3Start;

  steps.push({
    agentId: 'agent_3_visual_analytics',
    name: 'Agent 3: Visual Analytics',
    role: 'Automated Chart Specification & Visual Telemetry',
    status: 'SUCCESS',
    latencyMs: step3Latency,
    details: {
      chartType: analyticsResult.output.chartConfig.type,
      primaryMetricKey: analyticsResult.output.primaryMetricKey,
    },
  });

  logCloudWatchMetric({
    operation: 'Agent3_VisualAnalytics',
    latencyMs: step3Latency,
    status: 'SUCCESS',
    isFallback: false,
    metadata: { chartType: analyticsResult.output.chartConfig.type },
  });

  // ==========================================
  // STAGE 4: AGENT 4 — DETERMINISTIC MATH ENGINE
  // ==========================================
  const step4Start = Date.now();
  const calculatedCells = recalculateWorkbook(formulaResult.output.cellData);
  const step4Latency = Date.now() - step4Start;

  steps.push({
    agentId: 'agent_4_deterministic_engine',
    name: 'Agent 4: Deterministic Engine',
    role: 'HyperFormula v3 Recalculation & Dependency Resolution',
    status: 'SUCCESS',
    latencyMs: step4Latency,
    details: {
      recalculatedCellsCount: Object.keys(calculatedCells).length,
    },
  });

  logCloudWatchMetric({
    operation: 'Agent4_DeterministicEngine',
    latencyMs: step4Latency,
    status: 'SUCCESS',
    isFallback: false,
  });

  // ==========================================
  // ASSEMBLE LIVING WORKBOOK MODEL
  // ==========================================
  const totalLatencyMs = Date.now() - pipelineStartTime;
  const isPureDeterministic = schemaResult.isFallback && formulaResult.isFallback;

  const totalCalculatedCells = Object.keys(calculatedCells).length;
  const workbook: WorkbookModel = {
    id: `wb_${Date.now()}`,
    title: schemaResult.output.title,
    description: schemaResult.output.description,
    category: schemaResult.output.category,
    chartConfig: analyticsResult.output.chartConfig,
    sheets: [
      {
        id: 'sheet_1',
        name: 'Sheet1',
        rowCount: Math.max(totalCalculatedCells + 5, 20),
        columnCount: schemaResult.output.columns.length,
        columns: schemaResult.output.columns,
        cellData: calculatedCells,
      },
    ],
  };

  const trace: AgentPipelineTrace = {
    pipelineId,
    timestamp: Date.now(),
    totalLatencyMs,
    userPrompt,
    steps,
    isPureDeterministic,
  };

  // Overall Pipeline Log
  logCloudWatchMetric({
    operation: 'GenerateWorkbook_MultiAgentPipeline',
    latencyMs: totalLatencyMs,
    status: 'SUCCESS',
    isFallback: isPureDeterministic,
    metadata: {
      stepsCount: steps.length,
      pipelineId,
    },
  });

  return {
    workbook,
    trace,
    source: isPureDeterministic ? 'deterministic_multi_agent' : 'bedrock_multi_agent',
  };
}
