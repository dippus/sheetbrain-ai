import { NextRequest, NextResponse } from 'next/server';
import { invokeBedrockAgent } from '@/lib/aws/bedrock';
import { GOLDEN_TEMPLATES } from '@/lib/templates/goldenTemplates';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';
import { WorkbookModel, SheetColumn, SheetCell, ChartConfig } from '@/types/sheet';
import { logCloudWatchMetric } from '@/lib/aws/cloudwatch';

interface BedrockGeneratePayload {
  title?: string;
  description?: string;
  category?: string;
  columns?: SheetColumn[];
  cellData?: Record<string, SheetCell>;
  chartConfig?: ChartConfig;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const prompt = body.prompt?.trim() || '';

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Agent 1 & 2 System Prompt Contract (Schema Architect + Formula Compiler)
    const systemPrompt = `You are the Lead Data Architect & Formula Compiler for SheetBrain AI.
Analyze the user business prompt and generate a living, reactive spreadsheet workbook JSON.
Rules:
1. Return ONLY valid JSON adhering to the WorkbookModel schema.
2. Generate 5-10 realistic benchmark rows.
3. Every calculated summary cell MUST start with '=' and use uppercase standard formulas (e.g. =SUM(B2:B9), =(C2-B2)/B2).
4. ANTI-CIRCULAR GUARD: A cell must NEVER reference its own coordinate.
5. Provide a chartConfig with type ('line' or 'bar') and series mappings.
6. JSON Structure:
{
  "title": string,
  "description": string,
  "category": string,
  "columns": [{ "key": "A", "label": "Month", "type": "string", "width": 120 }, ...],
  "cellData": {
    "A1": { "v": "Month", "bold": true },
    "B1": { "v": "MRR", "bold": true },
    "A2": { "v": "Month 1" }, "B2": { "v": 15000 },
    "A10": { "v": "TOTAL", "bold": true },
    "B10": { "f": "=SUM(B2:B9)", "bold": true }
  },
  "chartConfig": {
    "type": "line",
    "title": "Title",
    "xAxisKey": "Month",
    "series": [{ "key": "MRR", "label": "MRR", "color": "#2563eb" }]
  }
}`;

    // Attempt cloud Bedrock generation
    const bedrockResult = await invokeBedrockAgent<BedrockGeneratePayload>({
      systemPrompt,
      userPrompt: prompt,
    });

    if (bedrockResult.data && bedrockResult.data.columns && bedrockResult.data.cellData) {
      // Recompute formulas deterministically
      const recomputedCells = recalculateWorkbook(bedrockResult.data.cellData);
      const generatedWorkbook: WorkbookModel = {
        id: `wb_${Date.now()}`,
        title: bedrockResult.data.title || 'Custom Generated Model',
        description: bedrockResult.data.description || prompt,
        category: bedrockResult.data.category || 'General',
        chartConfig: bedrockResult.data.chartConfig || {
          type: 'line',
          title: 'Financial Trend',
          xAxisKey: 'A',
          series: [{ key: 'B', label: 'Primary Series', color: '#2563eb' }],
        },
        sheets: [
          {
            id: 'sheet_1',
            name: 'Sheet1',
            rowCount: Object.keys(recomputedCells).length > 20 ? 25 : 15,
            columnCount: bedrockResult.data.columns.length,
            columns: bedrockResult.data.columns,
            cellData: recomputedCells,
          },
        ],
      };

      logCloudWatchMetric({
        operation: 'GenerateWorkbook',
        latencyMs: bedrockResult.latencyMs || (Date.now() - startTime),
        status: 'SUCCESS',
        isFallback: false,
      });

      return NextResponse.json({
        success: true,
        workbook: generatedWorkbook,
        source: 'bedrock',
        latencyMs: bedrockResult.latencyMs,
      });
    }

    // Smart Zero-Blank-Sheet Fallback Engine (Guarantees living, formula-driven model on any prompt)
    let baseTemplate = GOLDEN_TEMPLATES['saas_runway'];
    const pLower = prompt.toLowerCase();
    if (pLower.includes('git') || pLower.includes('commit') || pLower.includes('velocity') || pLower.includes('code')) {
      baseTemplate = GOLDEN_TEMPLATES['git_commits'];
    } else if (pLower.includes('dep') || pLower.includes('package') || pLower.includes('npm') || pLower.includes('dependenc')) {
      baseTemplate = GOLDEN_TEMPLATES['project_dependencies'];
    } else if (pLower.includes('sale') || pLower.includes('pipeline') || pLower.includes('quota') || pLower.includes('deal') || pLower.includes('commission')) {
      baseTemplate = GOLDEN_TEMPLATES['sales_pipeline'];
    } else {
      baseTemplate = GOLDEN_TEMPLATES['saas_runway'];
    }

    const elapsed = Date.now() - startTime;
    logCloudWatchMetric({
      operation: 'GenerateWorkbook',
      latencyMs: elapsed,
      status: 'SUCCESS',
      isFallback: true,
      metadata: { templateKey: baseTemplate.id },
    });

    return NextResponse.json({
      success: true,
      workbook: {
        ...baseTemplate,
        id: `wb_${Date.now()}`,
        title: prompt ? `${prompt.slice(0, 48)}` : baseTemplate.title,
        description: prompt || baseTemplate.description,
      },
      source: 'local_engine',
      latencyMs: bedrockResult.latencyMs || elapsed,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Generation failed';
    logCloudWatchMetric({
      operation: 'GenerateWorkbook',
      latencyMs: Date.now() - startTime,
      status: 'ERROR',
      metadata: { error: errorMsg },
    });
    console.error('[API /generate] Error:', err);
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

