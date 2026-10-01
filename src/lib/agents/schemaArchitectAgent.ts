import { invokeBedrockAgent } from '@/lib/aws/bedrock';
import { SheetColumn } from '@/types/sheet';
import { SchemaArchitectOutput } from './types';

interface BedrockSchemaPayload {
  title?: string;
  category?: string;
  description?: string;
  columns?: Array<SheetColumn | string | { name?: string; label?: string; type?: string; width?: number; key?: string }>;
  rawRows?: Array<Record<string, number | string | boolean | undefined> | Array<number | string | boolean | undefined>>;
  domain?: string;
  hasTimeDimension?: boolean;
}

/**
 * Normalizes any variation of Bedrock LLM output (keys, labels, strings, arrays of arrays)
 * into strict, predictable SheetColumn[] and rawRows with 'A', 'B', 'C' coordinates.
 */
function normalizeAiSchema(data: BedrockSchemaPayload, userPrompt: string): SchemaArchitectOutput | null {
  if (!data || !Array.isArray(data.columns) || data.columns.length < 2) {
    return null;
  }

  // 1. Normalize Columns
  const normalizedColumns: SheetColumn[] = data.columns.map((rawCol, idx) => {
    const key = String.fromCharCode(65 + idx); // A, B, C, D...
    let label = '';
    let type: 'string' | 'number' | 'currency' | 'percentage' | 'date' = 'string';
    let width = 140;

    if (typeof rawCol === 'string') {
      label = rawCol;
    } else if (typeof rawCol === 'object' && rawCol !== null) {
      label = rawCol.label || (rawCol as { name?: string }).name || `Column ${key}`;
      if (rawCol.type && ['string', 'number', 'currency', 'percentage', 'date'].includes(rawCol.type)) {
        type = rawCol.type as 'string' | 'number' | 'currency' | 'percentage' | 'date';
      }
      if (rawCol.width && typeof rawCol.width === 'number') {
        width = rawCol.width;
      }
    } else {
      label = `Column ${key}`;
    }

    // Heuristic Type Inference based on column semantic label
    const lowerLabel = label.toLowerCase();
    if (/percentage|percent|margin|rate|ratio|ctr|share|%|roi/i.test(lowerLabel)) {
      type = 'percentage';
    } else if (/cost|price|revenue|salary|burn|cash|arr|mrr|bill|copay|rent|deposit|fee|spend|budget|pnl|profit|val/i.test(lowerLabel)) {
      type = 'currency';
    } else if (/mark|score|total|count|quantity|qty|point|unit|grade|hour|day|credit|gpa|rank|id|no|num|duration|calorie|heart/i.test(lowerLabel)) {
      type = 'number';
    }

    return { key, label, type, width };
  });

  // 2. Normalize Raw Rows
  const rawRowsInput = Array.isArray(data.rawRows) ? data.rawRows : [];
  if (rawRowsInput.length === 0) return null;

  const normalizedRows: Array<Record<string, number | string | boolean | undefined>> = [];

  rawRowsInput.forEach(rowItem => {
    const rowObj: Record<string, number | string | boolean | undefined> = {};

    if (Array.isArray(rowItem)) {
      // Row is an array: [val0, val1, val2]
      rowItem.forEach((val, idx) => {
        if (idx < normalizedColumns.length) {
          const colKey = normalizedColumns[idx].key;
          rowObj[colKey] = val;
        }
      });
    } else if (typeof rowItem === 'object' && rowItem !== null) {
      // Row is an object. Might be keyed by 'A', 'B' or by column labels
      normalizedColumns.forEach((col, idx) => {
        if (rowItem[col.key] !== undefined) {
          rowObj[col.key] = rowItem[col.key];
        } else if (rowItem[col.label] !== undefined) {
          rowObj[col.key] = rowItem[col.label];
        } else {
          // Check by case-insensitive key or original column index
          const foundEntry = Object.entries(rowItem).find(
            ([k]) => k.toLowerCase() === col.label.toLowerCase() || k.toLowerCase() === col.key.toLowerCase()
          );
          if (foundEntry) {
            rowObj[col.key] = foundEntry[1];
          } else {
            const values = Object.values(rowItem);
            if (idx < values.length) {
              rowObj[col.key] = values[idx] as number | string | boolean | undefined;
            }
          }
        }
      });
    }

    if (Object.keys(rowObj).length > 0) {
      normalizedRows.push(rowObj);
    }
  });

  if (normalizedRows.length === 0) return null;

  return {
    title: data.title || userPrompt.slice(0, 45),
    category: data.category || 'Domain Model',
    description: data.description || userPrompt,
    columns: normalizedColumns,
    rawRows: normalizedRows,
    metadata: {
      domain: data.domain || 'Operational Intelligence',
      hasTimeDimension: data.hasTimeDimension ?? false,
    },
  };
}

/**
 * 🏛️ AGENT 1: The Schema Architect
 * Responsibility: Deconstructs raw user intent into structured column definitions,
 * datatypes, column widths, and realistic benchmark data rows.
 * Focuses 100% on domain modeling accuracy.
 */
export async function executeSchemaArchitect(
  prompt: string
): Promise<{ output: SchemaArchitectOutput; isFallback: boolean; latencyMs: number }> {
  const startTime = Date.now();

  const systemPrompt = `You are AGENT 1: The Schema Architect for SheetBrain AI.
Your exclusive responsibility is data modeling and column architecture.
Analyze the user prompt and output a structured spreadsheet schema with 6-8 realistic benchmark data rows.

STRICT INSTRUCTIONS:
1. Match the EXACT real-world domain of the user request (e.g., student gradebook -> student names, real subjects, marks 0-100; hospital -> patient names, diagnoses, bills; ecommerce -> orders, customers, units).
2. Do NOT write formula strings (e.g. no '=SUM'). Only output clean, raw data values.
3. Specify column datatypes accurately ('string' | 'number' | 'currency' | 'percentage' | 'date').

HARD SIZE BUDGET (exceeding it truncates the response and forces a fallback):
4. EXACTLY 6 columns and EXACTLY 6 data rows.
5. Every string value under 40 characters. Numbers plain: no thousands separators, no currency symbols.
6. No prose, no commentary, no markdown fences. Emit the JSON object only.

4. Return strict JSON adhering to:
{
  "title": string,
  "category": string,
  "description": string,
  "domain": string,
  "hasTimeDimension": boolean,
  "columns": [
    { "key": "A", "label": "Roll No", "type": "string", "width": 110 },
    { "key": "B", "label": "Student Name", "type": "string", "width": 160 },
    { "key": "C", "label": "Database Systems", "type": "number", "width": 130 }
  ],
  "rawRows": [
    { "A": "BCA-501", "B": "Aarav Sharma", "C": 88 },
    { "A": "BCA-502", "B": "Priya Patel", "C": 94 }
  ]
}`;

  try {
    const bedrockResult = await invokeBedrockAgent<BedrockSchemaPayload>({
      systemPrompt,
      userPrompt: `Dataset Intent: "${prompt}"`,
      // 6 columns x 6 rows of compact JSON comfortably fits this ceiling, and a
      // smaller budget measurably reduces time-to-first-token on the endpoint.
      maxTokens: 800,
      // Semantic domain modelling is the one stage that genuinely requires a
      // foundation model, so it gets the largest share of the latency budget.
      // The endpoint's response time varies from ~4s to well over 40s, so this
      // ceiling keeps a slow queue from stalling the whole pipeline.
      timeoutMs: 30000,
    });

    if (bedrockResult.data) {
      const normalized = normalizeAiSchema(bedrockResult.data, prompt);
      if (normalized) {
        return {
          output: normalized,
          isFallback: false,
          latencyMs: bedrockResult.latencyMs || Date.now() - startTime,
        };
      }
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

/**
 * Word-boundary keyword test for template routing.
 *
 * Plain `includes` caused real misroutes: "inventory stock reorder dashboard"
 * contains the substring "order", so the e-commerce branch matched first and
 * the inventory branch never ran. Matching whole words only keeps "reorder"
 * from being read as "order" while still matching "order management".
 */
function hasKeyword(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(haystack);
}

export function synthesizeDeterministicSchema(prompt: string): SchemaArchitectOutput {
  const p = prompt.toLowerCase();

  // 1. Education / Student Gradebook / Academic Marksheet (BCA, Semester, School, Exam, College, Marks)
  if (
    p.includes('student') ||
    p.includes('grade') ||
    p.includes('bca') ||
    p.includes('semester') ||
    p.includes('marks') ||
    p.includes('school') ||
    p.includes('college') ||
    p.includes('exam') ||
    p.includes('class') ||
    p.includes('university') ||
    p.includes('academic') ||
    p.includes('report card') ||
    p.includes('cgpa') ||
    p.includes('gpa')
  ) {
    const isBCA = p.includes('bca') || p.includes('sem');
    const title = isBCA ? 'BCA Semester 5 Student Academic Gradebook & Results' : 'Student Academic Gradebook & Performance Register';

    return {
      title,
      category: 'Education',
      description: 'Comprehensive student academic performance record with subject marks, aggregate score, percentage, and letter grades.',
      columns: [
        { key: 'A', label: 'Roll No', type: 'string', width: 110 },
        { key: 'B', label: 'Student Name', type: 'string', width: 160 },
        { key: 'C', label: 'Database Systems (DBMS)', type: 'number', width: 160 },
        { key: 'D', label: 'Web Technologies', type: 'number', width: 150 },
        { key: 'E', label: 'Software Engineering', type: 'number', width: 160 },
        { key: 'F', label: 'Python Programming', type: 'number', width: 150 },
        { key: 'G', label: 'Total Marks (400)', type: 'number', width: 140 },
        { key: 'H', label: 'Percentage', type: 'percentage', width: 130 },
        { key: 'I', label: 'Final Grade', type: 'string', width: 110 },
        { key: 'J', label: 'Academic Status', type: 'string', width: 130 },
      ],
      rawRows: [
        { A: 'BCA-501', B: 'Aarav Sharma', C: 88, D: 92, E: 85, F: 90, G: 355, H: 0.888, I: 'A+', J: 'Distinction' },
        { A: 'BCA-502', B: 'Priya Patel', C: 94, D: 91, E: 89, F: 95, G: 369, H: 0.923, I: 'A+', J: 'Distinction' },
        { A: 'BCA-503', B: 'Rohan Verma', C: 72, D: 68, E: 75, F: 70, G: 285, H: 0.713, I: 'A', J: 'First Class' },
        { A: 'BCA-504', B: 'Sneha Rao', C: 81, D: 85, E: 78, F: 84, G: 328, H: 0.820, I: 'A', J: 'First Class' },
        { A: 'BCA-505', B: 'Vikram Malhotra', C: 65, D: 70, E: 62, F: 68, G: 265, H: 0.663, I: 'B', J: 'Second Class' },
        { A: 'BCA-506', B: 'Ananya Iyer', C: 91, D: 95, E: 93, F: 96, G: 375, H: 0.938, I: 'A+', J: 'Distinction' },
        { A: 'BCA-507', B: 'Rahul Deshmukh', C: 58, D: 62, E: 55, F: 60, G: 235, H: 0.588, I: 'B', J: 'Second Class' },
      ],
      metadata: { domain: 'Education & Academics', hasTimeDimension: false },
    };
  }

  // 2. SaaS / Financial Runway
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
        { A: 'Month 1 (Jan)',  B: 1200000, C: 45000,  D: 85000,  E: 40000,  F: 1160000, G: 29.0 },
        { A: 'Month 2 (Feb)',  B: 1160000, C: 52000,  D: 88000,  E: 36000,  F: 1124000, G: 31.2 },
        { A: 'Month 3 (Mar)',  B: 1124000, C: 61000,  D: 92000,  E: 31000,  F: 1093000, G: 35.3 },
        { A: 'Month 4 (Apr)',  B: 1093000, C: 71000,  D: 95000,  E: 24000,  F: 1069000, G: 44.5 },
        { A: 'Month 5 (May)',  B: 1069000, C: 83000,  D: 99000,  E: 16000,  F: 1053000, G: 65.8 },
        { A: 'Month 6 (Jun)',  B: 1053000, C: 96000,  D: 104000, E: 8000,   F: 1045000, G: 130.6 },
        { A: 'Month 7 (Jul)',  B: 1045000, C: 110000, D: 108000, E: -2000,  F: 1047000, G: 999.0 },
        { A: 'Month 8 (Aug)',  B: 1047000, C: 126000, D: 112000, E: -14000, F: 1061000, G: 999.0 },
        { A: 'Month 9 (Sep)',  B: 1061000, C: 143000, D: 116000, E: -27000, F: 1088000, G: 999.0 },
        { A: 'Month 10 (Oct)', B: 1088000, C: 162000, D: 120000, E: -42000, F: 1130000, G: 999.0 },
        { A: 'Month 11 (Nov)', B: 1130000, C: 183000, D: 125000, E: -58000, F: 1188000, G: 999.0 },
        { A: 'Month 12 (Dec)', B: 1188000, C: 206000, D: 130000, E: -76000, F: 1264000, G: 999.0 },
      ],
      metadata: { domain: 'SaaS Finance', hasTimeDimension: true },
    };
  }

  // 3. Payroll / Human Resources
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

  // 4. Healthcare / Clinical Billing
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

  // 5. E-Commerce & Retail Orders / Sales
  if (hasKeyword(p, 'order') || hasKeyword(p, 'orders') || hasKeyword(p, 'sales') || hasKeyword(p, 'store') || hasKeyword(p, 'ecommerce') || hasKeyword(p, 'product') || hasKeyword(p, 'customer') || hasKeyword(p, 'cart')) {
    return {
      title: 'E-Commerce Customer Order & Fulfillment Register',
      category: 'Sales',
      description: 'Live order transaction log tracking customer purchases, units, discounts, and realized net revenue.',
      columns: [
        { key: 'A', label: 'Order ID', type: 'string', width: 120 },
        { key: 'B', label: 'Customer Name', type: 'string', width: 150 },
        { key: 'C', label: 'Product Category', type: 'string', width: 140 },
        { key: 'D', label: 'Units Sold', type: 'number', width: 110 },
        { key: 'E', label: 'Unit Price', type: 'currency', width: 120 },
        { key: 'F', label: 'Gross Revenue', type: 'currency', width: 140 },
        { key: 'G', label: 'Discount', type: 'currency', width: 120 },
        { key: 'H', label: 'Net Revenue', type: 'currency', width: 140 },
      ],
      rawRows: [
        { A: 'ORD-9021', B: 'Rohan Mehra', C: 'Electronics', D: 2, E: 450, F: 900, G: 50, H: 850 },
        { A: 'ORD-9022', B: 'Alisha Khan', C: 'Smart Home', D: 1, E: 280, F: 280, G: 0, H: 280 },
        { A: 'ORD-9023', B: 'Devendra Rao', C: 'Accessories', D: 5, E: 45, F: 225, G: 25, H: 200 },
        { A: 'ORD-9024', B: 'Kavita Singh', C: 'Computing', D: 1, E: 1200, F: 1200, G: 100, H: 1100 },
        { A: 'ORD-9025', B: 'Arjun Das', C: 'Electronics', D: 3, E: 310, F: 930, G: 80, H: 850 },
        { A: 'ORD-9026', B: 'Simran Bajaj', C: 'Audio', D: 2, E: 180, F: 360, G: 30, H: 330 },
      ],
      metadata: { domain: 'E-Commerce & Sales', hasTimeDimension: false },
    };
  }

  // 6. Project Management & Agile Sprint
  if (p.includes('project') || p.includes('task') || p.includes('sprint') || p.includes('jira') || p.includes('agile') || p.includes('bug') || p.includes('scrum')) {
    return {
      title: 'Agile Sprint Delivery & Task Velocity Board',
      category: 'Project Management',
      description: 'Engineering sprint tracking board with story points, estimated vs actual hours, and delivery status.',
      columns: [
        { key: 'A', label: 'Task Key', type: 'string', width: 110 },
        { key: 'B', label: 'Task Summary', type: 'string', width: 200 },
        { key: 'C', label: 'Assignee', type: 'string', width: 140 },
        { key: 'D', label: 'Story Points', type: 'number', width: 110 },
        { key: 'E', label: 'Estimated Hours', type: 'number', width: 130 },
        { key: 'F', label: 'Actual Hours', type: 'number', width: 120 },
        { key: 'G', label: 'Hour Variance', type: 'number', width: 120 },
        { key: 'H', label: 'Sprint Status', type: 'string', width: 120 },
      ],
      rawRows: [
        { A: 'ENG-101', B: 'Auth0 SSO Integration', C: 'Vikram S.', D: 5, E: 24, F: 20, G: -4, H: 'Done' },
        { A: 'ENG-102', B: 'HyperFormula v3 Upgrade', C: 'Priya K.', D: 8, E: 36, F: 42, G: 6, H: 'Review' },
        { A: 'ENG-103', B: 'S3 Multi-Region Failover', C: 'Alex M.', D: 5, E: 20, F: 18, G: -2, H: 'Done' },
        { A: 'ENG-104', B: 'Mobile Touch Responsiveness', C: 'Sofia C.', D: 3, E: 16, F: 14, G: -2, H: 'Done' },
        { A: 'ENG-105', B: 'Real-time WebSocket Sync', C: 'David K.', D: 13, E: 48, F: 52, G: 4, H: 'In Progress' },
        { A: 'ENG-106', B: 'PDF Export Quality Fix', C: 'Elena R.', D: 2, E: 10, F: 8, G: -2, H: 'Done' },
      ],
      metadata: { domain: 'Project Management', hasTimeDimension: false },
    };
  }

  // 7. Inventory & Supply Chain
  if (p.includes('inventory') || p.includes('stock') || p.includes('sku') || p.includes('warehouse') || p.includes('supply')) {
    return {
      title: 'Warehouse Inventory Stock & Reorder Tracker',
      category: 'Inventory',
      description: 'Physical inventory management register with stock levels, unit valuation, and automated reorder alerts.',
      columns: [
        { key: 'A', label: 'SKU Code', type: 'string', width: 120 },
        { key: 'B', label: 'Product Name', type: 'string', width: 170 },
        { key: 'C', label: 'Category', type: 'string', width: 130 },
        { key: 'D', label: 'In-Stock Units', type: 'number', width: 120 },
        { key: 'E', label: 'Unit Cost', type: 'currency', width: 120 },
        { key: 'F', label: 'Total Valuation', type: 'currency', width: 140 },
        { key: 'G', label: 'Reorder Level', type: 'number', width: 120 },
        { key: 'H', label: 'Stock Status', type: 'string', width: 120 },
      ],
      rawRows: [
        { A: 'SKU-001', B: 'Ergonomic Desk Chair', C: 'Furniture', D: 45, E: 120, F: 5400, G: 20, H: 'Adequate' },
        { A: 'SKU-002', B: 'Standing Desk Frame', C: 'Furniture', D: 18, E: 260, F: 4680, G: 25, H: 'Reorder Due' },
        { A: 'SKU-003', B: '4K Monitor 27-inch', C: 'Electronics', D: 32, E: 320, F: 10240, G: 15, H: 'Adequate' },
        { A: 'SKU-004', B: 'Mechanical Keyboard', C: 'Peripherals', D: 75, E: 55, F: 4125, G: 30, H: 'Adequate' },
        { A: 'SKU-005', B: 'USB-C Docking Station', C: 'Peripherals', D: 12, E: 85, F: 1020, G: 20, H: 'Low Stock' },
        { A: 'SKU-006', B: 'Noise Cancelling Headset', C: 'Audio', D: 60, E: 95, F: 5700, G: 25, H: 'Adequate' },
      ],
      metadata: { domain: 'Inventory & Supply Chain', hasTimeDimension: false },
    };
  }

  // 8. Smart Dynamic Generator for any custom prompt:
  // Instead of a generic financial template with "Target Metric ($1.2M)",
  // parse the prompt words to generate contextual columns and realistic numbers.
  const cleanedTitle = prompt.length > 45 ? `${prompt.slice(0, 42)}...` : prompt;
  const isFinance = /finance|revenue|profit|margin|money|fund|expense|investment|crypto/i.test(p);

  return {
    title: `${cleanedTitle} Matrix`,
    category: isFinance ? 'Finance' : 'Operations',
    description: `Structured dynamic dataset compiled for: "${prompt}".`,
    columns: [
      { key: 'A', label: 'Item / Record', type: 'string', width: 150 },
      { key: 'B', label: isFinance ? 'Primary Volume' : 'Recorded Observation', type: isFinance ? 'currency' : 'number', width: 160 },
      { key: 'C', label: isFinance ? 'Operational Cost' : 'Secondary Benchmark', type: isFinance ? 'currency' : 'number', width: 160 },
      { key: 'D', label: isFinance ? 'Net Differential' : 'Performance Variance', type: isFinance ? 'currency' : 'number', width: 160 },
      { key: 'E', label: 'Efficiency Ratio', type: 'percentage', width: 130 },
    ],
    rawRows: [
      { A: 'Observation Alpha', B: isFinance ? 45000 : 185, C: isFinance ? 28000 : 120, D: isFinance ? 17000 : 65, E: 0.38 },
      { A: 'Observation Beta', B: isFinance ? 62000 : 210, C: isFinance ? 35000 : 145, D: isFinance ? 27000 : 65, E: 0.44 },
      { A: 'Observation Gamma', B: isFinance ? 78000 : 260, C: isFinance ? 41000 : 160, D: isFinance ? 37000 : 100, E: 0.47 },
      { A: 'Observation Delta', B: isFinance ? 94000 : 310, C: isFinance ? 49000 : 190, D: isFinance ? 45000 : 120, E: 0.48 },
      { A: 'Observation Epsilon', B: isFinance ? 112000 : 380, C: isFinance ? 56000 : 210, D: isFinance ? 56000 : 170, E: 0.50 },
      { A: 'Observation Zeta', B: isFinance ? 135000 : 440, C: isFinance ? 64000 : 230, D: isFinance ? 71000 : 210, E: 0.53 },
    ],
    metadata: { domain: isFinance ? 'Financial Analysis' : 'General Operational Intelligence', hasTimeDimension: false },
  };
}

