import { invokeBedrockAgent } from '@/lib/aws/bedrock';
import { SheetColumn } from '@/types/sheet';
import { SchemaArchitectOutput } from './types';

interface BedrockSchemaPayload {
  title: string;
  category: string;
  description: string;
  columns: SheetColumn[];
  rawRows: Array<Record<string, number | string | boolean | undefined>>;
  domain?: string;
  hasTimeDimension?: boolean;
}

/**
 * 🏛️ AGENT 1: The Schema Architect
 * Responsibility: Deconstructs raw user intent into structured column definitions,
 * datatypes, column widths, and realistic benchmark data rows.
 * Does NOT generate formulas — focuses 100% on domain modeling accuracy.
 */
export async function executeSchemaArchitect(
  prompt: string
): Promise<{ output: SchemaArchitectOutput; isFallback: boolean; latencyMs: number }> {
  const startTime = Date.now();

  const systemPrompt = `You are AGENT 1: The Schema Architect for SheetBrain AI.
Your exclusive responsibility is data modeling and column architecture.
Analyze the user business prompt and output a structured spreadsheet schema with 6-10 realistic benchmark data rows.
STRICT RULES:
1. Do NOT write any Excel formulas (e.g. no '=SUM'). Only output clean, raw data values.
2. Provide realistic benchmark values (numbers, strings, dates).
3. Specify column datatypes accurately ('string' | 'number' | 'currency' | 'percentage' | 'date').
4. Return strict JSON adhering to:
{
  "title": string,
  "category": string,
  "description": string,
  "domain": string,
  "hasTimeDimension": boolean,
  "columns": [
    { "key": "A", "label": "Month", "type": "string", "width": 120 },
    { "key": "B", "label": "Revenue", "type": "currency", "width": 140 }
  ],
  "rawRows": [
    { "A": "Jan 2026", "B": 24000 },
    { "A": "Feb 2026", "B": 28500 }
  ]
}`;

  try {
    const bedrockResult = await invokeBedrockAgent<BedrockSchemaPayload>({
      systemPrompt,
      userPrompt: `Business Prompt: "${prompt}"`,
      maxTokens: 1800,
    });

    if (
      bedrockResult.data &&
      Array.isArray(bedrockResult.data.columns) &&
      bedrockResult.data.columns.length >= 2 &&
      Array.isArray(bedrockResult.data.rawRows) &&
      bedrockResult.data.rawRows.length > 0
    ) {
      return {
        output: {
          title: bedrockResult.data.title || 'Dynamic Operational Model',
          category: bedrockResult.data.category || 'Operations',
          description: bedrockResult.data.description || prompt,
          columns: bedrockResult.data.columns,
          rawRows: bedrockResult.data.rawRows,
          metadata: {
            domain: bedrockResult.data.domain || 'Business Intelligence',
            hasTimeDimension: bedrockResult.data.hasTimeDimension ?? true,
          },
        },
        isFallback: false,
        latencyMs: bedrockResult.latencyMs || Date.now() - startTime,
      };
    }
  } catch (error) {
    console.warn('[Agent 1: SchemaArchitect] Bedrock invocation note:', error);
  }

  // Deterministic Fallback: Domain Schema Synthesizer
  const fallbackOutput = synthesizeDeterministicSchema(prompt);
  return {
    output: fallbackOutput,
    isFallback: true,
    latencyMs: Date.now() - startTime,
  };
}

function synthesizeDeterministicSchema(prompt: string): SchemaArchitectOutput {
  const p = prompt.toLowerCase();

  // 1. SaaS / Financial Runway
  if (p.includes('saas') || p.includes('runway') || p.includes('mrr') || p.includes('arr') || p.includes('cashflow') || p.includes('burn')) {
    return {
      title: '12-Month SaaS Financial Runway & Unit Economics',
      category: 'Finance',
      description: 'Continuous 12-month runway projection with MRR, Churn, OPEX burn rate, and ending cash trajectory.',
      columns: [
        { key: 'A', label: 'Horizon Month', type: 'string', width: 140 },
        { key: 'B', label: 'Starting Cash', type: 'currency', width: 140 },
        { key: 'C', label: 'New ARR / MRR', type: 'currency', width: 140 },
        { key: 'D', label: 'OPEX & Salaries', type: 'currency', width: 140 },
        { key: 'E', label: 'Net Monthly Burn', type: 'currency', width: 140 },
        { key: 'F', label: 'Ending Cash Balance', type: 'currency', width: 150 },
        { key: 'G', label: 'Runway Months', type: 'number', width: 130 },
      ],
      rawRows: [
        { A: 'Month 1 (Jan)', B: 1200000, C: 45000, D: 85000, E: 40000, F: 1160000, G: 29.0 },
        { A: 'Month 2 (Feb)', B: 1160000, C: 52000, D: 88000, E: 36000, F: 1124000, G: 31.2 },
        { A: 'Month 3 (Mar)', B: 1124000, C: 61000, D: 92000, E: 31000, F: 1093000, G: 35.3 },
        { A: 'Month 4 (Apr)', B: 1093000, C: 71000, D: 95000, E: 24000, F: 1069000, G: 44.5 },
        { A: 'Month 5 (May)', B: 1069000, C: 83000, D: 99000, E: 16000, F: 1053000, G: 65.8 },
        { A: 'Month 6 (Jun)', B: 1053000, C: 96000, D: 104000, E: 8000, F: 1045000, G: 130.6 },
        { A: 'Month 7 (Jul)', B: 1045000, C: 110000, D: 108000, E: -2000, F: 1047000, G: 999.0 },
        { A: 'Month 8 (Aug)', B: 1047000, C: 126000, D: 112000, E: -14000, F: 1061000, G: 999.0 },
      ],
      metadata: { domain: 'SaaS Finance', hasTimeDimension: true },
    };
  }

  // 2. Payroll / Human Resources
  if (p.includes('payroll') || p.includes('salary') || p.includes('employee') || p.includes('compensation') || p.includes('wage')) {
    return {
      title: 'Enterprise Employee Payroll & Compensation Register',
      category: 'Human Resources',
      description: 'Departmental staff payroll register with statutory tax withholdings, healthcare deductions, and net disbursements.',
      columns: [
        { key: 'A', label: 'Employee Name', type: 'string', width: 160 },
        { key: 'B', label: 'Department', type: 'string', width: 130 },
        { key: 'C', label: 'Base Salary', type: 'currency', width: 130 },
        { key: 'D', label: 'Incentive Bonus', type: 'currency', width: 130 },
        { key: 'E', label: 'Tax Deductions', type: 'currency', width: 130 },
        { key: 'F', label: 'Net Pay', type: 'currency', width: 140 },
      ],
      rawRows: [
        { A: 'Alex Mercer (Staff)', B: 'Engineering', C: 9500, D: 1200, E: 2140, F: 8560 },
        { A: 'Priya Sharma (Lead)', B: 'Engineering', C: 11800, D: 1500, E: 2660, F: 10640 },
        { A: 'David Kim (Product)', B: 'Product', C: 9200, D: 1000, E: 2040, F: 8160 },
        { A: 'Elena Rostova (Dev)', B: 'Operations', C: 8400, D: 800, E: 1840, F: 7360 },
        { A: 'Marcus Vance (AE)', B: 'Sales', C: 7500, D: 3200, E: 2140, F: 8560 },
        { A: 'Sofia Chen (Design)', B: 'Design', C: 8900, D: 900, E: 1960, F: 7840 },
      ],
      metadata: { domain: 'HR & Payroll', hasTimeDimension: false },
    };
  }

  // 3. Healthcare / Clinical Billing
  if (p.includes('hospital') || p.includes('health') || p.includes('patient') || p.includes('clinic') || p.includes('medical') || p.includes('doctor')) {
    return {
      title: 'Clinical Patient Billing & Insurance Ledger',
      category: 'Healthcare',
      description: 'Hospital patient treatment admissions, procedure charges, insurance coverage settlements, and patient copay.',
      columns: [
        { key: 'A', label: 'Patient Record ID', type: 'string', width: 140 },
        { key: 'B', label: 'Specialty Dept', type: 'string', width: 130 },
        { key: 'C', label: 'Gross Treatment Bill', type: 'currency', width: 150 },
        { key: 'D', label: 'Insurance Approved', type: 'currency', width: 150 },
        { key: 'E', label: 'Patient Due (Copay)', type: 'currency', width: 140 },
      ],
      rawRows: [
        { A: 'HC-2026-081', B: 'Cardiology', C: 14500, D: 12325, E: 2175 },
        { A: 'HC-2026-082', B: 'Orthopedics', C: 9800, D: 8330, E: 1470 },
        { A: 'HC-2026-083', B: 'Neurology', C: 18200, D: 15470, E: 2730 },
        { A: 'HC-2026-084', B: 'Pediatrics', C: 3200, D: 2880, E: 320 },
        { A: 'HC-2026-085', B: 'Oncology', C: 26000, D: 22100, E: 3900 },
        { A: 'HC-2026-086', B: 'General Surgery', C: 11400, D: 9690, E: 1710 },
      ],
      metadata: { domain: 'Healthcare', hasTimeDimension: false },
    };
  }

  // 4. Default Enterprise Operational Horizon Model
  return {
    title: prompt.length > 40 ? `${prompt.slice(0, 37)}... Model` : `${prompt} Operational Model`,
    category: 'Operations',
    description: `Multi-horizon operational dataset structured for: "${prompt}".`,
    columns: [
      { key: 'A', label: 'Period / Segment', type: 'string', width: 150 },
      { key: 'B', label: 'Target Metric', type: 'currency', width: 140 },
      { key: 'C', label: 'Operating Cost', type: 'currency', width: 140 },
      { key: 'D', label: 'Net Efficiency', type: 'currency', width: 140 },
      { key: 'E', label: 'Growth Margin', type: 'percentage', width: 130 },
    ],
    rawRows: [
      { A: 'Horizon Q1', B: 65000, C: 42000, D: 23000, E: 0.35 },
      { A: 'Horizon Q2', B: 78000, C: 46000, D: 32000, E: 0.41 },
      { A: 'Horizon Q3', B: 92000, C: 51000, D: 41000, E: 0.45 },
      { A: 'Horizon Q4', B: 110000, C: 58000, D: 52000, E: 0.47 },
      { A: 'Horizon Q5', B: 128000, C: 64000, D: 64000, E: 0.50 },
      { A: 'Horizon Q6', B: 146000, C: 71000, D: 75000, E: 0.51 },
    ],
    metadata: { domain: 'General Business Intelligence', hasTimeDimension: true },
  };
}
