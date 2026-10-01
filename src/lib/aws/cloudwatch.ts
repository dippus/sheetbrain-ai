/**
 * AWS CloudWatch Embedded Metric Format (EMF) Logger
 * Emits zero-overhead, real-time CloudWatch metrics directly via stdout.
 * Native AWS Lambda, ECS, and Amplify agents automatically parse EMF JSON
 * into high-resolution CloudWatch custom metrics in the ap-southeast-2 project region.
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

export function logCloudWatchMetric(data: CloudWatchMetricData): void {
  const timestamp = Date.now();
  const region = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'ap-southeast-2';

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
          ],
        },
      ],
    },
    Operation: data.operation,
    Region: region,
    Status: data.status,
    LatencyMs: Math.round(data.latencyMs),
    InvocationCount: 1,
    FallbackCount: data.isFallback ? 1 : 0,
    ModelId: data.modelId || 'anthropic.claude-3-haiku-20240307-v1:0',
    ...(data.metadata || {}),
  };

  // Structured stdout emission for AWS CloudWatch agent parsing
  console.log(JSON.stringify(emfPayload));
}
