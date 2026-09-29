'use client';

import React, { useState } from 'react';
import { SheetData } from '@/types/sheet';
import { Sliders, RotateCcw, TrendingUp, TrendingDown, Percent} from 'lucide-react';

interface ScenarioMatrixViewProps {
  sheet: SheetData;
  onSimulate: (prompt: string) => void;
  onReset: () => void;
  onCommitBaseline: () => void;
  activeScenario?: string;
  isSimulating: boolean;
}

export default function ScenarioMatrixView({
  sheet,
  onSimulate,
  onReset,
  onCommitBaseline,
  activeScenario,
  isSimulating
}: ScenarioMatrixViewProps) {
  const [sliderVal, setSliderVal] = useState<number>(20);
  const [customHypothesis, setCustomHypothesis] = useState<string>('');

  const quickScenarios = [
    { label: '+25% Ad Spend Growth', prompt: 'Increase marketing spend by 25% across all months' },
    { label: '+15% ARR Acceleration', prompt: 'Accelerate MRR growth by 15% from month 3 onwards' },
    { label: '+3 Engineers Headcount', prompt: 'Add 3 senior engineering salaries starting in month 4' },
    { label: '-20% Operational Cost Cut', prompt: 'Cut ad spend and operational costs by 20%' },
  ];

  const handleApplySlider = () => {
    const sign = sliderVal >= 0 ? '+' : '';
    onSimulate(`Adjust primary financial drivers by ${sign}${sliderVal}% across all periods`);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHypothesis.trim() || isSimulating) return;
    onSimulate(customHypothesis.trim());
    setCustomHypothesis('');
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-[#070b14] flex flex-col gap-6 select-none transition-colors">
      {/* 1. Sensitivity Simulation Controls */}
      <div className="bg-white dark:bg-[#0d1422] p-5 rounded border border-slate-200 dark:border-[#1e293b] shadow-xs flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-[#1a2538]">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Sensitivity Studio & Scenario Matrix</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simulate strategic variance across operational cost and growth drivers
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeScenario && (
              <>
                <button
                  onClick={onCommitBaseline}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition flex items-center gap-1.5 shadow-xs"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Commit as Baseline</span>
                </button>
                <button
                  onClick={onReset}
                  className="px-3 py-1.5 rounded bg-slate-100 dark:bg-[#162031] hover:bg-slate-200 dark:hover:bg-[#1f2c42] text-slate-700 dark:text-slate-300 font-medium text-xs transition flex items-center gap-1.5 border border-slate-300 dark:border-[#223049]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Baseline</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Active Simulation Notice Banner */}
        {activeScenario && (
          <div className="p-3 bg-blue-50/70 dark:bg-[#101b2e] border border-blue-200 dark:border-[#1c2e4d] rounded flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-700 dark:text-blue-400 ">SIMULATION ACTIVE:</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">{activeScenario}</span>
            </div>
            <div className="flex items-center gap-4 text-xs  font-medium">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp className="w-3.5 h-3.5" /> Favorable Variance
              </span>
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <TrendingDown className="w-3.5 h-3.5" /> Adverse Variance
              </span>
            </div>
          </div>
        )}

        {/* Dual Sensitivity Input Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* A. Range Slider Sensitivity */}
          <div className="p-4 bg-slate-50 dark:bg-[#111928] rounded border border-slate-200 dark:border-[#1e293b] flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Global Variance Multiplier
                </span>
                <span className={`text-xs  font-bold px-2 py-0.5 rounded ${
                  sliderVal >= 0
                    ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                }`}>
                  {sliderVal >= 0 ? `+${sliderVal}%` : `${sliderVal}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={sliderVal}
                onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 dark:bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400  mt-1">
                <span>-50% Bear</span>
                <span>0% Base</span>
                <span>+50% Bull</span>
              </div>
            </div>

            <button
              onClick={handleApplySlider}
              disabled={isSimulating}
              className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition shadow-xs disabled:opacity-50"
            >
              {isSimulating ? 'Simulating...' : 'Apply Sensitivity Factor'}
            </button>
          </div>

          {/* B. Natural Language Hypothesis */}
          <div className="p-4 bg-slate-50 dark:bg-[#111928] rounded border border-slate-200 dark:border-[#1e293b] flex flex-col justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1.5">
                Strategic Hypothesis Prompt
              </span>
              <form onSubmit={handleCustomSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={customHypothesis}
                  onChange={(e) => setCustomHypothesis(e.target.value)}
                  placeholder="e.g. Cut cloud server burn by 15% in Q3..."
                  className="flex-1 bg-white dark:bg-[#0c121e] border border-slate-300 dark:border-[#223049] rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
                />
                <button
                  type="submit"
                  disabled={!customHypothesis.trim() || isSimulating}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition disabled:opacity-50"
                >
                  Run
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickScenarios.map((sc) => (
                <button
                  key={sc.label}
                  onClick={() => onSimulate(sc.prompt)}
                  disabled={isSimulating}
                  className="px-2 py-1 rounded bg-white dark:bg-[#0c121e] hover:bg-slate-100 dark:hover:bg-[#1a2538] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#223049] text-[11px] transition"
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Variance Table */}
      <div className="bg-white dark:bg-[#0d1422] rounded border border-slate-200 dark:border-[#1e293b] p-5 shadow-xs">
        <div className="pb-3 border-b border-slate-100 dark:border-[#1a2538] mb-4">
          <h3 className="text-xs font-bold font-semibold text-slate-500 dark:text-slate-400">
            Period-by-Period Variance Audit
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1e293b] text-slate-500 dark:text-slate-400 font-semibold">
                <th className="text-left py-2 px-3">Period / Horizon</th>
                {(sheet?.columns || []).slice(1).map(c => (
                  <th key={c.key} className="text-right py-2 px-3">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(0, (sheet?.rowCount || 1) - 1) }, (_, i) => i + 2).map(r => {
                const rowLabel = sheet?.cellData?.[`A${r}`]?.v || `Period ${r - 1}`;
                return (
                  <tr key={r} className="border-b border-slate-100 dark:border-[#141e2e] hover:bg-slate-50 dark:hover:bg-[#0f1728]">
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {String(rowLabel)}
                    </td>
                    {(sheet?.columns || []).slice(1).map(c => {
                      const cell = sheet?.cellData?.[`${c.key}${r}`];
                      const val = cell?.v;
                      const isModified = !!cell?.isModified;
                      const delta = cell?.deltaPercent;

                      return (
                        <td key={c.key} className="text-right py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`${isModified ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {typeof val === 'number'
                                ? (c.type === 'currency' ? `$${val.toLocaleString()}` : val.toLocaleString())
                                : (val !== undefined ? String(val) : '—')}
                            </span>
                            {isModified && delta && (
                              <span className="text-[10px] px-1 py-0.2 rounded  font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                                {delta}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
