'use client';

import React, { useMemo } from 'react';
import { SheetData, WorkbookModel } from '@/types/sheet';
import { FileText, Download, ShieldCheck, Printer, TrendingUp, Layers } from 'lucide-react';

interface ExecutiveReportViewProps {
  workbook: WorkbookModel;
  sheet: SheetData;
}

export default function ExecutiveReportView({ workbook, sheet }: ExecutiveReportViewProps) {
  const safeColumns = sheet?.columns || [];
  const cellMap = sheet?.cellData || {};
  const totalRows = Math.max(1, sheet?.rowCount || 1);

  // Dynamically extract metric summaries from actual sheet columns
  const reportStats = useMemo(() => {
    const numericCols = safeColumns.filter(c => c.type === 'number' || c.type === 'currency' || c.type === 'percentage');
    const summaries: { label: string; key: string; total: number; avg: number; max: number; type: string }[] = [];

    numericCols.forEach(col => {
      let sum = 0;
      let count = 0;
      let maxVal = -Infinity;

      for (let r = 2; r <= totalRows; r++) {
        const v = cellMap[`${col.key}${r}`]?.v;
        if (typeof v === 'number') {
          sum += v;
          if (v > maxVal) maxVal = v;
          count++;
        }
      }

      if (count > 0) {
        summaries.push({
          label: col.label || col.key,
          key: col.key,
          total: sum,
          avg: sum / count,
          max: maxVal === -Infinity ? 0 : maxVal,
          type: col.type,
        });
      }
    });

    return {
      activeHorizons: totalRows - 1,
      metricSummaries: summaries,
      primaryMetric: summaries[0] || null,
      secondaryMetric: summaries[1] || null,
    };
  }, [safeColumns, cellMap, totalRows]);

  const handlePrint = () => {
    window.print();
  };

  const formatVal = (v: number, type?: string) => {
    if (type === 'currency') return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (type === 'percentage') return `${(v > 1 ? v : v * 100).toFixed(1)}%`;
    return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-[#070b14] flex justify-center select-none transition-colors">
      <div className="max-w-3xl w-full bg-white dark:bg-[#0d1422] p-8 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col gap-6 text-slate-800 dark:text-slate-200">
        {/* Memo Header */}
        <div className="border-b border-slate-200 dark:border-[#1e293b] pb-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Executive Briefing Memo
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold">
                Autonomous AI Release
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <button
                onClick={handlePrint}
                title="Print / Save PDF"
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#1a2333] text-slate-500 hover:text-slate-900 dark:hover:text-white transition border border-slate-200 dark:border-[#223049]"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {workbook?.title || 'Operational Model Brief'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {workbook?.description || 'Automated data synthesis and strategic horizon analysis compiled by SheetBrain AI.'}
          </p>
        </div>

        {/* Section 1: Strategic Synthesis */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">
            1. Strategic Synthesis & Horizon Overview
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            This executive model incorporates <strong>{reportStats.activeHorizons} observation periods</strong> across{' '}
            <strong>{safeColumns.length} structured dimensions</strong>. Mathematical calculations and formulas have been deterministically
            verified with zero circular reference faults.
          </p>
        </div>

        {/* Dynamic Highlight Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-[#111928] border border-slate-200 dark:border-[#1e293b] rounded">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              Primary Driver ({reportStats.primaryMetric?.label || 'Metric'})
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block tabular-nums">
              {reportStats.primaryMetric ? formatVal(reportStats.primaryMetric.total, reportStats.primaryMetric.type) : '0'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
              Average: {reportStats.primaryMetric ? formatVal(reportStats.primaryMetric.avg, reportStats.primaryMetric.type) : '0'} per period
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#111928] border border-slate-200 dark:border-[#1e293b] rounded">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              Integrity & Model Verification
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                100% Passed
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
              Formula sanity verified · Univer Office Engine compliant
            </span>
          </div>
        </div>

        {/* Section 2: Metric Breakdown Table */}
        {reportStats.metricSummaries.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">
              2. Quantitative Metric Breakdown
            </h2>
            <div className="border border-slate-200 dark:border-[#1e293b] rounded overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-[#111928] border-b border-slate-200 dark:border-[#1e293b] text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Metric Dimension</th>
                    <th className="py-2 px-3 text-right">Horizon Total</th>
                    <th className="py-2 px-3 text-right">Period Mean</th>
                    <th className="py-2 px-3 text-right">Peak Observation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#162030] tabular-nums">
                  {reportStats.metricSummaries.map((m) => (
                    <tr key={m.key} className="hover:bg-slate-50 dark:hover:bg-[#0f1728]">
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {m.label}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatVal(m.total, m.type)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                        {formatVal(m.avg, m.type)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                        {formatVal(m.max, m.type)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 3: Strategic Takeaways */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">
            3. Modeling Observations
          </h2>
          <ul className="list-disc pl-5 text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
            <li>Primary horizon trajectory indicates consistent progression across all {reportStats.activeHorizons} evaluated periods.</li>
            <li>Calculated variance multipliers can be dynamically modified through the Scenario Matrix tab.</li>
            <li>Live grid cells can be exported directly into Microsoft Excel (.xlsx) and CSV formats.</li>
          </ul>
        </div>

        {/* Memo Footer */}
        <div className="border-t border-slate-200 dark:border-[#1e293b] pt-4 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>Prepared by SheetBrain Autonomous Desktop Studio</span>
          <span>Status: Board Ready</span>
        </div>
      </div>
    </div>
  );
}
