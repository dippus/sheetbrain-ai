import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const region = process.env.BEDROCK_REGION || 'us-east-1';
const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';

// Initialize Bedrock client. Reads explicit credentials or IAM role automatically.
export function getBedrockClient(): BedrockRuntimeClient | null {
  try {
    const config: any = { region };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
      };
    }
    return new BedrockRuntimeClient(config);
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
 * Invokes Amazon Bedrock Foundation Models (Claude 3.5 Sonnet, Claude 3 Haiku, Amazon Nova).
 * Gracefully handles JSON extraction and falls back safely to zero-crash local mode.
 */
export async function invokeBedrockAgent<T>({
  systemPrompt,
  userPrompt,
  maxTokens = 2000,
}: BedrockAgentInvokeOptions): Promise<{ data: T | null; error?: string; latencyMs: number }> {
  const startTime = Date.now();

  // If no credentials configured, skip Bedrock call immediately to avoid latency
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE && !process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) {
    return { data: null, error: 'NO_CREDENTIALS', latencyMs: 0 };
  }

  const client = getBedrockClient();
  if (!client) {
    return { data: null, error: 'Bedrock client unavailable', latencyMs: 0 };
  }

  try {
    let payload: any;

    if (modelId.startsWith('anthropic.')) {
      payload = {
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
    } else if (modelId.startsWith('amazon.nova')) {
      payload = {
        inferenceConfig: { max_new_tokens: maxTokens },
        system: [{ text: systemPrompt }],
        messages: [
          {
            role: 'user',
            content: [{ text: userPrompt }],
          },
        ],
      };
    } else {
      payload = {
        inputText: `${systemPrompt}\n\nUser Request: ${userPrompt}`,
        textGenerationConfig: { maxTokenCount: maxTokens, temperature: 0.2 },
      };
    }

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

    let textOutput = '';
    if (resultJson.content?.[0]?.text) {
      textOutput = resultJson.content[0].text;
    } else if (resultJson.output?.message?.content?.[0]?.text) {
      textOutput = resultJson.output.message.content[0].text;
    } else if (resultJson.results?.[0]?.outputText) {
      textOutput = resultJson.results[0].outputText;
    }

    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { data: null, error: 'No JSON object found in Bedrock response', latencyMs };
    }

    const parsedData = JSON.parse(jsonMatch[0]) as T;
    return { data: parsedData, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.warn('[Bedrock] Invocation notice (safe fallback active):', err?.message || err);
    return { data: null, error: err?.message || 'Bedrock invocation failed', latencyMs };
  }
}
