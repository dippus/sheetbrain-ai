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
  BarChart2
} from 'lucide-react';

interface DynamicChartCardProps {
  config: ChartConfig;
  sheet: SheetData;
}

export default function DynamicChartCard({ config, sheet }: DynamicChartCardProps) {
  const [activeChartType, setActiveChartType] = useState<'line' | 'bar' | 'area'>(config.type || 'line');

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

  const series = config.series.length > 0 ? config.series : [{ key: 'B', label: 'Value', color: '#2563eb' }];

  const formatNum = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v}`;
  };

  return (
    <div className="bg-white dark:bg-[#0d1422] border border-slate-300 dark:border-[#1e293b] rounded p-4 flex flex-col h-full text-xs text-slate-800 dark:text-slate-200 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e293b] mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{config.title}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Live data projection</p>
          </div>
        </div>

        {/* Type Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-[#162031] p-0.5 rounded border border-slate-200 dark:border-[#223049] text-xs">
          <button
            onClick={() => setActiveChartType('line')}
            className={`px-2 py-1 rounded transition ${activeChartType === 'line' ? 'bg-white dark:bg-[#0c121e] text-blue-700 dark:text-blue-400 shadow-sm font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Line
          </button>
          <button
            onClick={() => setActiveChartType('bar')}
            className={`px-2 py-1 rounded transition ${activeChartType === 'bar' ? 'bg-white dark:bg-[#0c121e] text-blue-700 dark:text-blue-400 shadow-sm font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Bar
          </button>
          <button
            onClick={() => setActiveChartType('area')}
            className={`px-2 py-1 rounded transition ${activeChartType === 'area' ? 'bg-white dark:bg-[#0c121e] text-blue-700 dark:text-blue-400 shadow-sm font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Area
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 bg-slate-50 dark:bg-[#111928] border border-slate-200 dark:border-[#1e293b] rounded">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Peak Value</span>
          <span className="text-xs tabular-nums font-semibold text-slate-900 dark:text-slate-100">{formatNum(kpis.max)}</span>
        </div>
        <div className="p-2 bg-slate-50 dark:bg-[#111928] border border-slate-200 dark:border-[#1e293b] rounded">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Average</span>
          <span className="text-xs tabular-nums font-semibold text-slate-900 dark:text-slate-100">{formatNum(kpis.avg)}</span>
        </div>
        <div className="p-2 bg-slate-50 dark:bg-[#111928] border border-slate-200 dark:border-[#1e293b] rounded">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Cumulative</span>
          <span className="text-xs tabular-nums font-semibold text-slate-900 dark:text-slate-100">{formatNum(kpis.total)}</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          {activeChartType === 'line' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={formatNum} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(13,20,34,0.97)', borderColor: '#1e293b', borderRadius: '6px', fontSize: '11px', color: '#f1f5f9' }}
                formatter={(v: any) => [typeof v === 'number' ? formatNum(v) : v, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.label}
                  stroke={s.color || '#2563eb'}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          ) : activeChartType === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={formatNum} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(13,20,34,0.97)', borderColor: '#1e293b', borderRadius: '6px', fontSize: '11px', color: '#f1f5f9' }}
                formatter={(v: any) => [typeof v === 'number' ? formatNum(v) : v, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.label}
                  fill={s.color || '#2563eb'}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={formatNum} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(13,20,34,0.97)', borderColor: '#1e293b', borderRadius: '6px', fontSize: '11px', color: '#f1f5f9' }}
                formatter={(v: any) => [typeof v === 'number' ? formatNum(v) : v, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.label}
                  stroke={s.color || '#2563eb'}
                  fill={s.color || '#2563eb'}
                  fillOpacity={0.15}
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
