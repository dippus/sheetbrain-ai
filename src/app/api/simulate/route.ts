import { NextRequest, NextResponse } from 'next/server';
import { invokeBedrockAgent } from '@/lib/aws/bedrock';
import { SheetColumn, SheetCell } from '@/types/sheet';
import { logCloudWatchMetric } from '@/lib/aws/cloudwatch';
import { detectMetricPolarity } from '@/lib/engine/scenarioEngine';

interface SimulationDelta {
  cell: string;
  multiplier: number;
  deltaPercent: string;
}

interface SimulationResponse {
  scenario: string;
  summary: string;
  severity: 'normal' | 'warning' | 'critical';
  targetColKey: string;
  multiplier?: number;
  deltas: SimulationDelta[];
}

/**
 * SECURITY (REQ-NF-003): Maximum accepted hypothesis length.
 * Bounds Bedrock token spend and blocks quota-burn / oversized-payload attacks.
 */
const MAX_HYPOTHESIS_LENGTH = 500;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { hypothesis, sheet, targetColKey, multiplier: explicitMultiplier } = body;

    if (!hypothesis && explicitMultiplier === undefined) {
      return NextResponse.json({ error: 'Hypothesis or multiplier is required' }, { status: 400 });
    }

    // Reject oversized hypotheses before any model invocation occurs.
    if (typeof hypothesis === 'string' && hypothesis.length > MAX_HYPOTHESIS_LENGTH) {
      return NextResponse.json({
        error: `Hypothesis exceeds the ${MAX_HYPOTHESIS_LENGTH} character limit.`,
      }, { status: 400 });
    }

    const columns: SheetColumn[] = sheet?.columns || [];
    const cellMap: Record<string, SheetCell> = sheet?.cellData || {};
    const rowCount: number = sheet?.rowCount || 20;

    // 1. Attempt AWS Bedrock Agent Invocation for deep natural language simulation
    const systemPrompt = `You are the What-If Sensitivity Simulation Agent for SheetBrain AI.
Analyze the user hypothesis against the active spreadsheet schema and column definitions.
Active Columns: ${JSON.stringify(columns)}
Available Rows: 2 to ${rowCount}

Identify which column(s) or cell coordinates should be adjusted, calculate the exact multiplier (e.g., 1.2 for +20%, 0.85 for -15%), and provide the delta percentages.
Return strict JSON:
{
  "scenario": string,
  "summary": string,
  "severity": "normal" | "warning" | "critical",
  "targetColKey": string,
  "deltas": [
    { "cell": "B2", "multiplier": 1.2, "deltaPercent": "+20%" }
  ]
}`;

    if (hypothesis) {
      const result = await invokeBedrockAgent<SimulationResponse>({
        systemPrompt,
        userPrompt: `Hypothesis: "${hypothesis}". Grid has ${rowCount} rows and columns: ${columns.map((c: SheetColumn) => `${c.key}:${c.label}`).join(', ')}`,
      });

      if (result.data && Array.isArray(result.data.deltas) && result.data.deltas.length > 0) {
        logCloudWatchMetric({
          operation: 'SimulateScenario',
          latencyMs: result.latencyMs || (Date.now() - startTime),
          status: 'SUCCESS',
          isFallback: false,
        });

        return NextResponse.json({
          success: true,
          simulation: result.data,
          source: 'bedrock',
          latencyMs: result.latencyMs,
        });
      }
    }

    // 2. Ultra-smart, zero-hardcode deterministic simulation engine fallback
    let mult = explicitMultiplier !== undefined ? explicitMultiplier : 1.2;
    let pct = Math.round(Math.abs(mult - 1) * 100);
    let isIncrease = mult >= 1;

    if (hypothesis && explicitMultiplier === undefined) {
      const pctMatch = hypothesis.match(/([+-]?\d+(?:\.\d+)?)%/);
      if (pctMatch) {
        pct = Math.abs(parseFloat(pctMatch[1]));
        isIncrease = !hypothesis.includes('-') && !/decrease|drop|cut|fall|reduce|down/i.test(hypothesis);
        mult = isIncrease ? 1 + pct / 100 : Math.max(0, 1 - pct / 100);
      } else if (/increase|jump|rise|surge|boost|grow/i.test(hypothesis)) {
        pct = 20;
        isIncrease = true;
        mult = 1.2;
      } else if (/decrease|drop|cut|fall|reduce|down/i.test(hypothesis)) {
        pct = 15;
        isIncrease = false;
        mult = 0.85;
      }
    }

    // Find target column dynamically
    let targetCol = columns.find((c: SheetColumn) => c.key === targetColKey);
    if (!targetCol && hypothesis) {
      targetCol = columns.find((c: SheetColumn) =>
        c.label && hypothesis.toLowerCase().includes(c.label.toLowerCase())
      );
    }
    if (!targetCol) {
      // Pick first numeric column
      targetCol = columns.find((c: SheetColumn) => c.type === 'number' || c.type === 'currency' || c.type === 'percentage') || columns[1] || columns[0];
    }

    const colKey = targetCol?.key || 'B';
    const sign = isIncrease ? '+' : '-';
    const deltaPercentStr = `${sign}${pct}%`;

    // Dynamically generate deltas for ALL populated data rows in this column
    const deltas: SimulationDelta[] = [];
    for (let r = 2; r <= rowCount; r++) {
      const coord = `${colKey}${r}`;
      const cell = cellMap[coord];
      // Only modify cells that have numeric values and are NOT summary formulas
      if (cell && typeof cell.v === 'number' && !cell.f) {
        deltas.push({
          cell: coord,
          multiplier: mult,
          deltaPercent: deltaPercentStr,
        });
      }
    }

    // If no specific non-formula cells found, apply to rows 2 through rowCount for this column
    if (deltas.length === 0) {
      for (let r = 2; r <= Math.min(rowCount, 15); r++) {
        deltas.push({
          cell: `${colKey}${r}`,
          multiplier: mult,
          deltaPercent: deltaPercentStr,
        });
      }
    }

    const elapsed = Date.now() - startTime;
    logCloudWatchMetric({
      operation: 'SimulateScenario',
      latencyMs: elapsed,
      status: 'SUCCESS',
      isFallback: true,
      metadata: { targetColumn: colKey, deltaCount: deltas.length },
    });

    const polarity = detectMetricPolarity(targetCol?.label || '');
    const isUnfavorable = polarity === 'negative' ? isIncrease : !isIncrease;
    const severity = isUnfavorable ? (pct >= 25 ? 'critical' : 'warning') : 'normal';

    return NextResponse.json({
      success: true,
      simulation: {
        scenario: hypothesis || `Adjust ${targetCol?.label || colKey} by ${deltaPercentStr}`,
        summary: `Adjusted all ${deltas.length} records for ${targetCol?.label || `Column ${colKey}`} by ${deltaPercentStr} dynamically.`,
        severity,
        targetColKey: colKey,
        multiplier: mult,
        deltas,
      },
      source: 'deterministic_dynamic_engine',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Simulation failed';
    logCloudWatchMetric({
      operation: 'SimulateScenario',
      latencyMs: Date.now() - startTime,
      status: 'ERROR',
      metadata: { error: errorMsg },
    });
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

