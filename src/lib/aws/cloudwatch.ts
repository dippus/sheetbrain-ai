/**
 * AWS CloudWatch Embedded Metric Format (EMF) Logger.
 *
 * Emits structured EMF JSON to stdout so an Amazon CloudWatch agent attached to
 * the Amplify compute environment can ingest high-resolution custom metrics into
 * the `SheetBrainAI/Metrics` namespace in the ap-southeast-2 project region.
 *
 * SECURITY (REQ-NF-003): This module records operation metadata only. Model
 * identifiers and AWS credential state are never logged.
 */

export type CloudWatchOperation =
  | 'GenerateWorkbook'
  | 'SimulateScenario'
  | 'LocalDataIngest'
  | 'FormulaRecalculate'
  | 'Agent1_SchemaArchitect'
  | 'Agent2_FormulaCompiler'
  | 'Agent3_VisualAnalytics'
  | 'Agent4_DeterministicEngine'
  | 'GenerateWorkbook_MultiAgentPipeline';

export interface CloudWatchMetricData {
  operation: CloudWatchOperation;
  latencyMs: number;
  isFallback?: boolean;
  status: 'SUCCESS' | 'ERROR';
  modelId?: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * In-process latency sampler used by /api/observability to report REAL
 * percentiles instead of placeholder values. Bounded to the most recent
 * MAX_SAMPLES observations to keep serverless memory flat.
 */
const MAX_SAMPLES = 500;
const latencySamples: number[] = [];
let invocationTotal = 0;
let fallbackTotal = 0;
let errorTotal = 0;

export interface LatencyPercentiles {
  sampleCount: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
}

export function getLatencyPercentiles(): LatencyPercentiles {
  if (latencySamples.length === 0) {
    return { sampleCount: 0, p50LatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0, maxLatencyMs: 0 };
  }

  const sorted = [...latencySamples].sort((a, b) => a - b);
  const at = (percentile: number): number => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1));
    return sorted[idx];
  };

  return {
    sampleCount: sorted.length,
    p50LatencyMs: at(50),
    p95LatencyMs: at(95),
    p99LatencyMs: at(99),
    maxLatencyMs: sorted[sorted.length - 1],
  };
}

export function getPipelineTotals(): { invocations: number; fallbacks: number; errors: number } {
  return { invocations: invocationTotal, fallbacks: fallbackTotal, errors: errorTotal };
}

export function logCloudWatchMetric(data: CloudWatchMetricData): void {
  const timestamp = Date.now();
  const region = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'ap-southeast-2';
  const latencyMs = Math.max(0, Math.round(data.latencyMs));

  // Record real observations for the /api/observability percentiles.
  invocationTotal += 1;
  if (data.isFallback) fallbackTotal += 1;
  if (data.status === 'ERROR') errorTotal += 1;
  latencySamples.push(latencyMs);
  if (latencySamples.length > MAX_SAMPLES) latencySamples.shift();

  const emfPayload = {
    _aws: {
      Timestamp: timestamp,
      CloudWatchMetrics: [
        {
          Namespace: 'SheetBrainAI/Metrics',
          Dimensions: [['Operation', 'Region', 'Status']],
          Metrics: [
            { Name: 'LatencyMs', Unit: 'Milliseconds' },
            { Name: 'InvocationCount', Unit: 'Count' },
            { Name: 'FallbackCount', Unit: 'Count' },
            { Name: 'ErrorCount', Unit: 'Count' },
          ],
        },
      ],
    },
    Operation: data.operation,
    Region: region,
    Status: data.status,
    LatencyMs: latencyMs,
    InvocationCount: 1,
    FallbackCount: data.isFallback ? 1 : 0,
    ErrorCount: data.status === 'ERROR' ? 1 : 0,
    ...(data.metadata || {}),
  };

  // Structured stdout emission for CloudWatch agent ingestion.
  console.log(JSON.stringify(emfPayload));
}
