import { NextRequest, NextResponse } from 'next/server';
import { executeMultiAgentPipeline } from '@/lib/agents/orchestrator';
import { logCloudWatchMetric } from '@/lib/aws/cloudwatch';
import {
  checkRateLimit,
  createRateLimitResponse,
  detectPromptInjection,
  isAllowedOrigin,
} from '@/lib/security/securityGuard';

/**
 * SECURITY (REQ-NF-003): Maximum accepted prompt length.
 * Bounds Bedrock token spend and blocks quota-burn / oversized-payload attacks.
 */
const MAX_PROMPT_LENGTH = 500;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // 1. Cross-Origin CSRF Defense
  if (!isAllowedOrigin(req)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Untrusted cross-origin request.' },
      { status: 403 }
    );
  }

  // 2. In-Memory Sliding Window Rate Limiting (30 requests/minute per client IP)
  const rateLimit = checkRateLimit(req, { limit: 30, windowMs: 60000, action: 'generate' });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  try {
    const body = await req.json();
    const prompt = body.prompt?.trim() || '';

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // 3. Adversarial Prompt Injection & Jailbreak Defense
    const promptSec = detectPromptInjection(prompt);
    if (!promptSec.isSafe) {
      return NextResponse.json(
        {
          success: false,
          error: `Security Alert: ${promptSec.reason}`,
        },
        { status: 400 }
      );
    }

    const GREETINGS = ['hello', 'hi', 'hey', 'hii', 'helloo', 'good morning', 'good evening', 'test', 'testing', 'asdf', 'ok', 'okay', 'bye'];
    const pClean = prompt.trim().toLowerCase();
    if (GREETINGS.includes(pClean) || pClean.length < 4) {
      return NextResponse.json({
        success: false,
        error: "Please enter a specific spreadsheet prompt (e.g. '12-Month SaaS Financial Runway', 'Employee Payroll Register', 'Hospital Patient Billing').",
      }, { status: 400 });
    }

    // Reject oversized prompts before any model invocation occurs.
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({
        success: false,
        error: `Prompt exceeds the ${MAX_PROMPT_LENGTH} character limit. Please shorten your description.`,
      }, { status: 400 });
    }

    // 🚀 Execute 4-Stage Autonomous Multi-Agent Pipeline
    // Stage 1: Agent 1 (Schema Architect) -> Schema & Rows
    // Stage 2: Agent 2 (Formula Compiler) -> Formulas & Math Relationships
    // Stage 3: Agent 3 (Visual Analytics) -> Chart Configuration
    // Stage 4: Agent 4 (Deterministic Engine) -> HyperFormula Verification
    const pipelineResult = await executeMultiAgentPipeline(prompt);

    return NextResponse.json({
      success: true,
      workbook: pipelineResult.workbook,
      trace: pipelineResult.trace,
      source: pipelineResult.source,
      latencyMs: pipelineResult.trace.totalLatencyMs,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Multi-agent pipeline generation failed';
    logCloudWatchMetric({
      operation: 'GenerateWorkbook',
      latencyMs: Date.now() - startTime,
      status: 'ERROR',
      metadata: { error: errorMsg },
    });
    console.error('[API /generate] Multi-Agent Pipeline Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        source: 'error',
      },
      { status: 500 }
    );
  }
}
