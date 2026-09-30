import { NextResponse } from 'next/server';

export async function GET() {
  const hasBedrockKeys = Boolean(
    process.env.AWS_BEARER_TOKEN_BEDROCK ||
    process.env.AWS_BEDROCK_API_KEY ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
  );
  return NextResponse.json({
    status: 'healthy',
    service: 'SheetBrain AI Studio API',
    region: process.env.BEDROCK_REGION || 'ap-southeast-2',
    model: process.env.BEDROCK_MODEL_ID || 'deepseek.v3.2',
    bedrockConfigured: hasBedrockKeys,
    timestamp: new Date().toISOString(),
  });
}
