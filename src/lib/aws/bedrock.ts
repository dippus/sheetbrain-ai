import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const region = process.env.BEDROCK_REGION || 'us-east-1';
const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';

// Initialize Bedrock client. In AWS Amplify / Lambda, IAM role credentials are automatically used.
export function getBedrockClient(): BedrockRuntimeClient | null {
  try {
    return new BedrockRuntimeClient({
      region,
      // Credentials automatically loaded from environment or Amplify IAM execution role
    });
  } catch (error) {
    console.warn('[Bedrock] Client initialization notice:', error);
    return null;
  }
}

export interface BedrockAgentInvokeOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

/**
 * Invokes Amazon Bedrock Claude 3.5 Sonnet with strict JSON extraction.
 * Includes graceful error handling to guarantee zero server crashes.
 */
export async function invokeBedrockAgent<T>({
  systemPrompt,
  userPrompt,
  maxTokens = 2000,
}: BedrockAgentInvokeOptions): Promise<{ data: T | null; error?: string; latencyMs: number }> {
  const startTime = Date.now();
  const client = getBedrockClient();

  if (!client) {
    return { data: null, error: 'Bedrock client unavailable', latencyMs: 0 };
  }

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  };

  try {
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const latencyMs = Date.now() - startTime;

    if (!response.body) {
      return { data: null, error: 'Empty response body from Bedrock', latencyMs };
    }

    const decoded = new TextDecoder().decode(response.body);
    const resultJson = JSON.parse(decoded);
    const textOutput = resultJson.content?.[0]?.text || '';

    // Extract JSON from potential code block markers
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { data: null, error: 'No JSON object found in Bedrock response', latencyMs };
    }

    const parsedData = JSON.parse(jsonMatch[0]) as T;
    return { data: parsedData, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.warn('[Bedrock] Invocation error, falling back to local engine:', err?.message || err);
    return { data: null, error: err?.message || 'Bedrock invocation failed', latencyMs };
  }
}
