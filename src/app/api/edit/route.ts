import { NextRequest, NextResponse } from 'next/server';
import { planEdit } from '@/lib/agents/editPlannerAgent';
import { applyEditPlan } from '@/lib/engine/editApplier';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';
import { logCloudWatchMetric } from '@/lib/aws/cloudwatch';
import { SheetData, WorkbookModel } from '@/types/sheet';
import {
  checkRateLimit,
  createRateLimitResponse,
  detectPromptInjection,
  isAllowedOrigin,
} from '@/lib/security/securityGuard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface EditRequestBody {
  instruction?: string;
  sheet?: SheetData;
  workbook?: WorkbookModel;
}

const MAX_INSTRUCTION_LENGTH = 600;

/**
 * Conversational cell editing.
 *
 * Complements /api/generate: instead of replacing the workbook, this applies a
 * validated operation list to the sheet the user is already looking at. The
 * model only plans; `applyEditPlan` writes every value.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  // 1. Cross-Origin CSRF Defense
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Untrusted cross-origin request.' },
      { status: 403 }
    );
  }

  // 2. Sliding Window Rate Limiting (30 requests/minute per client IP)
  const rateLimit = checkRateLimit(request, { limit: 30, windowMs: 60000, action: 'edit' });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  let body: EditRequestBody;
  try {
    body = (await request.json()) as EditRequestBody;
  } catch {
    return NextResponse.json({ success: false, error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction) {
    return NextResponse.json({ success: false, error: 'An instruction is required.' }, { status: 400 });
  }

  // 3. Adversarial Prompt Injection & Jailbreak Defense
  const promptSec = detectPromptInjection(instruction);
  if (!promptSec.isSafe) {
    return NextResponse.json(
      {
        success: false,
        error: `Security Alert: ${promptSec.reason}`,
      },
      { status: 400 }
    );
  }

  if (instruction.length > MAX_INSTRUCTION_LENGTH) {
    return NextResponse.json(
      { success: false, error: `Instruction is too long (max ${MAX_INSTRUCTION_LENGTH} characters).` },
      { status: 400 }
    );
  }

  const sheet = body.sheet;
  if (!sheet || !Array.isArray(sheet.columns) || typeof sheet.cellData !== 'object' || sheet.cellData === null) {
    return NextResponse.json(
      { success: false, error: 'A sheet with columns and cellData is required.' },
      { status: 400 }
    );
  }

  try {
    const { plan, isFallback, latencyMs: planLatency } = await planEdit(instruction, sheet);

    if (plan.ops.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'That instruction could not be mapped to a safe edit. Try naming a column and an action, for example "add 12 monthly dates in column B from 01-10-2005".',
        },
        { status: 422 }
      );
    }

    const applied = applyEditPlan(sheet, plan);

    // Keep dependent formulas consistent with the new cells.
    applied.sheet.cellData = recalculateWorkbook(applied.sheet.cellData);

    logCloudWatchMetric({
      operation: 'EditPlanner',
      latencyMs: planLatency,
      isFallback,
      status: 'SUCCESS',
      metadata: { opCount: plan.ops.length },
    });

    logCloudWatchMetric({
      operation: 'ApplyEditOperations',
      latencyMs: Date.now() - startedAt,
      isFallback,
      status: applied.skippedOps.length > 0 && applied.appliedOps === 0 ? 'ERROR' : 'SUCCESS',
      metadata: {
        appliedOps: applied.appliedOps,
        skippedOps: applied.skippedOps.length,
      },
    });

    return NextResponse.json({
      success: true,
      source: isFallback ? 'deterministic_edit_planner' : 'bedrock_edit_planner',
      sheet: applied.sheet,
      workbook: body.workbook
        ? {
            ...body.workbook,
            sheets: body.workbook.sheets.map(s => (s.id === applied.sheet.id ? applied.sheet : s)),
          }
        : undefined,
      appliedOps: applied.appliedOps,
      skippedOps: applied.skippedOps,
      summary: applied.summary,
      isFallback,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Edit failed unexpectedly.';
    logCloudWatchMetric({
      operation: 'ApplyEditOperations',
      latencyMs: Date.now() - startedAt,
      status: 'ERROR',
    });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
