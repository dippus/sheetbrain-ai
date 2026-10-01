import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Public liveness/readiness probe.
 *
 * SECURITY (REQ-NF-003): This endpoint is intentionally unauthenticated so that
 * uptime monitors and judges can verify the deployment without credentials.
 * It therefore MUST NOT disclose credential state, bucket names, account IDs,
 * or any other reconnaissance-useful infrastructure metadata.
 *
 * Only non-sensitive liveness signals are returned.
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'SheetBrain AI Studio API',
    // Publicly documented AWS project region — safe to expose.
    region: process.env.BEDROCK_REGION || 'ap-southeast-2',
    timestamp: new Date().toISOString(),
  });
}
