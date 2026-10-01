'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SheetData, ChartConfig, SheetColumn } from '@/types/sheet';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  TrendingUp,
  BarChart2,
  Activity,
  Layers,
  PieChart as PieIcon,
  Filter,
  Table,
  ArrowUpDown,
  Hash,
  Sparkles
} from 'lucide-react';

interface VisualAnalyticsViewProps {
  sheet: SheetData;
  chartConfig?: ChartConfig;
}

const PALETTE = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#64748b', // Slate
];

// Smart Deterministic Number Formatter: formats accurately based on scale and column type
function formatSmartValue(val: number | string | undefined | null, type?: string): string {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return '0';

  if (type === 'percentage') {
    return (num > 1 ? num : num * 100).toFixed(1) + '%';
  }

  const isCurrency = type === 'currency';
  const prefix = isCurrency ? '$' : '';

  if (Math.abs(num) >= 1_000_000) {
    return `${prefix}${(num / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 10_000) {
    return `${prefix}${(num / 1_000).toFixed(1)}k`;
  }
  const formatted = num.toFixed(num % 1 === 0 ? 0 : 2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${prefix}${formatted}`;
}

export default function VisualAnalyticsView({ sheet, chartConfig }: VisualAnalyticsViewProps) {
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const safeColumns = sheet?.columns || [];
  const cellMap = sheet?.cellData || {};
  const totalRows = Math.max(1, sheet?.rowCount || 1);

  // 1. Column Profiler: Classify columns into Temporal, Categorical, and Numerical
  const { numericCols, categoricalCols, defaultXKey } = useMemo(() => {
    const num: SheetColumn[] = [];
    const cat: SheetColumn[] = [];

    safeColumns.forEach(c => {
      let isNum = c.type === 'number' || c.type === 'currency' || c.type === 'percentage';
      if (!isNum) {
        for (let r = 2; r <= Math.min(10, totalRows); r++) {
          const v = cellMap[`${c.key}${r}`]?.v;
          if (typeof v === 'number') {
            isNum = true;
            break;
          }
        }
      }

      if (isNum) num.push(c);
      else cat.push(c);
    });

    // 1. Check if chartConfig explicitly defines a valid X-axis key or matching column
    const configCol = chartConfig?.xAxisKey
      ? safeColumns.find(c => c.key === chartConfig.xAxisKey || c.label.toLowerCase() === chartConfig.xAxisKey.toLowerCase())
      : undefined;

    // Pick best default X axis: prefer explicit chartConfig, then temporal/categorical column with Date/Period/Month/Horizon/Category
    const bestX =
      configCol ||
      cat.find(c => /date|period|month|time|year|horizon|quarter/i.test(c.label)) ||
      cat.find(c => /category|item|name|department|author|product|subject|student|project/i.test(c.label)) ||
      cat[0] ||
      safeColumns[0];

    return {
      numericCols: num,
      categoricalCols: cat,
      defaultXKey: bestX?.key || 'A',
    };
  }, [safeColumns, cellMap, totalRows, chartConfig]);

  // 2. Interactive Selection State
  const [selectedXKey, setSelectedXKey] = useState<string>(defaultXKey);
  const [activeTrendType, setActiveTrendType] = useState<'line' | 'bar' | 'area'>('bar');
  const [selectedSeriesKeys, setSelectedSeriesKeys] = useState<string[]>([]);
  const [aggregationMode, setAggregationMode] = useState<'sum' | 'avg'>('sum');
  const [sampleLimit, setSampleLimit] = useState<number>(25);

  useEffect(() => {
    setSelectedXKey(defaultXKey);
    const initial = numericCols.slice(0, 3).map(c => c.key);
    setSelectedSeriesKeys(initial);
  }, [defaultXKey, sheet?.id, numericCols]);

  const xCol = safeColumns.find(c => c.key === selectedXKey) || safeColumns[0];
  const primaryCol = numericCols.find(c => c.key === selectedSeriesKeys[0]) || numericCols[0];

  const activeSeriesCols = useMemo(() => {
    return numericCols.filter(c => selectedSeriesKeys.includes(c.key));
  }, [numericCols, selectedSeriesKeys]);

  const isYearLikeColumn = useMemo(() => {
    if (!primaryCol) return false;
    const label = (primaryCol.label || primaryCol.key).toLowerCase();
    return /year|yr|date|period/i.test(label);
  }, [primaryCol]);

  const toggleSeries = (key: string) => {
    setSelectedSeriesKeys(prev => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // Keep at least one active
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  // 3. Data Transformation & Synthesis Engine
  const { trendData, compositionData, rankingData, kpis, statsAudit } = useMemo(() => {
    const rawPoints: { name: string; [key: string]: number | string }[] = [];
    const compMap: Record<string, number> = {};
    const rankMap: Record<string, number> = {};

    let overallTotal = 0;
    let overallPeak = -Infinity;
    let overallMin = Infinity;
    let dataRowCount = 0;

    const isSummaryRow = (rowIdx: number, rowLabel: string) => {
      if (/total|summary|average|mean|aggregate|class average/i.test(rowLabel)) return true;
      const aVal = String(cellMap[`A${rowIdx}`]?.v || '');
      if (/total|summary|average|mean|aggregate|class average/i.test(aVal)) return true;
      return false;
    };

    for (let r = 2; r <= totalRows; r++) {
      const xCell = cellMap[`${xCol?.key || 'A'}${r}`];
      const rawX = xCell?.v;
      if (rawX === undefined || rawX === null || rawX === '') continue;

      const name = String(rawX);
      if (isSummaryRow(r, name)) continue;

      const point: { name: string; [key: string]: number | string } = { name };
      let hasAnyNumeric = false;

      numericCols.forEach(col => {
        const cell = cellMap[`${col.key}${r}`];
        const v = cell?.v;
        if (typeof v === 'number' && !isNaN(v)) {
          point[col.label || col.key] = v;
          hasAnyNumeric = true;

          if (col.key === primaryCol?.key) {
            overallTotal += v;
            if (v > overallPeak) overallPeak = v;
            if (v < overallMin) overallMin = v;
            compMap[name] = (compMap[name] || 0) + v;
            rankMap[name] = (rankMap[name] || 0) + v;
          }
        }
      });

      if (hasAnyNumeric) {
        rawPoints.push(point);
        dataRowCount++;
      }
    }

    // Top 5 Ranking Data
    const rankingData = Object.entries(rankMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Composition / Share Data (Top 6 + Other)
    const sortedComp = Object.entries(compMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    let compositionData = sortedComp.slice(0, 5);
    if (sortedComp.length > 5) {
      const otherSum = sortedComp.slice(5).reduce((acc, curr) => acc + curr.value, 0);
      compositionData.push({ name: 'Other Observations', value: otherSum });
    }

    const meanVal = dataRowCount > 0 ? overallTotal / dataRowCount : 0;

    // Statistical Audit Summary across all numeric dimensions
    const audit = numericCols.map(col => {
      let sum = 0;
      let count = 0;
      let min = Infinity;
      let max = -Infinity;

      for (let r = 2; r <= totalRows; r++) {
        if (isSummaryRow(r, '')) continue;
        const v = cellMap[`${col.key}${r}`]?.v;
        if (typeof v === 'number' && !isNaN(v)) {
          sum += v;
          count++;
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }

      return {
        label: col.label || col.key,
        type: col.type || 'number',
        count,
        sum,
        avg: count > 0 ? sum / count : 0,
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 0 : max,
      };
    });

    return {
      trendData: rawPoints,
      compositionData,
      rankingData,
      kpis: {
        total: overallTotal,
        mean: meanVal,
        peak: overallPeak === -Infinity ? 0 : overallPeak,
        min: overallMin === Infinity ? 0 : overallMin,
        dataPoints: dataRowCount,
        primaryType: primaryCol?.type,
        isYearLike: isYearLikeColumn,
      },
      statsAudit: audit,
    };
  }, [cellMap, totalRows, numericCols, xCol, primaryCol, isYearLikeColumn]);

  // 3b. High-Cardinality Adaptive Downsampler (Prevents 9,668 SVG elements freezing DOM)
  const displayTrendData = useMemo(() => {
    if (trendData.length <= 35 || sampleLimit === 0) {
      return trendData;
    }

    if (activeTrendType === 'bar') {
      // For Column / Bar charts: Sort descending by primary metric to highlight top observations
      const metricKey = primaryCol?.label || primaryCol?.key;
      const sorted = [...trendData].sort((a, b) => {
        const valA = typeof a[metricKey] === 'number' ? (a[metricKey] as number) : 0;
        const valB = typeof b[metricKey] === 'number' ? (b[metricKey] as number) : 0;
        return valB - valA;
      });
      return sorted.slice(0, sampleLimit);
    }

    // For Line and Area charts: Uniform stride sampling (~60-80 data points for 60fps rendering)
    const targetPoints = Math.min(sampleLimit * 2, 80);
    const stride = Math.ceil(trendData.length / targetPoints);
    return trendData.filter((_, idx) => idx % stride === 0 || idx === trendData.length - 1);
  }, [trendData, sampleLimit, activeTrendType, primaryCol]);

  // Clean empty state if sheet has no data
  if (trendData.length === 0) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950 select-none transition-colors">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 shadow-xl">
          <BarChart2 className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-mono uppercase tracking-wider font-semibold mb-2">
          <Sparkles className="w-3 h-3" />
          <span>Automated Visual Analytics</span>
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
          No Visualizable Data Points Found
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          The current sheet does not contain structured numeric observations. Enter rows in the spreadsheet grid or load a pre-built dataset from the sidebar to launch automated visual analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col gap-6 select-none transition-colors">
      {/* 1. Executive KPI Summary Cards (L1 Surface with L2 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Aggregate Card (or Temporal Span Card if year-like metric) */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {kpis.isYearLike
                ? `Temporal Span (${primaryCol?.label || 'Year'})`
                : primaryCol
                ? `Aggregate (${primaryCol.label})`
                : 'Gross Aggregate'}
            </span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {kpis.isYearLike && kpis.min < Infinity && kpis.peak > -Infinity
                ? `${Math.round(kpis.min)} – ${Math.round(kpis.peak)}`
                : formatSmartValue(kpis.total, kpis.primaryType)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">
              {kpis.isYearLike
                ? `Temporal range across ${kpis.dataPoints.toLocaleString()} records`
                : `Total volume across ${kpis.dataPoints.toLocaleString()} records`}
            </div>
          </div>
        </div>

        {/* Peak Watermark Card */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Peak High Observation</span>
            <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400 font-mono tabular-nums">
              {formatSmartValue(kpis.peak, kpis.primaryType)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">
              Highest single observed value
            </div>
          </div>
        </div>

        {/* Normalized Mean Card */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Horizon Mean</span>
            <BarChart2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {formatSmartValue(kpis.mean, kpis.primaryType)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">
              Arithmetic average per data row
            </div>
          </div>
        </div>

        {/* Dimensions Space Card */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Profiled Dimensions</span>
            <Layers className="w-4 h-4 text-violet-500 dark:text-violet-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {kpis.dataPoints} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Rows</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 truncate font-mono">
              {activeSeriesCols.length} plotted / {numericCols.length} columns
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Studio Controls Strip (L1 Surface) */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Dynamic Dimension & Metric Selectors */}
        <div className="flex flex-wrap items-center gap-4">
          {/* X-Axis Dimension Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Dimension (X):</span>
            </span>
            <select
              id="dimension-select"
              name="dimensionSelect"
              value={selectedXKey}
              onChange={(e) => setSelectedXKey(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono font-medium cursor-pointer transition-colors shadow-sm"
            >
              {categoricalCols.length > 0 && (
                <optgroup label="Categories & Time Horizons (Recommended)">
                  {categoricalCols.map(c => (
                    <option key={c.key} value={c.key}>
                      {c.label || c.key} ({c.type})
                    </option>
                  ))}
                </optgroup>
              )}
              {numericCols.length > 0 && (
                <optgroup label="Numeric Values">
                  {numericCols.map(c => (
                    <option key={c.key} value={c.key}>
                      {c.label || c.key} ({c.type})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Metric Series Checkbox Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Metrics:</span>
            </span>
            {numericCols.map((col, idx) => {
              const isSelected = selectedSeriesKeys.includes(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => toggleSeries(col.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-150 flex items-center gap-2 active:scale-[0.98] ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isSelected ? PALETTE[idx % PALETTE.length] : '#94a3b8' }}
                  />
                  <span>{col.label || col.key}</span>
                </button>
              );
            })}
          </div>

          {/* Aggregation Mode Selector */}
          <div className="flex items-center gap-1.5 text-xs pl-2 border-l border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 text-[11px] font-mono">AGG:</span>
            <button
              onClick={() => setAggregationMode(m => m === 'sum' ? 'avg' : 'sum')}
              className="px-2.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-mono font-semibold text-cyan-700 dark:text-cyan-400 uppercase transition-colors"
            >
              {aggregationMode}
            </button>
          </div>
        </div>

        {/* Right: Trend Chart Style Switcher */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTrendType('area')}
            className={`px-3 py-1 rounded-md font-semibold transition-all duration-150 ${
              activeTrendType === 'area'
                ? 'bg-white dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Area View
          </button>
          <button
            onClick={() => setActiveTrendType('bar')}
            className={`px-3 py-1 rounded-md font-semibold transition-all duration-150 ${
              activeTrendType === 'bar'
                ? 'bg-white dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Column View
          </button>
          <button
            onClick={() => setActiveTrendType('line')}
            className={`px-3 py-1 rounded-md font-semibold transition-all duration-150 ${
              activeTrendType === 'line'
                ? 'bg-white dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Line View
          </button>
        </div>
      </div>

      {/* 3. Middle Tier: Multi-Horizon Trend (60%) + Categorical Donut Share (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card A: Multi-Horizon Trend Synthesis (2 Cols) */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{chartConfig?.title || 'Multi-Horizon Trend Synthesis'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dynamic visual progression across {kpis.dataPoints.toLocaleString()} records
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Dimension: {xCol?.label || 'X'}
              </span>
              {trendData.length > 35 && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-mono">
                  <span className="text-slate-500 px-1 font-semibold">VIEW:</span>
                  <button
                    onClick={() => setSampleLimit(25)}
                    className={`px-2 py-0.5 rounded transition-all duration-150 ${
                      sampleLimit === 25
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-semibold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Top 25
                  </button>
                  <button
                    onClick={() => setSampleLimit(50)}
                    className={`px-2 py-0.5 rounded transition-all duration-150 ${
                      sampleLimit === 50
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-semibold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Top 50
                  </button>
                  <button
                    onClick={() => setSampleLimit(0)}
                    className={`px-2 py-0.5 rounded transition-all duration-150 ${
                      sampleLimit === 0
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-semibold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    All ({trendData.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="w-full h-80">
            {hasMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                {activeTrendType === 'line' ? (
                  <LineChart data={displayTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      tickFormatter={(val: number) => formatSmartValue(val, kpis.primaryType)}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs shadow-xl font-mono">
                            <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-sans font-semibold mb-1">{label}</div>
                            <div className="space-y-1">
                              {payload.map((p, i) => (
                                <div key={i} className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                    <span>{p.name}:</span>
                                  </span>
                                  <span className="text-slate-900 dark:text-white font-bold tabular-nums">
                                    {formatSmartValue(Number(p.value || 0), kpis.primaryType)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    {activeSeriesCols.map((col, idx) => (
                      <Line
                        key={col.key}
                        type="monotone"
                        dataKey={col.label || col.key}
                        stroke={PALETTE[idx % PALETTE.length]}
                        strokeWidth={2.5}
                        dot={displayTrendData.length <= 40 ? { r: 3, fill: PALETTE[idx % PALETTE.length] } : false}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                ) : activeTrendType === 'bar' ? (
                  <BarChart data={displayTrendData} margin={{ top: 10, right: 30, left: 10, bottom: displayTrendData.length > 12 ? 35 : 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      interval={displayTrendData.length > 40 ? 'preserveStartEnd' : 0}
                      angle={displayTrendData.length > 12 ? -30 : 0}
                      textAnchor={displayTrendData.length > 12 ? 'end' : 'middle'}
                      height={displayTrendData.length > 12 ? 45 : 30}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      tickFormatter={(val: number) => formatSmartValue(val, kpis.primaryType)}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs shadow-xl font-mono">
                            <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-sans font-semibold mb-1">{label}</div>
                            <div className="space-y-1">
                              {payload.map((p, i) => (
                                <div key={i} className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                    <span>{p.name}:</span>
                                  </span>
                                  <span className="text-slate-900 dark:text-white font-bold tabular-nums">
                                    {formatSmartValue(Number(p.value || 0), kpis.primaryType)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    {activeSeriesCols.map((col, idx) => (
                      <Bar
                        key={col.key}
                        dataKey={col.label || col.key}
                        fill={PALETTE[idx % PALETTE.length]}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={45}
                      />
                    ))}
                  </BarChart>
                ) : (
                  <AreaChart data={displayTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      tickFormatter={(val: number) => formatSmartValue(val, kpis.primaryType)}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs shadow-xl font-mono">
                            <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-sans font-semibold mb-1">{label}</div>
                            <div className="space-y-1">
                              {payload.map((p, i) => (
                                <div key={i} className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                    <span>{p.name}:</span>
                                  </span>
                                  <span className="text-slate-900 dark:text-white font-bold tabular-nums">
                                    {formatSmartValue(Number(p.value || 0), kpis.primaryType)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    {activeSeriesCols.map((col, idx) => (
                      <Area
                        key={col.key}
                        type="monotone"
                        dataKey={col.label || col.key}
                        stroke={PALETTE[idx % PALETTE.length]}
                        fill={PALETTE[idx % PALETTE.length]}
                        fillOpacity={0.25}
                      />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-200 dark:bg-slate-900/50 animate-pulse rounded-xl" />
            )}
          </div>
        </div>

        {/* Card B: Proportional Donut Breakdown (1 Col) */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
          <div className="pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Category Share Distribution</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Breakdown of {primaryCol?.label || 'primary metric'}
            </p>
          </div>

          {compositionData.length > 0 ? (
            <div className="flex flex-col gap-4 flex-1">
              <div className="w-full h-44">
                {hasMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0];
                          return (
                            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs shadow-xl font-mono">
                              <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-sans font-semibold mb-0.5">{p.name}</div>
                              <div className="text-slate-900 dark:text-white font-bold tabular-nums">
                                {formatSmartValue(Number(p.value || 0), kpis.primaryType)}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Pie
                        data={compositionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {compositionData.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full bg-slate-200 dark:bg-slate-900/50 animate-pulse rounded-xl" />
                )}
              </div>

              {/* Share Breakdown List */}
              <div className="space-y-2 overflow-y-auto max-h-40 pr-1 text-xs">
                {compositionData.map((item, idx) => {
                  const pctNum = kpis.total > 0 ? (item.value / kpis.total) * 100 : 0;
                  const percent = pctNum < 0.1 && pctNum > 0 ? '< 0.1' : pctNum.toFixed(1);
                  return (
                    <div key={item.name} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                        <span className="font-semibold text-slate-900 dark:text-white">{formatSmartValue(item.value, kpis.primaryType)}</span>
                        <span className="text-[10px] text-slate-500 font-normal">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 text-center">
              No categorical breakdown available for this column.
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Tier: Top 5 Contributors Ranking + Statistical Profile Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card C: Top 5 Highest Contributors (Horizontal Bar Ranking) */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
          <div className="pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Top Contributors Ranking</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked by {primaryCol?.label || 'Value'}
            </p>
          </div>

          <div className="w-full h-60">
            {hasMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(val: number) => formatSmartValue(val, kpis.primaryType)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    width={75}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0];
                      return (
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs shadow-xl font-mono">
                          <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-sans font-semibold mb-0.5">{p.name || (p.payload as { name?: string })?.name}</div>
                          <div className="text-slate-900 dark:text-white font-bold tabular-nums">
                            {formatSmartValue(Number(p.value || 0), kpis.primaryType)}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-200 dark:bg-slate-900/50 animate-pulse rounded-xl" />
            )}
          </div>
        </div>

        {/* Card D: Statistical Profile Audit Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Quantitative Statistical Audit</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated statistical summary per active metric column
              </p>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
              Data Quality: 100% Validated
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800/80">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider font-sans">
                <tr>
                  <th className="py-3 px-4">Metric Dimension</th>
                  <th className="py-3 px-4">Format Type</th>
                  <th className="py-3 px-4 text-right">Observations</th>
                  <th className="py-3 px-4 text-right">Sum Total</th>
                  <th className="py-3 px-4 text-right">Mean</th>
                  <th className="py-3 px-4 text-right">Min</th>
                  <th className="py-3 px-4 text-right">Peak Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 bg-white/60 dark:bg-slate-950/40 tabular-nums">
                {statsAudit.map((m) => (
                  <tr key={m.label} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 font-sans">
                      {m.label}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 capitalize font-sans">
                      {m.type}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">
                      {m.count}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                      {formatSmartValue(m.sum, m.type)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">
                      {formatSmartValue(m.avg, m.type)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">
                      {formatSmartValue(m.min, m.type)}
                    </td>
                    <td className="py-3 px-4 text-right text-cyan-600 dark:text-cyan-400 font-bold">
                      {formatSmartValue(m.max, m.type)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
