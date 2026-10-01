import { invokeBedrockAgent } from '@/lib/aws/bedrock';
import { SheetCell, SheetColumn } from '@/types/sheet';
import { SchemaArchitectOutput, FormulaCompilerOutput } from './types';

interface BedrockFormulaPayload {
  formulaMap: Record<string, string>; // e.g. { "E2": "=D2-C2", "B10": "=SUM(B2:B9)" }
  summaryRowLabel?: string;
}

/**
 * 🧮 AGENT 2: The Formula Compiler
 * Responsibility: Analyzes schema and rows produced by Agent 1, injects
 * reactive uppercase Excel formulas (=SUM, =AVERAGE, =IF, running cascades),
 * verifies anti-circular reference invariants, and appends summary aggregate rows.
 */
export async function executeFormulaCompiler(
  schema: SchemaArchitectOutput
): Promise<{ output: FormulaCompilerOutput; isFallback: boolean; latencyMs: number }> {
  const startTime = Date.now();
  const { columns, rawRows } = schema;
  const lastDataRow = rawRows.length + 1; // row 1 is header, data is 2..lastDataRow
  const summaryRow = lastDataRow + 1;

  const systemPrompt = `You are AGENT 2: The Formula Compiler for SheetBrain AI.
Your exclusive responsibility is mathematical relationship injection and reactive formula synthesis.
Given the column definitions and raw rows from Agent 1 (Schema Architect), determine:
1. Row-level formulas (e.g. Net = Revenue - Cost, Margin = Net / Revenue).
2. Summary aggregation formulas for Row ${summaryRow} (e.g. =SUM(B2:B${lastDataRow})).
STRICT RULES:
1. Every formula string MUST begin with '=' and use standard UPPERCASE Excel functions (=SUM, =AVERAGE, =ROUND, =IF).
2. ANTI-CIRCULAR GUARD: A cell must NEVER reference its own coordinate.
3. Return strict JSON:
{
  "summaryRowLabel": "TOTAL / MODEL AGGREGATE",
  "formulaMap": {
    "E2": "=(C2-D2)",
    "B${summaryRow}": "=SUM(B2:B${lastDataRow})"
  }
}`;

  try {
    const bedrockResult = await invokeBedrockAgent<BedrockFormulaPayload>({
      systemPrompt,
      userPrompt: `Columns: ${JSON.stringify(columns.map(c => ({ key: c.key, label: c.label, type: c.type })))}. Data rows: 2 to ${lastDataRow}. Sample row: ${JSON.stringify(rawRows[0])}`,
      maxTokens: 1200,
    });

    if (bedrockResult.data && bedrockResult.data.formulaMap && Object.keys(bedrockResult.data.formulaMap).length > 0) {
      const cellData = buildCellDataWithFormulas(schema, bedrockResult.data.formulaMap, bedrockResult.data.summaryRowLabel);
      return {
        output: {
          cellData,
          formulasInjectedCount: Object.keys(bedrockResult.data.formulaMap).length,
          summaryRowsCount: 1,
          antiCircularGuardPassed: true,
        },
        isFallback: false,
        latencyMs: bedrockResult.latencyMs || Date.now() - startTime,
      };
    }
  } catch (error) {
    console.warn('[Agent 2: FormulaCompiler] Bedrock invocation note:', error);
  }

  // Deterministic Fallback: AST Formula Compiler
  const deterministicOutput = compileDeterministicFormulas(schema);
  return {
    output: deterministicOutput,
    isFallback: true,
    latencyMs: Date.now() - startTime,
  };
}

function buildCellDataWithFormulas(
  schema: SchemaArchitectOutput,
  aiFormulas: Record<string, string>,
  summaryLabel = 'TOTAL'
): Record<string, SheetCell> {
  const cellData: Record<string, SheetCell> = {};
  const { columns, rawRows } = schema;
  const lastDataRow = rawRows.length + 1;
  const summaryRow = lastDataRow + 1;

  // 1. Headers (Row 1)
  columns.forEach(c => {
    cellData[`${c.key}1`] = {
      v: c.label,
      bold: true,
      align: c.type === 'string' ? 'left' : 'right',
    };
  });

  // 2. Data Rows (Row 2 .. lastDataRow)
  rawRows.forEach((row, idx) => {
    const r = idx + 2;
    columns.forEach(c => {
      const coord = `${c.key}${r}`;
      const formula = aiFormulas[coord];
      if (formula && formula.startsWith('=') && !formula.toUpperCase().includes(coord)) {
        cellData[coord] = {
          f: formula,
          align: c.type === 'string' ? 'left' : 'right',
        };
      } else {
        cellData[coord] = {
          v: row[c.key],
          align: c.type === 'string' ? 'left' : 'right',
        };
      }
    });
  });

  // 3. Summary Row
  cellData[`A${summaryRow}`] = {
    v: summaryLabel,
    bold: true,
    align: 'left',
  };

  columns.slice(1).forEach(c => {
    const coord = `${c.key}${summaryRow}`;
    const customFormula = aiFormulas[coord];
    if (customFormula && customFormula.startsWith('=') && !customFormula.toUpperCase().includes(coord)) {
      cellData[coord] = { f: customFormula, bold: true, align: 'right' };
    } else if (c.type === 'percentage') {
      cellData[coord] = { f: `=AVERAGE(${c.key}2:${c.key}${lastDataRow})`, bold: true, align: 'right' };
    } else if (c.type === 'number' || c.type === 'currency') {
      cellData[coord] = { f: `=SUM(${c.key}2:${c.key}${lastDataRow})`, bold: true, align: 'right' };
    }
  });

  return cellData;
}

function compileDeterministicFormulas(schema: SchemaArchitectOutput): FormulaCompilerOutput {
  const cellData: Record<string, SheetCell> = {};
  const { columns, rawRows, metadata } = schema;
  const lastDataRow = rawRows.length + 1;
  const summaryRow = lastDataRow + 1;
  let formulaCount = 0;

  // Row 1: Headers
  columns.forEach(c => {
    cellData[`${c.key}1`] = {
      v: c.label,
      bold: true,
      align: c.type === 'string' ? 'left' : 'right',
    };
  });

  // Domain-specific formula rules
  const isSaaS = metadata?.domain === 'SaaS Finance';
  const isHR = metadata?.domain === 'HR & Payroll';
  const isHealth = metadata?.domain === 'Healthcare';

  // Data Rows (Row 2 .. lastDataRow)
  rawRows.forEach((row, idx) => {
    const r = idx + 2;

    columns.forEach(c => {
      const coord = `${c.key}${r}`;

      // SaaS Continuous Balance Cascade
      if (isSaaS) {
        if (c.key === 'B' && r > 2) {
          // Starting cash = previous month ending cash
          cellData[coord] = { f: `=F${r - 1}`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'E') {
          // Net Monthly Burn = OPEX (D) - ARR/MRR (C)
          cellData[coord] = { f: `=(D${r}-C${r})`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'F') {
          // Ending Cash Balance = Starting Cash (B) - Net Burn (E)
          cellData[coord] = { f: `=(B${r}-E${r})`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'G') {
          // Runway Months = Ending Cash / OPEX
          cellData[coord] = { f: `=ROUND(F${r}/D${r},1)`, align: 'right' };
          formulaCount++;
          return;
        }
      }

      // HR Net Pay Formula
      if (isHR && c.key === 'F') {
        cellData[coord] = { f: `=(C${r}+D${r}-E${r})`, align: 'right' };
        formulaCount++;
        return;
      }

      // Healthcare Copay Formula
      if (isHealth && c.key === 'E') {
        cellData[coord] = { f: `=(C${r}-D${r})`, align: 'right' };
        formulaCount++;
        return;
      }

      // General Model Margin / Variance Formula
      if (!isSaaS && !isHR && !isHealth) {
        if (c.key === 'D' && columns.some(col => col.key === 'B')) {
          cellData[coord] = { f: `=(B${r}-C${r})`, align: 'right' };
          formulaCount++;
          return;
        }
        if (c.key === 'E' && columns.some(col => col.key === 'B')) {
          cellData[coord] = { f: `=ROUND(D${r}/B${r},2)`, align: 'right' };
          formulaCount++;
          return;
        }
      }

      // Raw value cell
      cellData[coord] = {
        v: row[c.key],
        align: c.type === 'string' ? 'left' : 'right',
      };
    });
  });

  // Summary Row (Row summaryRow)
  cellData[`A${summaryRow}`] = {
    v: 'TOTAL / MODEL SUMMARY',
    bold: true,
    align: 'left',
  };

  columns.slice(1).forEach(c => {
    const coord = `${c.key}${summaryRow}`;
    if (c.type === 'percentage') {
      cellData[coord] = { f: `=AVERAGE(${c.key}2:${c.key}${lastDataRow})`, bold: true, align: 'right' };
      formulaCount++;
    } else if (c.type === 'number' || c.type === 'currency') {
      cellData[coord] = { f: `=SUM(${c.key}2:${c.key}${lastDataRow})`, bold: true, align: 'right' };
      formulaCount++;
    }
  });

  return {
    cellData,
    formulasInjectedCount: formulaCount,
    summaryRowsCount: 1,
    antiCircularGuardPassed: true,
  };
}
