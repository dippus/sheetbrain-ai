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
  DollarSign,
  Activity,
  Layers,
  PieChart as PieIcon,
  Filter,
  Eye,
  SlidersHorizontal,
  Table
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

// Smart Number Formatter: formats based on value scale and column type
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
  if (Math.abs(val) >= 1_000) {
    return `${prefix}${(val / 1_000).toFixed(1)}k`;
  }
  if (isCurrency) {
    return `${prefix}${val.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export default function VisualAnalyticsView({ sheet, chartConfig }: VisualAnalyticsViewProps) {
  const safeColumns = sheet?.columns || [];
  const cellMap = sheet?.cellData || {};
  const totalRows = Math.max(1, sheet?.rowCount || 1);

  // 1. Detect all numeric columns and string dimension columns
  const { allNumericCols, allDimensionCols } = useMemo(() => {
    const numCols: SheetColumn[] = [];
    const dimCols: SheetColumn[] = [];

    safeColumns.forEach(c => {
      // Check column metadata or sample first 10 rows
      let hasNumeric = c.type === 'number' || c.type === 'currency' || c.type === 'percentage';
      if (!hasNumeric) {
        for (let r = 2; r <= Math.min(10, totalRows); r++) {
          const v = cellMap[`${c.key}${r}`]?.v;
          if (typeof v === 'number') {
            hasNumeric = true;
            break;
          }
        }
      }

      if (hasNumeric) {
        numCols.push(c);
      } else {
        dimCols.push(c);
      }
    });

    return { allNumericCols: numCols, allDimensionCols: dimCols };
  }, [safeColumns, cellMap, totalRows]);

  // 2. Interactive Selection State
  const defaultXKey = allDimensionCols[0]?.key || safeColumns[0]?.key || 'A';
  const [selectedXKey, setSelectedXKey] = useState<string>(defaultXKey);
  const [activeType, setActiveType] = useState<'line' | 'bar' | 'area' | 'pie'>('bar');
  const [selectedSeriesKeys, setSelectedSeriesKeys] = useState<string[]>([]);

  // Initialize selected series when columns change
  useEffect(() => {
    setSelectedXKey(defaultXKey);
    const initialSeries = allNumericCols.slice(0, 3).map(c => c.key);
    setSelectedSeriesKeys(initialSeries.length > 0 ? initialSeries : (safeColumns[1] ? [safeColumns[1].key] : []));
  }, [sheet.id, defaultXKey, allNumericCols.length]);

  // Toggle metric series on/off
  const toggleSeries = (colKey: string) => {
    setSelectedSeriesKeys(prev => {
      if (prev.includes(colKey)) {
        if (prev.length === 1) return prev; // Keep at least one active
        return prev.filter(k => k !== colKey);
      } else {
        return [...prev, colKey];
      }
    });
  };

  // 3. Extract and Aggregate Chart Data Points dynamically
  const { chartData, pieData, kpis } = useMemo(() => {
    const data: Record<string, any>[] = [];
    const xCol = safeColumns.find(c => c.key === selectedXKey) || safeColumns[0];
    const activeCols = safeColumns.filter(c => selectedSeriesKeys.includes(c.key));

    let sumTotal = 0;
    let maxVal = -Infinity;
    let minVal = Infinity;
    let count = 0;

    for (let r = 2; r <= totalRows; r++) {
      const rawX = cellMap[`${xCol?.key || 'A'}${r}`]?.v;
      const xStr = rawX !== undefined ? String(rawX).trim() : '';

      // Skip empty or summary rows
      if (!xStr || xStr.toUpperCase().includes('TOTAL') || xStr.toUpperCase().includes('AVG')) {
        continue;
      }

      const rowObj: Record<string, any> = { name: xStr };
      let hasAnyValue = false;

      activeCols.forEach(col => {
        const cell = cellMap[`${col.key}${r}`];
        let num: number | null = null;

        if (cell && typeof cell.v === 'number') {
          num = cell.v;
        } else if (cell && cell.v !== undefined && cell.v !== '') {
          const parsed = parseFloat(String(cell.v).replace(/[^0-9.-]/g, ''));
          if (!isNaN(parsed)) num = parsed;
        }

        if (num !== null) {
          rowObj[col.label || col.key] = num;
          sumTotal += num;
          if (num > maxVal) maxVal = num;
          if (num < minVal) minVal = num;
          count++;
          hasAnyValue = true;
        }
      });

      if (hasAnyValue) {
        data.push(rowObj);
      }
    }

    // Pie chart distribution of the first selected metric across X items
    const primaryCol = activeCols[0];
    const pie: { name: string; value: number }[] = [];
    if (primaryCol) {
      data.forEach(d => {
        const v = d[primaryCol.label || primaryCol.key];
        if (typeof v === 'number' && v > 0) {
          pie.push({ name: String(d.name), value: v });
        }
      });
    }

    const avgVal = count > 0 ? sumTotal / count : 0;

    return {
      chartData: data,
      pieData: pie.slice(0, 10), // Top 10 slices for clean pie rendering
      kpis: {
        total: sumTotal,
        avg: avgVal,
        max: maxVal === -Infinity ? 0 : maxVal,
        min: minVal === Infinity ? 0 : minVal,
        dataPoints: data.length,
        primaryType: primaryCol?.type,
      },
    };
  }, [safeColumns, cellMap, totalRows, selectedXKey, selectedSeriesKeys]);

  const activeCols = safeColumns.filter(c => selectedSeriesKeys.includes(c.key));
  const primaryCol = activeCols[0];

  // Empty state guard
  if (chartData.length === 0) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-[#070b14] select-none transition-colors">
        <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-xs">
          <BarChart2 className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
          No Visualizable Data Points Yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          The active spreadsheet contains empty cells. Enter data rows in the spreadsheet grid or select a dataset from the left sidebar to generate dynamic analytics in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-[#070b14] flex flex-col gap-6 select-none transition-colors">
      {/* 1. Dynamic Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Metric Card */}
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
              Sum across {kpis.dataPoints} data horizons
            </div>
          </div>
        </div>

        {/* Peak Watermark Card */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Peak High</span>
            <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {formatSmartValue(kpis.max, kpis.primaryType)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Highest single observed value
            </div>
          </div>
        </div>

        {/* Mean Card */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Period Average</span>
            <BarChart2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {formatSmartValue(kpis.avg, kpis.primaryType)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Arithmetic mean per horizon
            </div>
          </div>
        </div>

        {/* Active Dimensions Card */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Model Dimensions</span>
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {kpis.dataPoints} <span className="text-xs font-normal text-slate-400">Rows</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeCols.length} plotted metrics of {allNumericCols.length} available
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Chart Studio Controls Bar */}
      <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Dimension & Metric Selectors */}
        <div className="flex flex-wrap items-center gap-4">
          {/* X-Axis Dimension Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Table className="w-3.5 h-3.5" />
              <span>X-Axis:</span>
            </span>
            <select
              value={selectedXKey}
              onChange={(e) => setSelectedXKey(e.target.value)}
              className="bg-slate-100 dark:bg-[#162031] border border-slate-300 dark:border-[#223049] rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 font-medium cursor-pointer"
            >
              {safeColumns.map(c => (
                <option key={c.key} value={c.key}>
                  {c.label || c.key} (Col {c.key})
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
            {allNumericCols.map((col, idx) => {
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
        </div>

        {/* Right: Chart Type Switcher */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-[#162031] rounded border border-slate-200 dark:border-[#223049] text-xs">
          <button
            onClick={() => setActiveType('bar')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeType === 'bar'
                ? 'bg-white dark:bg-[#0c121e] text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Bar Chart
          </button>
          <button
            onClick={() => setActiveType('line')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeType === 'line'
                ? 'bg-white dark:bg-[#0c121e] text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Line Chart
          </button>
          <button
            onClick={() => setActiveType('area')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeType === 'area'
                ? 'bg-white dark:bg-[#0c121e] text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Area Chart
          </button>
          <button
            onClick={() => setActiveType('pie')}
            className={`px-3 py-1 rounded font-medium transition flex items-center gap-1 ${
              activeType === 'pie'
                ? 'bg-white dark:bg-[#0c121e] text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieIcon className="w-3 h-3" />
            <span>Donut</span>
          </button>
        </div>
      </div>

      {/* 3. Dual Chart Layout: Main Visual + Composition Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interactive Chart Card (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0d1422] rounded border border-slate-200 dark:border-[#1e293b] p-5 shadow-xs flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Multi-Horizon Trend Synthesis</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparative visualization plotted across active metrics
            </p>
          </div>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              {activeType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
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
                  {activeCols.map((col, idx) => (
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
              ) : activeType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
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
                  {activeCols.map((col, idx) => (
                    <Bar
                      key={col.key}
                      dataKey={col.label || col.key}
                      fill={PALETTE[idx % PALETTE.length]}
                      radius={[3, 3, 0, 0]}
                    />
                  ))}
                </BarChart>
              ) : activeType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
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
                  {activeCols.map((col, idx) => (
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
              ) : (
                <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any) => [formatSmartValue(Number(val), kpis.primaryType), 'Value']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Card: Share of Distribution / Donut Composition */}
        <div className="bg-white dark:bg-[#0d1422] rounded border border-slate-200 dark:border-[#1e293b] p-5 shadow-xs flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Category Share Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Proportional distribution of {primaryCol?.label || 'primary metric'}
            </p>
          </div>

          {pieData.length > 0 ? (
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
                      formatter={(val: any) => [formatSmartValue(Number(val), kpis.primaryType), 'Share']}
                    />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Share Breakdown List */}
              <div className="space-y-2 overflow-y-auto max-h-40 pr-1 text-xs">
                {pieData.map((item, idx) => {
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
    </div>
  );
}
