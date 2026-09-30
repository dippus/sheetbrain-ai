import { BedrockRuntimeClient, BedrockRuntimeClientConfig, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const region = process.env.BEDROCK_REGION || 'ap-southeast-2';
const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';

// Initialize Bedrock client. Reads explicit credentials or IAM role automatically.
export function getBedrockClient(): BedrockRuntimeClient | null {
  try {
    const config: BedrockRuntimeClientConfig = { region };
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

  // Check for credentials: API key, Open-Source endpoints, or AWS IAM credentials
  const apiKey = process.env.AWS_BEARER_TOKEN_BEDROCK || process.env.AWS_BEDROCK_API_KEY;
  const hasIam = Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI);
  const hasOpenSource = Boolean(process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OLLAMA_BASE_URL);

  if (!apiKey && !hasIam && !hasOpenSource) {
    return { data: null, error: 'NO_CREDENTIALS', latencyMs: 0 };
  }

  try {
    let payload: Record<string, unknown>;

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

    let decoded = '';

    // Method 1: Open-Source AI Provider Support (Groq / OpenRouter / Ollama)
    const groqKey = process.env.GROQ_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const ollamaUrl = process.env.OLLAMA_BASE_URL;

    if (groqKey) {
      // High-speed open-source Llama 3.3 on Groq Cloud
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (groqRes.ok) {
        decoded = await groqRes.text();
      }
    } else if (openRouterKey) {
      // Free / Open-source models via OpenRouter (DeepSeek R1 / Llama 3.3)
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (orRes.ok) {
        decoded = await orRes.text();
      }
    } else if (ollamaUrl) {
      // 100% Offline Local Open-Source LLM (Ollama)
      const olRes = await fetch(`${ollamaUrl.replace(/\/+$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama3',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (olRes.ok) {
        decoded = await olRes.text();
      }
    } else if (apiKey) {
      // Method 2: AWS Bedrock Mantle Distributed Inference Endpoint
      const isMantle = apiKey.startsWith('ABSKTWFudGxl') || (!modelId.startsWith('anthropic.') && !modelId.startsWith('amazon.nova'));
      const effectiveModel = isMantle && modelId.startsWith('anthropic.') ? 'deepseek.v3.2' : modelId;

      if (isMantle) {
        const mantleUrl = `https://bedrock-mantle.${region}.api.aws/v1/chat/completions`;
        const mantlePayload = {
          model: effectiveModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
        };

        const res = await fetch(mantleUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify(mantlePayload),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          decoded = await res.text();
        } else {
          const errText = await res.text();
          console.warn(`[Bedrock Mantle API] ${res.status} ${res.statusText}:`, errText);
        }
      } else {
        // Standard Bedrock Runtime Endpoint
        const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          decoded = await res.text();
        } else {
          const errText = await res.text();
          console.warn(`[Bedrock API Key] ${res.status} ${res.statusText}:`, errText);
        }
      }
    } else {
      // Method 2: Standard AWS SDK BedrockRuntimeClient with IAM SigV4
      const client = getBedrockClient();
      if (!client) {
        return { data: null, error: 'Bedrock client unavailable', latencyMs: 0 };
      }

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      if (!response.body) {
        return { data: null, error: 'Empty response body from Bedrock', latencyMs: Date.now() - startTime };
      }

      decoded = new TextDecoder().decode(response.body);
    }

    const latencyMs = Date.now() - startTime;
    const resultJson = JSON.parse(decoded);

    let textOutput = '';
    if (resultJson.choices?.[0]?.message?.content) {
      textOutput = resultJson.choices[0].message.content;
    } else if (resultJson.content?.[0]?.text) {
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
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Bedrock invocation failed';
    console.warn('[Bedrock] Invocation notice (safe fallback active):', errorMsg);
    return { data: null, error: errorMsg, latencyMs };
  }
}
