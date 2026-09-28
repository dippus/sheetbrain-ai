import { NextResponse } from 'next/server';

export async function GET() {
  const hasBedrockKeys = !!(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI);
  return NextResponse.json({
    status: 'healthy',
    service: 'SheetBrain AI Studio API',
    region: process.env.BEDROCK_REGION || 'us-east-1',
    model: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    bedrockConfigured: hasBedrockKeys,
    timestamp: new Date().toISOString(),
  });
}
