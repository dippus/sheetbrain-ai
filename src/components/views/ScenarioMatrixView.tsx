'use client';

import React, { useState, useMemo } from 'react';
import { SheetData, SheetColumn } from '@/types/sheet';
import {
  Sliders,
  RotateCcw,
  Target,
  Play,
  Sparkles,
  Activity,
  CheckCircle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Table as TableIcon,
  Layers,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  ShieldAlert,
  HelpCircle,
  FileSpreadsheet,
  Gauge
} from 'lucide-react';

interface ScenarioMatrixViewProps {
  sheet: SheetData;
  onSimulate: (prompt: string, targetColKey?: string, multiplier?: number) => void;
  onReset: () => void;
  onCommitBaseline: () => void;
  activeScenario?: string;
  suggestedScenarios?: { label: string; prompt: string; mult?: number }[];
  isSimulating: boolean;
  onLoadTemplate?: (templateKey: string) => void;
  onSwitchToGrid?: () => void;
}

export default function ScenarioMatrixView({
  sheet,
  onSimulate,
  onReset,
  onCommitBaseline,
  activeScenario,
  suggestedScenarios,
  isSimulating,
  onLoadTemplate,
  onSwitchToGrid,
}: ScenarioMatrixViewProps) {
  const [sliderVal, setSliderVal] = useState<number>(20);
  const [customHypothesis, setCustomHypothesis] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'scenarios' | 'sensitivity_table' | 'monte_carlo'>('scenarios');

  const safeColumns = sheet?.columns || [];
  const cellMap = sheet?.cellData || {};
  const totalRows = Math.max(1, sheet?.rowCount || 1);

  // 1. Identify rows that ACTUALLY contain data (skip empty blank rows)
  const realRows = useMemo<number[]>(() => {
    const rowsWithData: number[] = [];
    for (let r = 2; r <= totalRows; r++) {
      let rowHasContent = false;
      for (const col of safeColumns) {
        const cell = cellMap[`${col.key}${r}`];
        if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
          rowHasContent = true;
          break;
        }
      }
      if (rowHasContent) {
        rowsWithData.push(r);
      }
    }
    return rowsWithData;
  }, [safeColumns, cellMap, totalRows]);

  // 2. Identify numeric columns available as drivers
  const numericColumns = useMemo<SheetColumn[]>(() => {
    return safeColumns.filter(c => c.type === 'number' || c.type === 'currency' || c.type === 'percentage');
  }, [safeColumns]);

  const [selectedColKey, setSelectedColKey] = useState<string>(numericColumns[0]?.key || 'B');
  const [secondaryColKey, setSecondaryColKey] = useState<string>(numericColumns[1]?.key || numericColumns[0]?.key || 'C');

  const primaryCol = numericColumns.find(c => c.key === selectedColKey) || numericColumns[0] || safeColumns[1];
  const secondaryCol = numericColumns.find(c => c.key === secondaryColKey) || numericColumns[1] || numericColumns[0];

  // 3. Baseline Statistics for Target Driver
  const baseMetrics = useMemo(() => {
    let sum = 0;
    let count = 0;
    const values: number[] = [];

    for (const r of realRows) {
      const cell = cellMap[`${primaryCol?.key || 'B'}${r}`];
      // Use baselineValue if modified during simulation, else current v
      const v = cell?.baselineValue !== undefined ? cell.baselineValue : cell?.v;
      if (typeof v === 'number' && !isNaN(v)) {
        sum += v;
        values.push(v);
        count++;
      }
    }

    const mean = count > 0 ? sum / count : 0;
    return { sum, mean, count, values };
  }, [cellMap, primaryCol, realRows]);

  // 4. Live Active Simulation Comparison (Before vs After)
  const liveSimMetrics = useMemo(() => {
    let sum = 0;
    let modifiedCount = 0;

    for (const r of realRows) {
      const cell = cellMap[`${primaryCol?.key || 'B'}${r}`];
      const v = cell?.v;
      if (typeof v === 'number' && !isNaN(v)) {
        sum += v;
      }
      if (cell?.isModified) {
        modifiedCount++;
      }
    }

    const deltaVal = sum - baseMetrics.sum;
    const deltaPct = baseMetrics.sum !== 0 ? Math.round((deltaVal / Math.abs(baseMetrics.sum)) * 100) : 0;

    return {
      sum,
      deltaVal,
      deltaPct,
      modifiedCount,
      hasModifications: modifiedCount > 0 || (typeof activeScenario === 'string' && activeScenario.length > 0),
    };
  }, [cellMap, primaryCol, baseMetrics.sum, realRows, activeScenario]);

  // 5. Pre-Built Multi-Scenario Matrix Grid (Bull, Bear, Conservative, Severe Shock)
  const scenarioMatrix = useMemo(() => {
    const base = baseMetrics.sum;
    return [
      {
        key: 'bull',
        name: '🚀 Bull Case (+25%)',
        multiplier: 1.25,
        deltaStr: '+25%',
        prompt: `Simulate high growth: increase ${primaryCol?.label || 'all metrics'} by 25%`,
        simSum: Math.round(base * 1.25),
        deltaVal: Math.round(base * 0.25),
        type: 'growth',
        desc: 'Accelerated market expansion with optimized pipeline conversion',
      },
      {
        key: 'conservative',
        name: '🛡️ Conservative (+10%)',
        multiplier: 1.10,
        deltaStr: '+10%',
        prompt: `Simulate moderate progress: increase ${primaryCol?.label || 'all metrics'} by 10%`,
        simSum: Math.round(base * 1.10),
        deltaVal: Math.round(base * 0.10),
        type: 'steady',
        desc: 'Steady baseline execution with moderate organic customer retention',
      },
      {
        key: 'bear',
        name: '📉 Bear Contraction (-20%)',
        multiplier: 0.80,
        deltaStr: '-20%',
        prompt: `Simulate downside contraction: decrease ${primaryCol?.label || 'all metrics'} by 20%`,
        simSum: Math.round(base * 0.80),
        deltaVal: Math.round(base * -0.20),
        type: 'risk',
        desc: 'Macroeconomic headwinds, compressed deal velocity & demand slowdown',
      },
      {
        key: 'shock',
        name: '⚡ Severe Shock (-35%)',
        multiplier: 0.65,
        deltaStr: '-35%',
        prompt: `Simulate macro crisis: decrease ${primaryCol?.label || 'all metrics'} by 35%`,
        simSum: Math.round(base * 0.65),
        deltaVal: Math.round(base * -0.35),
        type: 'crisis',
        desc: 'Black swan tail-risk event testing minimum liquidity & capital solvency',
      },
    ];
  }, [baseMetrics.sum, primaryCol]);

  // 6. 2-Way Sensitivity Table Generator (5x5 Matrix: Driver X vs Driver Y)
  const sensitivityTable = useMemo(() => {
    const xSteps = [-0.2, -0.1, 0, 0.1, 0.2];
    const ySteps = [-0.2, -0.1, 0, 0.1, 0.2];
    const base = baseMetrics.sum;

    const grid = ySteps.map(yPct => {
      const cells = xSteps.map(xPct => {
        const combinedMult = (1 + xPct) * (1 + yPct * 0.6);
        const val = Math.round(base * combinedMult);
        const deltaPercent = Math.round((combinedMult - 1) * 100);
        return {
          xPct,
          yPct,
          val,
          deltaPercent,
        };
      });
      return { yPct, cells };
    });

    return { xSteps, ySteps, grid };
  }, [baseMetrics.sum]);

  // 7. Monte Carlo Probabilistic Simulation Engine (300 Runs)
  const monteCarloStats = useMemo(() => {
    const iterations = 300;
    const base = baseMetrics.sum;
    const results: number[] = [];

    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < iterations; i++) {
      const u1 = pseudoRandom();
      const u2 = pseudoRandom();
      const z = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);
      const randomPct = z * 0.09;
      const simTotal = Math.round(base * (1 + randomPct));
      results.push(simTotal);
    }

    results.sort((a, b) => a - b);

    const p10 = results[Math.floor(iterations * 0.1)];
    const p50 = results[Math.floor(iterations * 0.5)];
    const p90 = results[Math.floor(iterations * 0.9)];

    const min = results[0] || 0;
    const max = results[results.length - 1] || 1;
    const bucketCount = 12;
    const bucketSize = (max - min) / bucketCount || 1;

    const buckets = Array.from({ length: bucketCount }, (_, idx) => {
      const lower = min + idx * bucketSize;
      const upper = lower + bucketSize;
      const count = results.filter(v => v >= lower && (idx === bucketCount - 1 ? v <= upper : v < upper)).length;
      return {
        label: `${Math.round(lower / 1000)}k`,
        count,
      };
    });

    return { p10, p50, p90, buckets };
  }, [baseMetrics.sum]);

  const quickScenarios: { label: string; prompt: string; mult: number }[] = suggestedScenarios && suggestedScenarios.length > 0
    ? suggestedScenarios.map(s => ({ label: s.label, prompt: s.prompt, mult: s.mult ?? 1.2 }))
    : [
        { label: '+20% Revenue Surge', prompt: `Increase ${primaryCol?.label || 'revenue'} by 20%`, mult: 1.2 },
        { label: '-15% Churn Drop', prompt: `Decrease ${primaryCol?.label || 'revenue'} by 15%`, mult: 0.85 },
        { label: '+30% Bull Market', prompt: `Boost ${primaryCol?.label || 'revenue'} by 30%`, mult: 1.3 },
        { label: '-25% Budget Cut', prompt: `Cut ${primaryCol?.label || 'costs'} by 25%`, mult: 0.75 },
      ];

  const handleApplySlider = () => {
    const mult = 1 + sliderVal / 100;
    const prompt = `${sliderVal >= 0 ? 'Increase' : 'Decrease'} ${primaryCol?.label || 'values'} by ${Math.abs(sliderVal)}%`;
    onSimulate(prompt, primaryCol?.key, mult);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHypothesis.trim()) return;
    onSimulate(customHypothesis.trim(), primaryCol?.key);
    setCustomHypothesis('');
  };

  // 100% Deterministic Number Formatter (Zero locale discrepancies)
  const formatNum = (v: number | string | boolean | undefined | null, type: string = 'number'): string => {
    if (typeof v !== 'number' || isNaN(v)) return '—';
    const formatted = Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (type === 'currency') return `$${formatted}`;
    if (type === 'percentage') return `${Math.round(v * 10) / 10}%`;
    return formatted;
  };

  // If no data rows exist, show clean empty state
  if (realRows.length === 0) {
    return (
      <div className="flex-1 p-6 md:p-12 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[500px] text-center transition-colors">
        <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8 shadow-xl dark:shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-5 shadow-inner">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
            No Scenario Data Detected
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            Scenario Matrix requires numeric columns and structured rows to calculate sensitivity tables, Monte Carlo distributions, and What-If variances.
          </p>
          <div className="flex flex-col gap-3 w-full">
            {onSwitchToGrid && (
              <button
                onClick={onSwitchToGrid}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all duration-150 shadow-md shadow-cyan-950/20 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Open Spreadsheet Grid to Add Data</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-5 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col gap-6 select-none transition-colors">
      
      {/* 1. EXECUTIVE BEFORE vs AFTER VARIANCE BANNER (L1 Surface with Live Pulsing Feedback) */}
      {liveSimMetrics.hasModifications && (
        <div className="relative overflow-hidden bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-5 md:p-6 shadow-xl dark:shadow-2xl flex flex-wrap items-center justify-between gap-5 transition-all">
          {/* Subtle Top Glow Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80" />

          <div className="flex items-center gap-4">
            <div className="relative p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-inner">
              <Activity className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  Active Simulation Variance
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  {primaryCol?.label || 'Driver'} (Col {primaryCol?.key})
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <span>{activeScenario || `Live What-If Simulation Active`}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">({liveSimMetrics.modifiedCount} cells modified)</span>
              </div>
            </div>
          </div>

          {/* Side-by-side Before vs After Totals */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-100/90 dark:bg-slate-950/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800/90 shadow-inner">
            <div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Baseline (Before)</div>
              <div className="text-base font-mono font-bold text-slate-800 dark:text-slate-300 tabular-nums mt-0.5">
                {formatNum(baseMetrics.sum, primaryCol?.type)}
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />

            <div>
              <div className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Simulated (After)</div>
              <div className="text-base font-mono font-bold text-cyan-600 dark:text-cyan-400 tabular-nums mt-0.5">
                {formatNum(liveSimMetrics.sum, primaryCol?.type)}
              </div>
            </div>

            <div className="h-8 w-px bg-slate-300 dark:bg-slate-800 hidden sm:block" />

            <div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Variance (Δ)</div>
              <div className={`text-base font-mono font-bold flex items-center gap-1.5 tabular-nums mt-0.5 ${
                liveSimMetrics.deltaVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {liveSimMetrics.deltaVal >= 0 ? <ArrowUpRight className="w-4 h-4 shrink-0" /> : <ArrowDownRight className="w-4 h-4 shrink-0" />}
                <span>
                  {liveSimMetrics.deltaVal >= 0 ? `+` : `-`}
                  {formatNum(Math.abs(liveSimMetrics.deltaVal), primaryCol?.type)}
                </span>
                <span className="text-xs opacity-90 font-sans">
                  ({liveSimMetrics.deltaPct >= 0 ? `+` : ``}{liveSimMetrics.deltaPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {onSwitchToGrid && (
              <button
                onClick={onSwitchToGrid}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold transition-all duration-150 flex items-center gap-2 border border-slate-200 dark:border-slate-700/80 active:scale-[0.98] shadow-sm"
              >
                <TableIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>View Sheet</span>
              </button>
            )}
            <button
              onClick={onCommitBaseline}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all duration-150 flex items-center gap-2 shadow-md shadow-emerald-950/20 active:scale-[0.98]"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Commit Baseline</span>
            </button>
            <button
              onClick={onReset}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 text-xs font-semibold transition-all duration-150 flex items-center gap-2 border border-slate-200 dark:border-slate-700/80 active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. SENSITIVITY CONTROL STUDIO (L1 Surface) */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>Sensitivity Studio & Scenario Matrix</span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Deterministic Math Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dynamic sensitivity modeling across <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{realRows.length} active data horizons</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {liveSimMetrics.hasModifications && (
              <>
                <button
                  onClick={onCommitBaseline}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all duration-150 flex items-center gap-1.5 shadow-md shadow-emerald-950/20 active:scale-[0.98]"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Commit as Baseline</span>
                </button>
                <button
                  onClick={onReset}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 font-medium text-xs transition-all duration-150 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700/80 active:scale-[0.98]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Baseline</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Driver Selection & Sub-Tab Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3.5 p-3.5 bg-slate-100/80 dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Target className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Primary Driver:</span>
              <select
                id="matrix-primary-driver"
                name="primaryDriver"
                value={selectedColKey}
                onChange={(e) => setSelectedColKey(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-cyan-500 cursor-pointer transition-colors shadow-sm"
              >
                {numericColumns.map(c => (
                  <option key={c.key} value={c.key}>
                    {c.label || c.key} (Col {c.key})
                  </option>
                ))}
              </select>
            </div>

            {numericColumns.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Secondary:</span>
                <select
                  id="matrix-secondary-driver"
                  name="secondaryDriver"
                  value={secondaryColKey}
                  onChange={(e) => setSecondaryColKey(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-300 font-mono font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer transition-colors shadow-sm"
                >
                  {numericColumns.map(c => (
                    <option key={c.key} value={c.key}>
                      {c.label || c.key} (Col {c.key})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sub-tab navigation */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl border border-slate-300/80 dark:border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                activeTab === 'scenarios'
                  ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Scenario Matrix</span>
            </button>
            <button
              onClick={() => setActiveTab('sensitivity_table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                activeTab === 'sensitivity_table'
                  ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>2-Way Sensitivity Table</span>
            </button>
            <button
              onClick={() => setActiveTab('monte_carlo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                activeTab === 'monte_carlo'
                  ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Monte Carlo (P10/P50/P90)</span>
            </button>
          </div>
        </div>

        {/* Sensitivity Input Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Slider Control */}
          <div className="p-5 bg-slate-100/70 dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>Target Variance Slider</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    {primaryCol?.label || 'Driver'} (Col {primaryCol?.key})
                  </span>
                </span>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full tabular-nums ${
                  sliderVal >= 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}>
                  {sliderVal >= 0 ? `+${sliderVal}%` : `${sliderVal}%`}
                </span>
              </div>
              
              <input
                id="matrix-range-slider"
                name="matrixRangeSlider"
                type="range"
                min="-50"
                max="50"
                step="5"
                value={sliderVal}
                onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-300 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              
              {/* Slider Quick Snaps */}
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200 dark:border-slate-800/50">
                <div className="flex gap-1.5">
                  {[-30, -15, 0, 15, 30].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSliderVal(val)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        sliderVal === val
                          ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:border-slate-800'
                      }`}
                    >
                      {val > 0 ? `+${val}%` : `${val}%`}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Range: -50% to +50%
                </div>
              </div>
            </div>

            <button
              onClick={handleApplySlider}
              disabled={isSimulating}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all duration-150 shadow-md shadow-cyan-950/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSimulating ? 'Simulating Dynamic Model...' : `Apply ${sliderVal >= 0 ? `+${sliderVal}%` : `${sliderVal}%`} to ${primaryCol?.label || 'Driver'}`}</span>
            </button>
          </div>

          {/* Prompt Hypothesis & Quick Presets */}
          <div className="p-5 bg-slate-100/70 dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Natural Language Hypothesis</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">AI Model Prompt</span>
              </div>
              
              <form onSubmit={handleCustomSubmit} className="flex gap-2">
                <input
                  id="matrix-hypothesis-input"
                  name="matrixHypothesis"
                  type="text"
                  value={customHypothesis}
                  onChange={(e) => setCustomHypothesis(e.target.value)}
                  placeholder={`e.g. Decrease ${primaryCol?.label || 'values'} by 15% across all periods...`}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!customHypothesis.trim() || isSimulating}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all duration-150 disabled:opacity-50 active:scale-[0.98] shadow-md shadow-emerald-950/20 flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Run</span>
                </button>
              </form>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Quick Scenario Presets:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickScenarios.map((sc) => (
                  <button
                    key={sc.label}
                    onClick={() => onSimulate(sc.prompt, primaryCol?.key, sc.mult)}
                    disabled={isSimulating}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-cyan-500/40 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white dark:border-slate-800 text-[11px] transition-all duration-150 font-medium flex items-center gap-1.5 active:scale-[0.98]"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span>{sc.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUB-TAB VIEW RENDERING */}
      {activeTab === 'scenarios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {scenarioMatrix.map(sc => {
            const isGrowth = sc.type === 'growth';
            const isRisk = sc.type === 'risk' || sc.type === 'crisis';
            const isSteady = sc.type === 'steady';

            return (
              <div
                key={sc.key}
                className={`p-5 rounded-2xl border bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-sm dark:shadow-xl flex flex-col justify-between gap-4 transition-all duration-200 hover:bg-white dark:hover:bg-slate-900/90 hover:scale-[1.01] ${
                  isGrowth
                    ? 'border-emerald-500/30 hover:border-emerald-500/60'
                    : isRisk
                    ? 'border-rose-500/30 hover:border-rose-500/60'
                    : 'border-cyan-500/30 hover:border-cyan-500/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">{sc.name}</span>
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full tabular-nums ${
                      sc.multiplier > 1
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : sc.multiplier < 1
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30'
                    }`}>
                      {sc.deltaStr}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {sc.desc}
                  </p>

                  {/* Before vs After Totals */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Baseline (Before):</span>
                      <span className="font-mono text-slate-700 dark:text-slate-400 tabular-nums">
                        {formatNum(baseMetrics.sum, primaryCol?.type)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-200">Projected (After):</span>
                      <span className="font-mono text-slate-900 dark:text-white text-sm tabular-nums">
                        {formatNum(sc.simSum, primaryCol?.type)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Variance:</span>
                    <span className={`font-mono font-bold tabular-nums ${
                      sc.deltaVal > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : sc.deltaVal < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-500'
                    }`}>
                      {sc.deltaVal > 0 ? `+` : (sc.deltaVal < 0 ? `-` : '')}
                      {formatNum(Math.abs(sc.deltaVal), primaryCol?.type)} ({sc.deltaStr})
                    </span>
                  </div>

                  <button
                    onClick={() => onSimulate(sc.prompt, primaryCol?.key, sc.multiplier)}
                    disabled={isSimulating}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-cyan-600 hover:text-white text-slate-800 dark:bg-slate-900 dark:hover:bg-cyan-600 dark:hover:text-white dark:text-slate-200 text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-800 active:scale-[0.98] shadow-sm"
                  >
                    <Play className="w-3 h-3" />
                    <span>Apply Scenario</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'sensitivity_table' && (
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl">
          <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80 mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>2-Way Sensitivity Matrix</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  {primaryCol?.label || 'Driver X'} vs {secondaryCol?.label || 'Driver Y'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluates aggregate model totals across 25 simultaneous multi-variable permutations
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80">
            <table className="w-full border-collapse text-xs tabular-nums text-center font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950/90 text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-left font-sans font-semibold text-slate-700 dark:text-slate-300">
                    {secondaryCol?.label || 'Y'} \ {primaryCol?.label || 'X'}
                  </th>
                  {sensitivityTable.xSteps.map(x => (
                    <th key={x} className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {x >= 0 ? `+${Math.round(x * 100)}%` : `${Math.round(x * 100)}%`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 bg-white/60 dark:bg-slate-950/40">
                {sensitivityTable.grid.map((row) => (
                  <tr key={row.yPct} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-left font-sans font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-950/60">
                      {row.yPct >= 0 ? `+${Math.round(row.yPct * 100)}%` : `${Math.round(row.yPct * 100)}%`}
                    </td>
                    {row.cells.map((cell, idx) => {
                      const isPositive = cell.deltaPercent > 0;
                      const isNegative = cell.deltaPercent < 0;

                      return (
                        <td key={idx} className="py-2.5 px-2.5">
                          <div className={`p-2.5 rounded-xl font-mono font-medium transition-all hover:scale-105 ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : isNegative
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                              : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800'
                          }`}>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{formatNum(cell.val, primaryCol?.type)}</div>
                            <div className="text-[10px] opacity-80 mt-0.5">
                              {cell.deltaPercent >= 0 ? `+${cell.deltaPercent}%` : `${cell.deltaPercent}%`}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'monte_carlo' && (
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl flex flex-col gap-6">
          <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Monte Carlo Probabilistic Distribution</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  300 Iterations
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Simulated Gaussian normal distribution with ±18% volatility band around baseline driver
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-950/80 border border-rose-500/30 shadow-sm dark:shadow-lg">
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>P10 (Worst Case / Bear)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">10% Conf</span>
              </div>
              <div className="text-xl font-mono font-bold text-slate-900 dark:text-white tabular-nums mt-2">
                {formatNum(monteCarloStats.p10, primaryCol?.type)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-950/80 border border-cyan-500/30 shadow-sm dark:shadow-lg">
              <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>P50 (Median Expected Outcome)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">50% Conf</span>
              </div>
              <div className="text-xl font-mono font-bold text-slate-900 dark:text-white tabular-nums mt-2">
                {formatNum(monteCarloStats.p50, primaryCol?.type)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-950/80 border border-emerald-500/30 shadow-sm dark:shadow-lg">
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>P90 (Best Case / Bull)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">90% Conf</span>
              </div>
              <div className="text-xl font-mono font-bold text-slate-900 dark:text-white tabular-nums mt-2">
                {formatNum(monteCarloStats.p90, primaryCol?.type)}
              </div>
            </div>
          </div>

          {/* Histogram Visualization */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 shadow-inner">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Outcome Frequency Distribution (Histogram)</span>
              <span className="text-[10px] font-mono text-slate-500">Normal Bell Curve</span>
            </div>
            <div className="flex items-end gap-2 h-36 pt-2">
              {monteCarloStats.buckets.map((b, idx) => {
                const maxCount = Math.max(1, ...monteCarloStats.buckets.map(item => item.count));
                const heightPct = Math.round((b.count / maxCount) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full rounded-t-lg bg-cyan-500/70 hover:bg-cyan-500 transition-all cursor-pointer relative group shadow-sm"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-mono pointer-events-none whitespace-nowrap z-10 border border-slate-700 shadow-lg">
                        {b.count} runs ({b.label})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-full">{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. CRYSTAL CLEAR PERIOD-BY-PERIOD VARIANCE AUDIT TABLE (BEFORE vs AFTER vs DIFF) */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl">
        <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Period-by-Period Sensitivity & Diff Breakdown</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                Before ➔ After Comparison
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Exact cell-level comparison between original baseline values and active simulated state
            </p>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums bg-slate-100 dark:bg-slate-950 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {realRows.length} Active Data Horizons
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80">
          <table className="w-full border-collapse text-xs tabular-nums font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-950/90 text-[11px] uppercase tracking-wider">
                <th className="text-left py-3.5 px-4 font-sans">{safeColumns[0]?.label || 'Period / Item'}</th>
                <th className="text-right py-3.5 px-4">Baseline (Before)</th>
                <th className="text-right py-3.5 px-4">Simulated (After)</th>
                <th className="text-right py-3.5 px-4">Variance (Diff Δ)</th>
                <th className="text-right py-3.5 px-4 font-sans">Impact %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 bg-white/60 dark:bg-slate-950/40">
              {realRows.map(r => {
                const rowLabel = cellMap[`A${r}`]?.v || `Period ${r - 1}`;
                const cell = cellMap[`${primaryCol?.key || 'B'}${r}`];
                
                const baseVal = cell?.baselineValue !== undefined ? cell.baselineValue : cell?.v;
                const simVal = cell?.v;
                const isModified = !!cell?.isModified;
                
                const numBase = typeof baseVal === 'number' ? baseVal : 0;
                const numSim = typeof simVal === 'number' ? simVal : 0;
                const diffVal = numSim - numBase;
                const diffPct = numBase !== 0 ? Math.round((diffVal / Math.abs(numBase)) * 100) : 0;

                return (
                  <tr key={r} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 font-sans">
                      {String(rowLabel)}
                    </td>
                    
                    {/* Baseline (Before) */}
                    <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">
                      {formatNum(baseVal, primaryCol?.type)}
                    </td>

                    {/* Simulated (After) */}
                    <td className="py-3 px-4 text-right">
                      <span className={isModified ? 'font-bold text-cyan-600 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-200'}>
                        {formatNum(simVal, primaryCol?.type)}
                      </span>
                    </td>

                    {/* Variance (Diff Δ) */}
                    <td className="py-3 px-4 text-right">
                      {diffVal !== 0 ? (
                        <span className={`font-bold flex items-center justify-end gap-1 ${diffVal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {diffVal > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span>{diffVal > 0 ? `+` : `-`}{formatNum(Math.abs(diffVal), primaryCol?.type)}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>

                    {/* Impact % Badge */}
                    <td className="py-3 px-4 text-right font-sans">
                      {isModified ? (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          diffVal >= 0
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        }`}>
                          {diffPct >= 0 ? `+${diffPct}%` : `${diffPct}%`}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[10px]">0%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total / Aggregate Summary Footer Row */}
            <tfoot>
              <tr className="bg-slate-100/90 dark:bg-slate-900/90 font-bold border-t-2 border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white">
                <td className="py-4 px-4 font-sans text-slate-900 dark:text-white">
                  Total {primaryCol?.label || 'Driver'} Model Aggregate
                </td>
                <td className="py-4 px-4 text-right text-slate-600 dark:text-slate-400">
                  {formatNum(baseMetrics.sum, primaryCol?.type)}
                </td>
                <td className="py-4 px-4 text-right text-cyan-600 dark:text-cyan-400 font-bold">
                  {formatNum(liveSimMetrics.sum, primaryCol?.type)}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className={liveSimMetrics.deltaVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {liveSimMetrics.deltaVal !== 0 ? (
                      `${liveSimMetrics.deltaVal > 0 ? '+' : '-'}${formatNum(Math.abs(liveSimMetrics.deltaVal), primaryCol?.type)}`
                    ) : '—'}
                  </span>
                </td>
                <td className="py-4 px-4 text-right font-sans">
                  {liveSimMetrics.deltaVal !== 0 ? (
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                      liveSimMetrics.deltaVal >= 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}>
                      {liveSimMetrics.deltaPct >= 0 ? `+${liveSimMetrics.deltaPct}%` : `${liveSimMetrics.deltaPct}%`}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-xs">0%</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

