'use client';

import React from 'react';
import { ChartConfig, SheetData } from '@/types/sheet';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { BarChart3, TrendingUp, Maximize2 } from 'lucide-react';

interface DynamicChartCardProps {
  config: ChartConfig;
  sheet: SheetData;
}

export default function DynamicChartCard({ config, sheet }: DynamicChartCardProps) {
  // Transform sheet grid rows into recharts-compatible data objects
  const chartData = React.useMemo(() => {
    const data: Record<string, any>[] = [];
    const colKeys = sheet.columns.map(c => c.key);
    const xCol = sheet.columns.find(c => c.label.toLowerCase().includes('month') || c.label.toLowerCase().includes('channel') || c.key === 'A');
    const xKey = xCol ? xCol.key : 'A';

    for (let r = 2; r <= sheet.rowCount; r++) {
      // Skip summary / total row
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
        } else if (cell && cell.v !== undefined) {
          const num = parseFloat(String(cell.v).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) rowObj[col.label] = num;
        }
      });

      data.push(rowObj);
    }
    return data;
  }, [sheet]);

  return (
    <div className="bg-studio-900 border border-studio-800 rounded-xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-studio-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-brand-emerald">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{config.title}</h3>
            <p className="text-xs text-slate-400">Live dynamically bound to spreadsheet rows</p>
          </div>
        </div>
        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-studio-800 text-slate-300 border border-studio-700">
          {config.type} chart
        </span>
      </div>

      <div className="flex-1 min-h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {config.type === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#F1F5F9' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {config.series.map(s => (
                <Bar key={s.key} dataKey={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#F1F5F9' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {config.series.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.label}
                  stroke={s.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: s.color }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
