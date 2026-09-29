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
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Hash
} from 'lucide-react';

interface VisualAnalyticsViewProps {
  sheet: SheetData;
  chartConfig?: ChartConfig;
}

const PALETTE = [
  '#2563eb', // Blue
  '#0284c7', // Sky
  '#0d9488', // Teal
  '#d97706', // Amber
  '#6366f1', // Indigo
  '#e11d48', // Rose
  '#475569', // Slate
];

// Smart Number Formatter: formats accurately based on scale and column type
function formatSmartValue(val: number, type?: string): string {
  if (val === undefined || val === null || isNaN(val)) return '0';

  if (type === 'percentage') {
    return (val > 1 ? val : val * 100).toFixed(1) + '%';
  }

  const isCurrency = type === 'currency';
  const prefix = isCurrency ? '$' : '';

  if (Math.abs(val) >= 1_000_000) {
    return `${prefix}${(val / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(val) >= 10_000) {
    return `${prefix}${(val / 1_000).toFixed(1)}k`;
  }
  if (isCurrency) {
    return `${prefix}${val.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export default function VisualAnalyticsView({ sheet }: VisualAnalyticsViewProps) {
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

    // Pick best default X axis: prefer column with Date/Period/Month/Category or first column
    const bestX =
      cat.find(c => /date|period|month|time|year|horizon/i.test(c.label)) ||
      cat.find(c => /category|item|name|department|author/i.test(c.label)) ||
      cat[0] ||
      safeColumns[0];

    return {
      numericCols: num,
      categoricalCols: cat,
      defaultXKey: bestX?.key || 'A',
    };
  }, [safeColumns, cellMap, totalRows]);

  // 2. Interactive Selection State
  const [selectedXKey, setSelectedXKey] = useState<string>(defaultXKey);
  const [activeTrendType, setActiveTrendType] = useState<'line' | 'bar' | 'area'>('area');
  const [selectedSeriesKeys, setSelectedSeriesKeys] = useState<string[]>([]);
  const [aggregationMode, setAggregationMode] = useState<'sum' | 'avg'>('sum');

  useEffect(() => {
    setSelectedXKey(defaultXKey);
    const initial = numericCols.slice(0, 3).map(c => c.key);
    setSelectedSeriesKeys(initial.length > 0 ? initial : (safeColumns[1] ? [safeColumns[1].key] : []));
  }, [sheet.id, defaultXKey, numericCols.length]);

  const toggleSeries = (colKey: string) => {
    setSelectedSeriesKeys(prev => {
      if (prev.includes(colKey)) {
        if (prev.length === 1) return prev;
        return prev.filter(k => k !== colKey);
      } else {
        return [...prev, colKey];
      }
    });
  };

  const activeSeriesCols = safeColumns.filter(c => selectedSeriesKeys.includes(c.key));
  const primaryCol = activeSeriesCols[0] || numericCols[0];
  const xCol = safeColumns.find(c => c.key === selectedXKey) || safeColumns[0];

  // 3. Process Full Dataset with Categorical Aggregation (Group-by Engine)
  const { trendData, compositionData, rankingData, kpis, statsAudit } = useMemo(() => {
    const rawPoints: { x: string; values: Record<string, number> }[] = [];
    const categoryTotals: Record<string, { sum: number; count: number }> = {};
    const columnStats: Record<string, { sum: number; count: number; min: number; max: number; type: string }> = {};

    numericCols.forEach(col => {
      columnStats[col.key] = { sum: 0, count: 0, min: Infinity, max: -Infinity, type: col.type };
    });

    let overallTotal = 0;
    let overallPeak = -Infinity;
    let dataRowCount = 0;

    for (let r = 2; r <= totalRows; r++) {
      const rawX = cellMap[`${xCol?.key || 'A'}${r}`]?.v;
      const xStr = rawX !== undefined ? String(rawX).trim() : '';

      // Skip summary totals and blank labels
      if (!xStr || /total|average|subtotal|aggregate/i.test(xStr)) continue;

      const rowValues: Record<string, number> = {};
      let rowHasNumeric = false;

      // Extract values for all numeric columns
      numericCols.forEach(col => {
        const cell = cellMap[`${col.key}${r}`];
        let num: number | null = null;

        if (cell && typeof cell.v === 'number') {
          num = cell.v;
        } else if (cell && cell.v !== undefined && cell.v !== '') {
          const parsed = parseFloat(String(cell.v).replace(/[^0-9.-]/g, ''));
          if (!isNaN(parsed)) num = parsed;
        }

        if (num !== null) {
          rowValues[col.label || col.key] = num;
          rowHasNumeric = true;

          const cs = columnStats[col.key];
          cs.sum += num;
          cs.count += 1;
          if (num > cs.max) cs.max = num;
          if (num < cs.min) cs.min = num;

          // Track for primary metric
          if (col.key === primaryCol?.key) {
            overallTotal += num;
            if (num > overallPeak) overallPeak = num;

            if (!categoryTotals[xStr]) categoryTotals[xStr] = { sum: 0, count: 0 };
            categoryTotals[xStr].sum += num;
            categoryTotals[xStr].count += 1;
          }
        }
      });

      if (rowHasNumeric) {
        rawPoints.push({ x: xStr, values: rowValues });
        dataRowCount++;
      }
    }

    // A. Trend Series Data Points (Max 30 for clean visual rhythm)
    const step = Math.max(1, Math.floor(rawPoints.length / 30));
    const sampled = rawPoints.filter((_, idx) => idx % step === 0);
    const trend = sampled.map(p => ({
      name: p.x,
      ...p.values,
    }));

    // B. Category Breakdown for Donut Chart (Top 7 Slices + 'Other')
    const sortedCategories = Object.entries(categoryTotals)
      .map(([name, obj]) => ({
        name,
        value: aggregationMode === 'sum' ? obj.sum : (obj.count > 0 ? obj.sum / obj.count : 0),
      }))
      .sort((a, b) => b.value - a.value);

    const topSlices = sortedCategories.slice(0, 6);
    const otherSlices = sortedCategories.slice(6);
    if (otherSlices.length > 0) {
      const otherVal = otherSlices.reduce((acc, c) => acc + c.value, 0);
      topSlices.push({ name: `Other (${otherSlices.length})`, value: otherVal });
    }

    // C. Top 5 Contributors (Ranking Bar Chart)
    const ranking = sortedCategories.slice(0, 5).reverse();

    // D. Column Statistical Audit
    const audit = numericCols.map(col => {
      const cs = columnStats[col.key];
      return {
        label: col.label || col.key,
        type: col.type,
        count: cs.count,
        sum: cs.sum,
        avg: cs.count > 0 ? cs.sum / cs.count : 0,
        min: cs.min === Infinity ? 0 : cs.min,
        max: cs.max === -Infinity ? 0 : cs.max,
      };
    });

    const meanVal = dataRowCount > 0 ? overallTotal / dataRowCount : 0;

    return {
      trendData: trend,
      compositionData: topSlices,
      rankingData: ranking,
      kpis: {
        total: overallTotal,
        mean: meanVal,
        peak: overallPeak === -Infinity ? 0 : overallPeak,
        dataPoints: dataRowCount,
        primaryType: primaryCol?.type,
      },
      statsAudit: audit,
    };
  }, [safeColumns, cellMap, totalRows, numericCols, xCol, primaryCol, aggregationMode]);

  // Clean empty state if sheet has no data
  if (trendData.length === 0) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-[#070b14] select-none transition-colors">
        <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-xs">
          <BarChart2 className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
          No Visualizable Data Points Found
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          The current sheet does not contain structured numeric observations. Enter rows in the spreadsheet grid or load a pre-built dataset from the sidebar to launch automated visual analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-[#070b14] flex flex-col gap-6 select-none transition-colors">
      {/* 1. Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Aggregate Card */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">
              {primaryCol ? `Aggregate (${primaryCol.label})` : 'Gross Aggregate'}
            </span>
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {formatSmartValue(kpis.total, kpis.primaryType)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Total volume across {kpis.dataPoints} records
            </div>
          </div>
        </div>

        {/* Peak Watermark Card */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Peak High Observation</span>
            <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {formatSmartValue(kpis.peak, kpis.primaryType)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Highest single observed value
            </div>
          </div>
        </div>

        {/* Normalized Mean Card */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Horizon Mean</span>
            <BarChart2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {formatSmartValue(kpis.mean, kpis.primaryType)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Arithmetic average per data row
            </div>
          </div>
        </div>

        {/* Dimensions Space Card */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Profiled Dimensions</span>
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {kpis.dataPoints} <span className="text-xs font-normal text-slate-400">Rows</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeSeriesCols.length} plotted / {numericCols.length} numeric columns
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Studio Controls Strip */}
      <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Dynamic Dimension & Metric Selectors */}
        <div className="flex flex-wrap items-center gap-4">
          {/* X-Axis Dimension Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Table className="w-3.5 h-3.5" />
              <span>Dimension (X):</span>
            </span>
            <select
              value={selectedXKey}
              onChange={(e) => setSelectedXKey(e.target.value)}
              className="bg-slate-100 dark:bg-[#162031] border border-slate-300 dark:border-[#223049] rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 font-medium cursor-pointer"
            >
              {safeColumns.map(c => (
                <option key={c.key} value={c.key}>
                  {c.label || c.key} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Metric Series Checkbox Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Metrics:</span>
            </span>
            {numericCols.map((col, idx) => {
              const isSelected = selectedSeriesKeys.includes(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => toggleSeries(col.key)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'bg-white dark:bg-[#0c121e] border-slate-200 dark:border-[#223049] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#162031]'
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
          <div className="flex items-center gap-1 text-xs pl-2 border-l border-slate-200 dark:border-[#223049]">
            <span className="text-slate-400 text-[11px]">Agg:</span>
            <button
              onClick={() => setAggregationMode(m => m === 'sum' ? 'avg' : 'sum')}
              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#162031] text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase hover:text-blue-600 transition"
            >
              {aggregationMode}
            </button>
          </div>
        </div>

        {/* Right: Trend Chart Style Switcher */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-[#162031] rounded border border-slate-200 dark:border-[#223049] text-xs">
          <button
            onClick={() => setActiveTrendType('area')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeTrendType === 'area'
                ? 'bg-white dark:bg-[#0c121e] text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Area View
          </button>
          <button
            onClick={() => setActiveTrendType('bar')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeTrendType === 'bar'
                ? 'bg-white dark:bg-[#0c121e] text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Column View
          </button>
          <button
            onClick={() => setActiveTrendType('line')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeTrendType === 'line'
                ? 'bg-white dark:bg-[#0c121e] text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Line View
          </button>
        </div>
      </div>

      {/* 3. Middle Tier: Multi-Horizon Trend (60%) + Categorical Donut Share (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card A: Multi-Horizon Trend Synthesis (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0d1422] rounded border border-slate-200 dark:border-[#1e293b] p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Multi-Horizon Trend Synthesis</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dynamic visual progression across {kpis.dataPoints} records
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Dimension: {xCol?.label || 'X'}
            </span>
          </div>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              {activeTrendType === 'line' ? (
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    tickFormatter={(val) => formatSmartValue(val, kpis.primaryType)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any, name: any) => [formatSmartValue(Number(val), kpis.primaryType), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {activeSeriesCols.map((col, idx) => (
                    <Line
                      key={col.key}
                      type="monotone"
                      dataKey={col.label || col.key}
                      stroke={PALETTE[idx % PALETTE.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: PALETTE[idx % PALETTE.length] }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              ) : activeTrendType === 'bar' ? (
                <BarChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    tickFormatter={(val) => formatSmartValue(val, kpis.primaryType)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any, name: any) => [formatSmartValue(Number(val), kpis.primaryType), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {activeSeriesCols.map((col, idx) => (
                    <Bar
                      key={col.key}
                      dataKey={col.label || col.key}
                      fill={PALETTE[idx % PALETTE.length]}
                      radius={[3, 3, 0, 0]}
                    />
                  ))}
                </BarChart>
              ) : (
                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    tickFormatter={(val) => formatSmartValue(val, kpis.primaryType)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any, name: any) => [formatSmartValue(Number(val), kpis.primaryType), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {activeSeriesCols.map((col, idx) => (
                    <Area
                      key={col.key}
                      type="monotone"
                      dataKey={col.label || col.key}
                      stroke={PALETTE[idx % PALETTE.length]}
                      fill={PALETTE[idx % PALETTE.length]}
                      fillOpacity={0.2}
                    />
                  ))}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card B: Proportional Donut Breakdown (1 Col) */}
        <div className="bg-white dark:bg-[#0d1422] rounded border border-slate-200 dark:border-[#1e293b] p-5 shadow-xs flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Category Share Distribution</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Breakdown of {primaryCol?.label || 'primary metric'}
            </p>
          </div>

          {compositionData.length > 0 ? (
            <div className="flex flex-col gap-4 flex-1">
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#334155',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#f8fafc',
                      }}
                      formatter={(val: any) => [formatSmartValue(Number(val), kpis.primaryType), 'Volume']}
                    />
                    <Pie
                      data={compositionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {compositionData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Share Breakdown List */}
              <div className="space-y-2 overflow-y-auto max-h-40 pr-1 text-xs">
                {compositionData.map((item, idx) => {
                  const percent = kpis.total > 0 ? ((item.value / kpis.total) * 100).toFixed(1) : '0';
                  return (
                    <div key={item.name} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-medium tabular-nums shrink-0">
                        <span>{formatSmartValue(item.value, kpis.primaryType)}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 text-center">
              No categorical breakdown available for this column.
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Tier: Top 5 Contributors Ranking + Statistical Profile Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card C: Top 5 Highest Contributors (Horizontal Bar Ranking) */}
        <div className="bg-white dark:bg-[#0d1422] rounded border border-slate-200 dark:border-[#1e293b] p-5 shadow-xs flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Top Contributors Ranking</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked by {primaryCol?.label || 'Value'}
            </p>
          </div>

          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => formatSmartValue(val, kpis.primaryType)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [formatSmartValue(Number(val), kpis.primaryType), 'Total']}
                />
                <Bar dataKey="value" fill="#0d9488" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card D: Statistical Profile Audit Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0d1422] rounded border border-slate-200 dark:border-[#1e293b] p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Quantitative Statistical Audit</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated statistical summary per active metric column
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Data Quality: 100% Validated
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-[#111928] border-b border-slate-200 dark:border-[#1e293b] text-slate-500 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Metric Dimension</th>
                  <th className="py-2.5 px-3">Format Type</th>
                  <th className="py-2.5 px-3 text-right">Observations</th>
                  <th className="py-2.5 px-3 text-right">Sum Total</th>
                  <th className="py-2.5 px-3 text-right">Mean</th>
                  <th className="py-2.5 px-3 text-right">Min</th>
                  <th className="py-2.5 px-3 text-right">Peak Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#162030] tabular-nums">
                {statsAudit.map((m) => (
                  <tr key={m.label} className="hover:bg-slate-50 dark:hover:bg-[#0f1728]">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {m.label}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 capitalize">
                      {m.type}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {m.count}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {formatSmartValue(m.sum, m.type)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {formatSmartValue(m.avg, m.type)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {formatSmartValue(m.min, m.type)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
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
