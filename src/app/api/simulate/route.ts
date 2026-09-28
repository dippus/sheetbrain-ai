import { NextRequest, NextResponse } from 'next/server';
import { invokeBedrockAgent } from '@/lib/aws/bedrock';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hypothesis, sheet } = body;

    if (!hypothesis) {
      return NextResponse.json({ error: 'Hypothesis is required' }, { status: 400 });
    }

    const systemPrompt = `You are the What-If Sensitivity Simulation Agent for SheetBrain AI.
Analyze the user hypothesis against the current spreadsheet grid.
Identify driver cells and calculate modified values with delta percentages.
Return strict JSON:
{
  "scenario": string,
  "summary": string,
  "severity": "normal" | "warning" | "critical",
  "deltas": [
    { "cell": "D2", "multiplier": 1.25, "deltaPercent": "+25%" }
  ]
}`;

    const result = await invokeBedrockAgent<any>({
      systemPrompt,
      userPrompt: `Hypothesis: "${hypothesis}". Active columns: ${JSON.stringify(sheet?.columns || [])}`,
    });

    if (result.data) {
      return NextResponse.json({
        success: true,
        simulation: result.data,
        source: 'bedrock',
        latencyMs: result.latencyMs,
      });
    }

    // Local deterministic heuristic fallback
    const isIncrease = /increase|jump|rise|surge|more/i.test(hypothesis);
    const percentMatch = hypothesis.match(/(\d+)%/);
    const pct = percentMatch ? parseInt(percentMatch[1], 10) : 20;
    const mult = isIncrease ? 1 + pct / 100 : 1 - pct / 100;
    const sign = isIncrease ? '+' : '-';

    return NextResponse.json({
      success: true,
      simulation: {
        scenario: hypothesis,
        summary: `Driver metrics adjusted by ${sign}${pct}% based on sensitivity model.`,
        severity: isIncrease ? 'warning' : 'normal',
        deltas: [
          { cell: 'D2', multiplier: mult, deltaPercent: `${sign}${pct}%` },
        ],
      },
      source: 'local_deterministic_engine',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Simulation failed' }, { status: 500 });
  }
}
