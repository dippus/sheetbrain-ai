import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local if present
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const region = process.env.BEDROCK_REGION || 'ap-southeast-2';
const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
const apiKey = process.env.AWS_BEARER_TOKEN_BEDROCK || process.env.AWS_BEDROCK_API_KEY;
const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

console.log('\n==============================================');
console.log('   SheetBrain AI — AWS Bedrock Diagnostics');
console.log('==============================================\n');
console.log(`Region:   ${region}`);
console.log(`Model ID: ${modelId}`);

if (!apiKey && (!accessKey || accessKey.includes('your_access_key') || !secretKey || secretKey.includes('your_secret_key'))) {
  console.log('\n[i] Status: NO AWS CREDENTIALS SET in .env.local');
  console.log('\nApp is currently operating in: LOCAL DETERMINISTIC MODE');
  console.log('(Instant 50ms responses, zero cloud bills, 100% offline capability)\n');
  console.log('To activate AWS Bedrock:');
  console.log('Option A (Bedrock API Key / Bearer Token):');
  console.log('  Put AWS_BEARER_TOKEN_BEDROCK=ABSK... in .env.local');
  console.log('Option B (AWS IAM Key):');
  console.log('  Put AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local');
  console.log('Then run this check again: npm run test:bedrock\n');
  process.exit(0);
}

const payload = {
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 50,
  messages: [{ role: 'user', content: 'Say "Bedrock is online"' }],
};

try {
  const start = Date.now();
  let reply = '';

  if (apiKey) {
    console.log(`Auth Mode: Bedrock API Key / Bearer Token (${apiKey.slice(0, 8)}...${apiKey.slice(-6)})`);
    const isMantle = apiKey.startsWith('ABSKTWFudGxl') || !modelId.startsWith('anthropic.') && !modelId.startsWith('amazon.nova');
    const effectiveModel = isMantle && modelId.startsWith('anthropic.') ? 'deepseek.v3.2' : modelId;

    if (isMantle) {
      console.log(`Pinging AWS Bedrock Mantle (${effectiveModel})...`);
      const mantleUrl = `https://bedrock-mantle.${region}.api.aws/v1/chat/completions`;
      const res = await fetch(mantleUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: [{ role: 'user', content: 'Say "Bedrock is online"' }],
          max_tokens: 50,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${errText}`);
      }

      const parsed = await res.json();
      reply = parsed.choices?.[0]?.message?.content?.trim();
    } else {
      console.log(`Pinging AWS Bedrock Runtime (${modelId})...`);
      const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${errText}`);
      }

      const parsed = await res.json();
      reply = parsed.content?.[0]?.text?.trim();
    }
  } else {
    console.log(`Auth Mode: AWS IAM Credentials (${accessKey.slice(0, 4)}...${accessKey.slice(-4)})`);
    console.log('Pinging AWS Bedrock via SigV4...');
    const client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
    const cmd = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });
    const res = await client.send(cmd);
    const decoded = new TextDecoder().decode(res.body);
    const parsed = JSON.parse(decoded);
    reply = parsed.content?.[0]?.text?.trim();
  }

  const latency = Date.now() - start;
  console.log(`\n[SUCCESS] AWS Bedrock Connected in ${latency}ms!`);
  console.log(`Response: "${reply}"\n`);
} catch (err) {
  console.error('\n[ERROR] Bedrock ping failed:');
  console.error(err.message || err);
  console.log('\nCommon causes:');
  console.log('- "AccessDeniedException": Model access not yet granted in AWS Bedrock Console.');
  console.log('- Region mismatch: Ensure Bedrock Model is enabled in ' + region + '\n');
}
