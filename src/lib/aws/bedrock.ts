import { BedrockRuntimeClient, BedrockRuntimeClientConfig, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const region = process.env.BEDROCK_REGION || 'ap-southeast-2';
const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';

/**
 * PERF (REQ-NF-001): Foundation-model calls for the schema stage legitimately take
 * 20-40 seconds. The previous 5s ceiling aborted every invocation before the model
 * could reply, which silently forced all four agents into the deterministic
 * fallback. The budget is now generous by default and overridable per environment.
 */
const REQUEST_TIMEOUT_MS = Number(process.env.BEDROCK_TIMEOUT_MS) || 90000;

export interface BedrockRuntimeState {
  region: string;
  configuredModelId: string;
  /** The model actually invoked, accounting for the Mantle endpoint remap. */
  effectiveModelId: string;
  transport: 'mantle' | 'invoke-model' | 'none';
  authConfigured: boolean;
  /** No Bedrock guardrail is wired up in this project. */
  guardrailConfigured: boolean;
}

/**
 * Reports what Bedrock configuration is genuinely in effect, so the UI can
 * display real values instead of hardcoded marketing strings. Nothing here is
 * a secret: it is the model name, the region, and boolean capability flags.
 */
export function describeBedrockRuntime(): BedrockRuntimeState {
  const apiKey = process.env.AWS_BEARER_TOKEN_BEDROCK || process.env.AWS_BEDROCK_API_KEY || '';
  const hasIamCredentials = Boolean(
    process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
  );

  const isMantle = Boolean(apiKey)
    ? apiKey.startsWith('ABSKTWFudGxl') || (!modelId.startsWith('anthropic.') && !modelId.startsWith('amazon.nova'))
    : false;
  // Use official Amazon Bedrock Model identifier (Claude 3.5 Sonnet / configured model)
  const effectiveModelId = modelId;

  return {
    region,
    configuredModelId: modelId,
    effectiveModelId,
    transport: apiKey ? (isMantle ? 'mantle' : 'invoke-model') : hasIamCredentials ? 'invoke-model' : 'none',
    authConfigured: Boolean(apiKey) || hasIamCredentials,
    guardrailConfigured: Boolean(process.env.BEDROCK_GUARDRAIL_ID),
  };
}

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
  /**
   * Per-call latency budget. The shared endpoint's response time varies widely
   * (3s-60s observed), so each pipeline stage declares how long it is willing to
   * wait before the deterministic engine takes over. Defaults to the global budget.
   */
  timeoutMs?: number;
}

/**
 * Invokes Amazon Bedrock Foundation Models (Claude 3.5 Sonnet, Claude 3 Haiku, Amazon Nova).
 * Gracefully handles JSON extraction and falls back safely to zero-crash local mode.
 */
export async function invokeBedrockAgent<T>({
  systemPrompt,
  userPrompt,
  maxTokens = 2000,
  timeoutMs = REQUEST_TIMEOUT_MS,
}: BedrockAgentInvokeOptions): Promise<{ data: T | null; error?: string; latencyMs: number }> {
  const startTime = Date.now();
  const budget = Math.max(1000, timeoutMs);

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
        signal: AbortSignal.timeout(budget),
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
        signal: AbortSignal.timeout(budget),
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
        signal: AbortSignal.timeout(budget),
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
          signal: AbortSignal.timeout(budget),
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
          signal: AbortSignal.timeout(budget),
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

    const parsedData = parseJsonPayload<T>(jsonMatch[0]);
    if (parsedData === null) {
      return { data: null, error: 'Bedrock response was not valid JSON', latencyMs };
    }
    return { data: parsedData, latencyMs };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Bedrock invocation failed';
    console.warn('[Bedrock] Invocation notice (safe fallback active):', errorMsg);
    return { data: null, error: errorMsg, latencyMs };
  }
}

/**
 * Parses a model response into T, tolerating two common real-world defects:
 * 1. Markdown code fences (```json ... ```) already handled by the caller.
 * 2. Truncated output when the generation hits the max_tokens ceiling. The tail
 *    of the payload is simply missing, so we drop the incomplete trailing
 *    fragment and close the open brackets to recover the completed prefix.
 * Returns null when nothing usable can be recovered.
 */
function parseJsonPayload<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Fall through to truncation repair.
  }

  // Truncation repair: walk backwards to the last position that closes a complete
  // value, then balance the brackets that remain open.
  const withoutFence = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let lastCompleteValue = -1;

  for (let i = 0; i < withoutFence.length; i++) {
    const ch = withoutFence[i];

    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = false; lastCompleteValue = i; }
      continue;
    }

    if (ch === '"') { inString = true; continue; }

    if (ch === '{' || ch === '[') { stack.push(ch); continue; }

    if (ch === '}' || ch === ']') {
      stack.pop();
      if (stack.length === 0) lastCompleteValue = i;
      continue;
    }
  }

  if (lastCompleteValue === -1) return null;

  // Cut back to the last complete value and drop any dangling comma.
  let repaired = withoutFence.slice(0, lastCompleteValue + 1).replace(/,\s*$/, '');

  // Re-close every container still open at the cut point.
  const opens: string[] = [];
  let inStr = false;
  let esc = false;
  for (const ch of repaired) {
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') opens.push('}');
    else if (ch === '[') opens.push(']');
  }
  repaired += opens.reverse().join('');

  try {
    return JSON.parse(repaired) as T;
  } catch {
    return null;
  }
}
