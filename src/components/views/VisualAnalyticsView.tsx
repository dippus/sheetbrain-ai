'use client';

import React, { useState, useMemo } from 'react';
import { SheetData, ChartConfig } from '@/types/sheet';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
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
  Layers
} from 'lucide-react';

interface VisualAnalyticsViewProps {
  sheet: SheetData;
  chartConfig: ChartConfig;
}

export default function VisualAnalyticsView({ sheet, chartConfig }: VisualAnalyticsViewProps) {
  const safeChartConfig = chartConfig || {
    type: 'line',
    title: 'Visual Analytics',
    xAxisKey: sheet?.columns?.[0]?.key || 'A',
    series: [{ key: 'B', label: 'Metric', color: '#2563eb' }]
  };
  const [activeType, setActiveType] = useState<'line' | 'bar' | 'area'>(safeChartConfig.type || 'line');

  const { chartData, numericCols, kpis } = useMemo(() => {
    const cols = sheet?.columns || [];
    const cellMap = sheet?.cellData || {};
    const totalRows = Math.max(2, sheet?.rowCount || 2);
    const data: Record<string, any>[] = [];
    const xCol = (sheet?.columns || []).find(c =>
      c.label.toLowerCase().includes('month') ||
      c.label.toLowerCase().includes('period') ||
      c.label.toLowerCase().includes('item') ||
      c.key === 'A'
    );
    const xKey = xCol ? xCol.key : 'A';

    const numCols = (sheet?.columns || []).filter(c =>
      c.key !== xKey &&
      (c.type === 'currency' || c.type === 'number' || c.type === 'percentage')
    );

    let totalSum = 0;
    let maxVal = 0;
    let dataPointCount = 0;

    for (let r = 2; r <= totalRows; r++) {
      const firstCellVal = String(cellMap[`A${r}`]?.v || '');
      if (firstCellVal.toUpperCase().includes('TOTAL') || firstCellVal.toUpperCase().includes('AVG')) {
        continue;
      }

      const rowObj: Record<string, any> = {};
      const xVal = cellMap[`${xKey}${r}`]?.v;
      if (!xVal) continue;
      rowObj['name'] = String(xVal);

      (sheet?.columns || []).forEach(col => {
        const cell = cellMap[`${col.key}${r}`];
        if (cell && typeof cell.v === 'number') {
          rowObj[col.label] = cell.v;
          totalSum += cell.v;
          if (cell.v > maxVal) maxVal = cell.v;
          dataPointCount++;
        } else if (cell && cell.v !== undefined) {
          const num = parseFloat(String(cell.v).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) {
            rowObj[col.label] = num;
            totalSum += num;
            if (num > maxVal) maxVal = num;
            dataPointCount++;
          }
        }
      });

      data.push(rowObj);
    }

    const avgVal = dataPointCount > 0 ? Math.round(totalSum / dataPointCount) : 0;
    return {
      chartData: data,
      numericCols: numCols,
      kpis: {
        total: totalSum,
        max: maxVal,
        avg: avgVal,
        count: sheet.rowCount - 1,
      },
    };
  }, [sheet]);

  const palette = ['#2563eb', '#0284c7', '#0d9488', '#d97706', '#6366f1'];

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-[#070b14] flex flex-col gap-6 select-none transition-colors">
      {/* 1. Executive Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Aggregate */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold font-medium">Gross Aggregate</span>
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold  tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              ${kpis.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Full horizon cumulative</span>
            </div>
          </div>
        </div>

        {/* Peak Watermark */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold font-medium">Peak Watermark</span>
            <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold  tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              ${kpis.max.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 ">
              Highest single cell observation
            </div>
          </div>
        </div>

        {/* Normalized Average */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold font-medium">Period Mean</span>
            <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold  tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              ${kpis.avg.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 ">
              Arithmetic mean per metric
            </div>
          </div>
        </div>

        {/* Dimension Count */}
        <div className="bg-white dark:bg-[#0d1422] p-4 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold font-medium">Dimension Space</span>
            <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold  tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {kpis.count} <span className="text-sm font-normal text-slate-400">Periods</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 ">
              {sheet.columns.length} columns x {sheet.rowCount} rows
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Chart Container */}
      <div className="bg-white dark:bg-[#0d1422] rounded border border-slate-200 dark:border-[#1e293b] p-5 shadow-xs flex flex-col gap-4">
        {/* Chart Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-[#1a2538]">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Data Trend Synthesis</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparative visualization across model periods and metrics
            </p>
          </div>

          {/* Chart Type Toggle Strip */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-[#162031] rounded border border-slate-200 dark:border-[#223049] text-xs">
            <button
              onClick={() => setActiveType('line')}
              className={`px-3 py-1 rounded font-medium transition ${
                activeType === 'line'
                  ? 'bg-white dark:bg-[#0c121e] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Line Projection
            </button>
            <button
              onClick={() => setActiveType('bar')}
              className={`px-3 py-1 rounded font-medium transition ${
                activeType === 'bar'
                  ? 'bg-white dark:bg-[#0c121e] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bar Comparison
            </button>
            <button
              onClick={() => setActiveType('area')}
              className={`px-3 py-1 rounded font-medium transition ${
                activeType === 'area'
                  ? 'bg-white dark:bg-[#0c121e] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Stacked Area
            </button>
          </div>
        </div>

        {/* Visual Chart Canvas */}
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            {activeType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#f8fafc',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {numericCols.map((col, idx) => (
                  <Line
                    key={col.key}
                    type="monotone"
                    dataKey={col.label}
                    stroke={palette[idx % palette.length]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: palette[idx % palette.length] }}
                    activeDot={{ r: 5 }}
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
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {numericCols.map((col, idx) => (
                  <Bar
                    key={col.key}
                    dataKey={col.label}
                    fill={palette[idx % palette.length]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {numericCols.map((col, idx) => (
                  <Area
                    key={col.key}
                    type="monotone"
                    dataKey={col.label}
                    stroke={palette[idx % palette.length]}
                    fill={palette[idx % palette.length]}
                    fillOpacity={0.15}
                  />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
