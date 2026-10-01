/**
 * AWS CloudWatch Embedded Metric Format (EMF) & Direct SDK Logger.
 *
 * Implements high-resolution observability via dual channels:
 * 1. Direct AWS SDK (@aws-sdk/client-cloudwatch PutMetricDataCommand)
 * 2. Structured CloudWatch Embedded Metric Format (EMF) stdout emission
 *
 * Emits metrics into the `SheetBrainAI/Metrics` namespace in the ap-southeast-2 project region.
 *
 * SECURITY (REQ-NF-003): This module records operation metadata only. Model
 * identifiers and AWS credential state are never logged.
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export type CloudWatchOperation =
  | 'GenerateWorkbook'
  | 'SimulateScenario'
  | 'LocalDataIngest'
  | 'FormulaRecalculate'
  | 'Agent1_SchemaArchitect'
  | 'Agent2_FormulaCompiler'
  | 'Agent3_VisualAnalytics'
  | 'Agent4_DeterministicEngine'
  | 'Agent5_SelfCorrection'
  | 'GenerateWorkbook_MultiAgentPipeline'
  | 'EditPlanner'
  | 'ApplyEditOperations'
  | 'SecurityRateLimit'
  | 'SecurityPromptInjection';

export interface CloudWatchMetricData {
  operation: CloudWatchOperation;
  latencyMs: number;
  isFallback?: boolean;
  status: 'SUCCESS' | 'ERROR';
  modelId?: string;
  metadata?: Record<string, string | number | boolean>;
}

const REGION = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'ap-southeast-2';

/**
 * Lazy singleton CloudWatchClient for direct SDK metric publishing.
 * Picks up ambient AWS credentials or IAM role permissions in Amplify/Lambda.
 */
let cloudWatchClientInstance: CloudWatchClient | null = null;

export function getCloudWatchClient(): CloudWatchClient | null {
  if (typeof window !== 'undefined') return null; // Server-side execution only invariant

  if (!cloudWatchClientInstance) {
    try {
      const config: {
        region: string;
        credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
      } = { region: REGION };

      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
        };
      }
      cloudWatchClientInstance = new CloudWatchClient(config);
    } catch (error) {
      console.warn('[CloudWatch] Client initialization notice (EMF stdout active):', error);
      return null;
    }
  }
  return cloudWatchClientInstance;
}

/**
 * Directly publish metrics to Amazon CloudWatch via AWS SDK PutMetricDataCommand.
 */
export async function sendCloudWatchMetricViaSDK(data: CloudWatchMetricData): Promise<boolean> {
  const client = getCloudWatchClient();
  if (!client) return false;

  try {
    const latency = Math.max(0, Math.round(data.latencyMs));
    const command = new PutMetricDataCommand({
      Namespace: 'SheetBrainAI/Metrics',
      MetricData: [
        {
          MetricName: 'LatencyMs',
          Value: latency,
          Unit: 'Milliseconds',
          Dimensions: [
            { Name: 'Operation', Value: data.operation },
            { Name: 'Region', Value: REGION },
            { Name: 'Status', Value: data.status },
          ],
        },
        {
          MetricName: 'InvocationCount',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Operation', Value: data.operation },
            { Name: 'Region', Value: REGION },
            { Name: 'Status', Value: data.status },
          ],
        },
      ],
    });

    await client.send(command);
    return true;
  } catch {
    // Non-blocking resilience: EMF stdout emission ensures metrics are preserved by CloudWatch agent
    return false;
  }
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
  const latencyMs = Math.max(0, Math.round(data.latencyMs));

  // Record real observations for the /api/observability percentiles.
  invocationTotal += 1;
  if (data.isFallback) fallbackTotal += 1;
  if (data.status === 'ERROR') errorTotal += 1;
  latencySamples.push(latencyMs);
  if (latencySamples.length > MAX_SAMPLES) latencySamples.shift();

  // 1. Structured EMF JSON emission for AWS CloudWatch Agent ingestion
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
    Region: REGION,
    Status: data.status,
    LatencyMs: latencyMs,
    InvocationCount: 1,
    FallbackCount: data.isFallback ? 1 : 0,
    ErrorCount: data.status === 'ERROR' ? 1 : 0,
    ...(data.metadata || {}),
  };

  console.log(JSON.stringify(emfPayload));

  // 2. Direct AWS SDK invocation in non-blocking background task
  sendCloudWatchMetricViaSDK(data).catch(() => {});
}
