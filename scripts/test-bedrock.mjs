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

const region = process.env.BEDROCK_REGION || 'us-east-1';
const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

console.log('\n==============================================');
console.log('   SheetBrain AI — AWS Bedrock Diagnostics');
console.log('==============================================\n');
console.log(`Region:   ${region}`);
console.log(`Model ID: ${modelId}`);

if (!accessKey || accessKey.includes('your_access_key') || !secretKey || secretKey.includes('your_secret_key')) {
  console.log('\n[i] Status: NO AWS CREDENTIALS SET in .env.local');
  console.log('\nApp is currently operating in: LOCAL DETERMINISTIC MODE');
  console.log('(Instant 50ms responses, zero cloud bills, 100% offline capability)\n');
  console.log('To activate AWS Bedrock:');
  console.log('1. Open AWS Console -> Bedrock -> "Model access" -> Request Claude 3.5 Sonnet / Haiku');
  console.log('2. Open AWS Console -> IAM -> Create Access Key');
  console.log('3. Put AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local');
  console.log('4. Run this check again: npm run test:bedrock\n');
  process.exit(0);
}

console.log(`Access Key: ${accessKey.slice(0, 4)}...${accessKey.slice(-4)}`);
console.log('Pinging AWS Bedrock...');

const client = new BedrockRuntimeClient({
  region,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

const payload = {
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 50,
  messages: [{ role: 'user', content: 'Say "Bedrock is online"' }],
};

try {
  const start = Date.now();
  const cmd = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });
  const res = await client.send(cmd);
  const latency = Date.now() - start;
  const decoded = new TextDecoder().decode(res.body);
  const parsed = JSON.parse(decoded);
  const reply = parsed.content?.[0]?.text?.trim();

  console.log(`\n[SUCCESS] AWS Bedrock Connected in ${latency}ms!`);
  console.log(`Response: "${reply}"\n`);
} catch (err) {
  console.error('\n[ERROR] Bedrock ping failed:');
  console.error(err.message || err);
  console.log('\nCommon causes:');
  console.log('- "AccessDeniedException": Model access not yet granted in AWS Bedrock Console.');
  console.log('- "UnrecognizedClientException": Invalid Access Key ID.');
  console.log('- "SignatureDoesNotMatch": Invalid Secret Access Key.');
  console.log('- Region mismatch: Ensure Bedrock Model is enabled in ' + region + '\n');
}
