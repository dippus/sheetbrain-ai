'use client';

import React, { useState, useMemo } from 'react';
import { ChartConfig, SheetData } from '@/types/sheet';
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
  LineChart as LineIcon,
  Activity,
  Layers
} from 'lucide-react';

interface DynamicChartCardProps {
  config: ChartConfig;
  sheet: SheetData;
}

export default function DynamicChartCard({ config, sheet }: DynamicChartCardProps) {
  const [activeChartType, setActiveChartType] = useState<'line' | 'bar' | 'area'>(config.type || 'line');

  // Transform sheet grid rows into recharts-compatible data objects
  const { chartData, kpis } = useMemo(() => {
    const data: Record<string, any>[] = [];
    const xCol = sheet.columns.find(c =>
      c.label.toLowerCase().includes('month') ||
      c.label.toLowerCase().includes('channel') ||
      c.label.toLowerCase().includes('item') ||
      c.key === 'A'
    );
    const xKey = xCol ? xCol.key : 'A';

    let totalSum = 0;
    let maxVal = 0;
    let dataPointCount = 0;

    for (let r = 2; r <= sheet.rowCount; r++) {
      const firstCellVal = String(sheet.cellData[`A${r}`]?.v || '');
      if (firstCellVal.toUpperCase().includes('TOTAL') || firstCellVal.toUpperCase().includes('AVG')) {
        continue;
      }

      const rowObj: Record<string, any> = {};
      const xVal = sheet.cellData[`${xKey}${r}`]?.v;
      if (!xVal) continue;
      rowObj['name'] = String(xVal);

      sheet.columns.forEach(col => {
        const cell = sheet.cellData[`${col.key}${r}`];
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
      kpis: {
        total: totalSum,
        max: maxVal,
        avg: avgVal,
      },
    };
  }, [sheet]);

  const series = config.series.length > 0 ? config.series : [{ key: 'B', label: 'Value', color: '#10b981' }];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{config.title}</h3>
            <p className="text-[11px] text-slate-400">Reactive visualization synced to grid</p>
          </div>
        </div>

        {/* Chart Type Segmented Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveChartType('line')}
            title="Line Chart"
            className={`flex items-center gap-1 px-2 py-1 rounded transition text-[11px] ${
              activeChartType === 'line'
                ? 'bg-slate-800 text-emerald-400 font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineIcon className="w-3 h-3" />
            <span>Line</span>
          </button>
          <button
            onClick={() => setActiveChartType('bar')}
            title="Bar Chart"
            className={`flex items-center gap-1 px-2 py-1 rounded transition text-[11px] ${
              activeChartType === 'bar'
                ? 'bg-slate-800 text-emerald-400 font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            <span>Bar</span>
          </button>
          <button
            onClick={() => setActiveChartType('area')}
            title="Area Chart"
            className={`flex items-center gap-1 px-2 py-1 rounded transition text-[11px] ${
              activeChartType === 'area'
                ? 'bg-slate-800 text-emerald-400 font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Area</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Metric Pills */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">Max Peak</span>
          <span className="text-xs font-semibold text-slate-200 font-mono">
            ${kpis.max >= 1000 ? `${(kpis.max / 1000).toFixed(1)}k` : kpis.max.toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">Average</span>
          <span className="text-xs font-semibold text-emerald-400 font-mono">
            ${kpis.avg >= 1000 ? `${(kpis.avg / 1000).toFixed(1)}k` : kpis.avg.toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">Data Points</span>
          <span className="text-xs font-semibold text-sky-400 font-mono">
            {chartData.length} periods
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 min-h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {activeChartType === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#F8FAFC' }}
                itemStyle={{ color: '#F1F5F9' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {series.map(s => (
                <Bar key={s.key} dataKey={s.label} fill={s.color} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          ) : activeChartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {series.map((s, idx) => (
                  <linearGradient key={s.key} id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#F8FAFC' }}
                itemStyle={{ color: '#F1F5F9' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {series.map((s, idx) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#gradient-${idx})`}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#F8FAFC' }}
                itemStyle={{ color: '#F1F5F9' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {series.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.label}
                  stroke={s.color}
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: s.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
