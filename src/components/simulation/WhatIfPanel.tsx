'use client';

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Zap,
  TrendingUp,
  Percent
} from 'lucide-react';

interface WhatIfPanelProps {
  onSimulate: (scenarioPrompt: string) => void;
  onReset: () => void;
  activeScenario?: string;
  isSimulating?: boolean;
}

export default function WhatIfPanel({ onSimulate, onReset, activeScenario, isSimulating }: WhatIfPanelProps) {
  const [customInput, setCustomInput] = useState('');
  const [sliderVal, setSliderVal] = useState<number>(20);

  const quickScenarios = [
    { label: '+25% Ad Spend', prompt: 'Increase marketing spend by 25% across all months' },
    { label: '+15% MRR Growth', prompt: 'Accelerate MRR growth by 15% from month 3 onwards' },
    { label: '+3 Engineers Hired', prompt: 'Add 3 senior engineering salaries starting in month 4' },
    { label: '-20% Cost Cuts', prompt: 'Cut ad spend and operational costs by 20%' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onSimulate(customInput.trim());
    setCustomInput('');
  };

  const handleSliderApply = () => {
    const sign = sliderVal >= 0 ? '+' : '';
    const prompt = `Adjust primary financial drivers by ${sign}${sliderVal}% across all periods`;
    onSimulate(prompt);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">"What-If" Sensitivity Simulator</h3>
            <p className="text-[11px] text-slate-400">Stress-test formulas with scenario hypotheses</p>
          </div>
        </div>
        {activeScenario && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 transition"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Active Simulation Alert */}
      {activeScenario ? (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-600/40 text-xs text-amber-200 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Active Scenario: </span>
              <span className="text-slate-200">{activeScenario}</span>
              <p className="text-[11px] text-slate-400 mt-1">
                Recalculated dependent driver cells. Amber tags indicate adjusted inputs; green indicates margin improvement.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 mb-2.5">
          Select a quick scenario pill or use the sensitivity slider to stress-test your spreadsheet:
        </p>
      )}

      {/* Quick Scenario Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {quickScenarios.map((sc, i) => (
          <button
            key={i}
            onClick={() => onSimulate(sc.prompt)}
            disabled={isSimulating}
            className="text-left p-2 rounded bg-slate-850 hover:bg-slate-800 border border-slate-750 text-xs text-slate-300 hover:text-slate-100 transition flex items-center justify-between group disabled:opacity-50"
          >
            <span className="truncate text-[11px]">{sc.label}</span>
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      {/* Sensitivity Percentage Slider */}
      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 mb-3">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Percent className="w-3 h-3 text-sky-400" />
            <span>Driver Sensitivity Slider</span>
          </span>
          <span className={`font-mono font-semibold ${sliderVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {sliderVal >= 0 ? `+${sliderVal}%` : `${sliderVal}%`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="-50"
            max="50"
            step="5"
            value={sliderVal}
            onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
            className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <button
            onClick={handleSliderApply}
            disabled={isSimulating}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[11px] font-medium text-slate-200 border border-slate-700 transition"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Custom Hypothesis Form */}
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="e.g. What if retention drops by 15%?"
          disabled={isSimulating}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
        />
        <button
          type="submit"
          disabled={!customInput.trim() || isSimulating}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 font-medium text-xs transition flex items-center gap-1 disabled:opacity-40"
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Run</span>
        </button>
      </form>
    </div>
  );
}
