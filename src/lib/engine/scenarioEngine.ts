import { SheetData, SheetColumn, SheetCell } from '@/types/sheet';
import { parseCoord, recalculateWorkbook } from './formulaEngine';

export type MetricPolarity = 'positive' | 'negative' | 'neutral';

export interface LogicalScenario {
  key: string;
  name: string;
  multiplier: number;
  deltaStr: string;
  prompt: string;
  simSum: number;
  deltaVal: number;
  type: 'growth' | 'steady' | 'risk' | 'crisis';
  desc: string;
  isPositiveOutcome: boolean;
}

export interface SensitivityCell {
  xPct: number;
  yPct: number;
  val: number;
  deltaPercent: number;
  deltaVal: number;
}

export interface SensitivityGrid {
  xSteps: number[];
  ySteps: number[];
  grid: { yPct: number; cells: SensitivityCell[] }[];
  targetKpiLabel: string;
  targetKpiCoord?: string;
}

export interface MonteCarloResult {
  p10: number;
  p50: number;
  p90: number;
  baseVal: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  valueAtRiskP10: number;
  upsidePotentialP90: number;
  buckets: { label: string; count: number }[];
  targetKpiLabel: string;
}

/**
 * Detects whether an increase in this metric is economically favorable (positive)
 * or detrimental (negative, e.g. costs, churn, defects, latency).
 */
export function detectMetricPolarity(label: string): MetricPolarity {
  const lower = (label || '').toLowerCase();
  
  // Detrimental metrics: increase = bad, decrease = good
  if (/cost|expense|burn|churn|debt|loss|cogs|cac|defect|slip|delay|risk|outflow|payable|overrun|overhead/i.test(lower)) {
    return 'negative';
  }
  
  // Favorable metrics: increase = good, decrease = bad
  if (/rev|arr|mrr|profit|income|margin|sale|earning|inflow|gain|retention|conversion|growth|booking|nrr|ebitda|cash/i.test(lower)) {
    return 'positive';
  }
  
  return 'neutral';
}

/**
 * Finds the primary output / KPI formula cell in the worksheet (e.g. Total, Net Income, Ending Cash).
 */
export function findPrimaryKpiCell(sheet: SheetData, targetColKey?: string): { coord: string; label: string; formula: string } | null {
  const cellMap = sheet.cellData || {};
  let candidate: { coord: string; label: string; formula: string; row: number } | null = null;

  for (const [coord, cell] of Object.entries(cellMap)) {
    if (!cell.f || !cell.f.startsWith('=')) continue;
    const p = parseCoord(coord);
    if (!p) continue;

    // Check if target column matches or if it's in columns B, C, D
    const matchesCol = targetColKey ? p.col === targetColKey : true;
    if (matchesCol && p.row >= 3) {
      if (!candidate || p.row > candidate.row) {
        // Look for row label in Column A
        const labelCell = cellMap[`A${p.row}`];
        const label = (labelCell?.v ? String(labelCell.v) : '') || `Row ${p.row} Formula`;
        candidate = { coord, label, formula: cell.f, row: p.row };
      }
    }
  }

  return candidate ? { coord: candidate.coord, label: candidate.label, formula: candidate.formula } : null;
}

/**
 * Generates 4 contextually accurate, economically logical scenarios tailored to the column's business semantics.
 */
export function generateContextualScenarios(
  primaryCol: SheetColumn,
  baseValue: number,
  kpiLabel: string
): LogicalScenario[] {
  const polarity = detectMetricPolarity(primaryCol.label);
  const colName = primaryCol.label || 'Value';

  if (polarity === 'negative') {
    // For Cost, Expense, Burn, Churn: LOWER is better, HIGHER is risky
    return [
      {
        key: 'optimization',
        name: '✂️ Lean Optimization (-15%)',
        multiplier: 0.85,
        deltaStr: '-15%',
        prompt: `Simulate operational efficiency: reduce ${colName} by 15%`,
        simSum: Math.round(baseValue * 0.85),
        deltaVal: Math.round(baseValue * -0.15),
        type: 'growth',
        desc: 'Optimized procurement, trimmed redundant overhead & improved vendor leverage',
        isPositiveOutcome: true,
      },
      {
        key: 'controlled',
        name: '🛡️ Budget Pruning (-5%)',
        multiplier: 0.95,
        deltaStr: '-5%',
        prompt: `Simulate disciplined spending: reduce ${colName} by 5%`,
        simSum: Math.round(baseValue * 0.95),
        deltaVal: Math.round(baseValue * -0.05),
        type: 'steady',
        desc: 'Controlled cost containment preserving core delivery capacity',
        isPositiveOutcome: true,
      },
      {
        key: 'inflation',
        name: '⚠️ Inflation & Creep (+15%)',
        multiplier: 1.15,
        deltaStr: '+15%',
        prompt: `Simulate macro inflation shock: increase ${colName} by 15%`,
        simSum: Math.round(baseValue * 1.15),
        deltaVal: Math.round(baseValue * 0.15),
        type: 'risk',
        desc: 'Supply chain friction, wage pressure & rising vendor service costs',
        isPositiveOutcome: false,
      },
      {
        key: 'overrun',
        name: '⚡ Severe Cost Overrun (+30%)',
        multiplier: 1.30,
        deltaStr: '+30%',
        prompt: `Simulate critical cost escalation: increase ${colName} by 30%`,
        simSum: Math.round(baseValue * 1.30),
        deltaVal: Math.round(baseValue * 0.30),
        type: 'crisis',
        desc: 'Critical budget overruns testing emergency liquidity reserves',
        isPositiveOutcome: false,
      },
    ];
  }

  // Default / Positive Polarity: Revenue, Sales, Retention, Profit (HIGHER is better)
  return [
    {
      key: 'bull',
      name: '🚀 Market Expansion (+20%)',
      multiplier: 1.20,
      deltaStr: '+20%',
      prompt: `Simulate growth surge: increase ${colName} by 20%`,
      simSum: Math.round(baseValue * 1.20),
      deltaVal: Math.round(baseValue * 0.20),
      type: 'growth',
      desc: 'Accelerated conversion velocity, deal size expansion & high customer acquisition',
      isPositiveOutcome: true,
    },
    {
      key: 'conservative',
      name: '🛡️ Steady Execution (+8%)',
      multiplier: 1.08,
      deltaStr: '+8%',
      prompt: `Simulate organic progress: increase ${colName} by 8%`,
      simSum: Math.round(baseValue * 1.08),
      deltaVal: Math.round(baseValue * 0.08),
      type: 'steady',
      desc: 'Predictable baseline execution with moderate organic customer retention',
      isPositiveOutcome: true,
    },
    {
      key: 'bear',
      name: '📉 Sales Contraction (-15%)',
      multiplier: 0.85,
      deltaStr: '-15%',
      prompt: `Simulate market slowdown: decrease ${colName} by 15%`,
      simSum: Math.round(baseValue * 0.85),
      deltaVal: Math.round(baseValue * -0.15),
      type: 'risk',
      desc: 'Lengthened sales cycles, deal pushouts & enterprise budget freezes',
      isPositiveOutcome: false,
    },
    {
      key: 'shock',
      name: '⚡ Severe Market Shock (-30%)',
      multiplier: 0.70,
      deltaStr: '-30%',
      prompt: `Simulate downside stress test: decrease ${colName} by 30%`,
      simSum: Math.round(baseValue * 0.70),
      deltaVal: Math.round(baseValue * -0.30),
      type: 'crisis',
      desc: 'Black swan tail-risk event testing minimum working capital and runway',
      isPositiveOutcome: false,
    },
  ];
}

/**
 * Computes a genuine 2-Way Sensitivity Table (5x5 matrix) using HyperFormula.
 * For each grid cell, input driver values are updated and the entire spreadsheet is recalculated.
 */
export function computeFormulaDrivenSensitivityGrid(
  sheet: SheetData,
  primaryColKey: string,
  secondaryColKey: string,
  realRows: number[]
): SensitivityGrid {
  const cellMap = sheet.cellData || {};
  const kpiInfo = findPrimaryKpiCell(sheet, primaryColKey) || findPrimaryKpiCell(sheet, secondaryColKey);
  const targetKpiCoord = kpiInfo?.coord;
  const targetKpiLabel = kpiInfo?.label || `${sheet.columns.find(c => c.key === primaryColKey)?.label || 'Model'} Output`;

  // Calculate baseline KPI
  const baseRecalc = recalculateWorkbook(cellMap);
  let baseVal = 0;
  if (targetKpiCoord && baseRecalc[targetKpiCoord] && typeof baseRecalc[targetKpiCoord].v === 'number') {
    baseVal = baseRecalc[targetKpiCoord].v as number;
  } else {
    // Sum of primary column
    for (const r of realRows) {
      const v = cellMap[`${primaryColKey}${r}`]?.v;
      if (typeof v === 'number') baseVal += v;
    }
  }

  const xSteps = [-0.20, -0.10, 0, 0.10, 0.20];
  const ySteps = [-0.20, -0.10, 0, 0.10, 0.20];

  const grid = ySteps.map(yPct => {
    const cells = xSteps.map(xPct => {
      // Clone cells and perturb input cells only (skip formulas)
      const cloned: Record<string, SheetCell> = {};
      for (const [k, c] of Object.entries(cellMap)) {
        cloned[k] = { ...c };
      }

      for (const r of realRows) {
        // Driver 1 (X)
        const cellX = cloned[`${primaryColKey}${r}`];
        if (cellX && !cellX.f && typeof cellX.v === 'number') {
          cellX.v = Math.round(cellX.v * (1 + xPct) * 100) / 100;
        }

        // Driver 2 (Y) - only if different column
        if (secondaryColKey !== primaryColKey) {
          const cellY = cloned[`${secondaryColKey}${r}`];
          if (cellY && !cellY.f && typeof cellY.v === 'number') {
            cellY.v = Math.round(cellY.v * (1 + yPct) * 100) / 100;
          }
        }
      }

      // Recalculate whole model through HyperFormula
      const computed = recalculateWorkbook(cloned);
      let cellVal = 0;

      if (targetKpiCoord && computed[targetKpiCoord] && typeof computed[targetKpiCoord].v === 'number') {
        cellVal = computed[targetKpiCoord].v as number;
      } else {
        for (const r of realRows) {
          const v = computed[`${primaryColKey}${r}`]?.v;
          if (typeof v === 'number') cellVal += v;
        }
      }

      const deltaVal = cellVal - baseVal;
      const deltaPercent = baseVal !== 0 ? Math.round((deltaVal / Math.abs(baseVal)) * 100) : 0;

      return {
        xPct,
        yPct,
        val: Math.round(cellVal),
        deltaPercent,
        deltaVal: Math.round(deltaVal),
      };
    });

    return { yPct, cells };
  });

  return {
    xSteps,
    ySteps,
    grid,
    targetKpiLabel,
    targetKpiCoord,
  };
}

/**
 * Computes genuine Monte Carlo probabilistic distribution across 150 simulated runs using HyperFormula.
 */
export function computeFormulaDrivenMonteCarlo(
  sheet: SheetData,
  primaryColKey: string,
  secondaryColKey: string,
  realRows: number[]
): MonteCarloResult {
  const cellMap = sheet.cellData || {};
  const kpiInfo = findPrimaryKpiCell(sheet, primaryColKey) || findPrimaryKpiCell(sheet, secondaryColKey);
  const targetKpiCoord = kpiInfo?.coord;
  const targetKpiLabel = kpiInfo?.label || `${sheet.columns.find(c => c.key === primaryColKey)?.label || 'Model'} Output`;

  // Baseline
  const baseRecalc = recalculateWorkbook(cellMap);
  let baseVal = 0;
  if (targetKpiCoord && baseRecalc[targetKpiCoord] && typeof baseRecalc[targetKpiCoord].v === 'number') {
    baseVal = baseRecalc[targetKpiCoord].v as number;
  } else {
    for (const r of realRows) {
      const v = cellMap[`${primaryColKey}${r}`]?.v;
      if (typeof v === 'number') baseVal += v;
    }
  }

  const iterations = 100;
  const results: number[] = [];

  let seed = 12345;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < iterations; i++) {
    // Box-Muller transform for normal distribution (mean 1.0, std dev 0.12)
    const u1 = Math.max(0.0001, pseudoRandom());
    const u2 = pseudoRandom();
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

    const multX = 1 + z1 * 0.12;
    const multY = 1 + z2 * 0.10;

    const cloned: Record<string, SheetCell> = {};
    for (const [k, c] of Object.entries(cellMap)) {
      cloned[k] = { ...c };
    }

    for (const r of realRows) {
      const cellX = cloned[`${primaryColKey}${r}`];
      if (cellX && !cellX.f && typeof cellX.v === 'number') {
        cellX.v = cellX.v * multX;
      }
      if (secondaryColKey !== primaryColKey) {
        const cellY = cloned[`${secondaryColKey}${r}`];
        if (cellY && !cellY.f && typeof cellY.v === 'number') {
          cellY.v = cellY.v * multY;
        }
      }
    }

    const computed = recalculateWorkbook(cloned);
    let runVal = 0;
    if (targetKpiCoord && computed[targetKpiCoord] && typeof computed[targetKpiCoord].v === 'number') {
      runVal = computed[targetKpiCoord].v as number;
    } else {
      for (const r of realRows) {
        const v = computed[`${primaryColKey}${r}`]?.v;
        if (typeof v === 'number') runVal += v;
      }
    }

    results.push(Math.round(runVal));
  }

  results.sort((a, b) => a - b);

  const p10 = results[Math.floor(iterations * 0.10)] ?? baseVal;
  const p50 = results[Math.floor(iterations * 0.50)] ?? baseVal;
  const p90 = results[Math.floor(iterations * 0.90)] ?? baseVal;

  const min = results[0] ?? 0;
  const max = results[results.length - 1] ?? 1;
  const mean = results.reduce((acc, v) => acc + v, 0) / (results.length || 1);

  // Variance & std dev
  const variance = results.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (results.length || 1);
  const stdDev = Math.round(Math.sqrt(variance));

  const valueAtRiskP10 = Math.round(p10 - baseVal);
  const upsidePotentialP90 = Math.round(p90 - baseVal);

  const bucketCount = 12;
  const range = max - min || 1;
  const bucketSize = range / bucketCount;

  const buckets = Array.from({ length: bucketCount }, (_, idx) => {
    const lower = min + idx * bucketSize;
    const upper = lower + bucketSize;
    const count = results.filter(v => v >= lower && (idx === bucketCount - 1 ? v <= upper : v < upper)).length;
    return {
      label: lower >= 1000 || lower <= -1000 ? `${Math.round(lower / 1000)}k` : `${Math.round(lower)}`,
      count,
    };
  });

  return {
    p10,
    p50,
    p90,
    baseVal: Math.round(baseVal),
    min,
    max,
    mean: Math.round(mean),
    stdDev,
    valueAtRiskP10,
    upsidePotentialP90,
    buckets,
    targetKpiLabel,
  };
}
