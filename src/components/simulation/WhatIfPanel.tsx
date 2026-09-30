'use client';

import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Play,
  Percent,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface WhatIfPanelProps {
  onSimulate: (scenarioPrompt: string) => void;
  onReset: () => void;
  onCommitBaseline?: () => void;
  activeScenario?: string;
  isSimulating?: boolean;
}

export default function WhatIfPanel({
  onSimulate,
  onReset,
  onCommitBaseline,
  activeScenario,
  isSimulating
}: WhatIfPanelProps) {
  const [customInput, setCustomInput] = useState('');
  const [sliderVal, setSliderVal] = useState<number>(20);

  const quickScenarios = [
    { label: '+25% Ad Spend', prompt: 'Increase marketing spend by 25% across all months' },
    { label: '+15% MRR Growth', prompt: 'Accelerate MRR growth by 15% from month 3 onwards' },
    { label: '+3 Engineers Hired', prompt: 'Add 3 senior engineering salaries starting in month 4' },
    { label: '-20% Cost Cuts', prompt: 'Cut ad spend and operational costs by 20%' },
  ];

  const presetSteps = [-25, -10, -5, 5, 10, 20, 30];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim() || isSimulating) return;
    onSimulate(customInput.trim());
    setCustomInput('');
  };

  const handleSliderApply = () => {
    const sign = sliderVal >= 0 ? '+' : '';
    const prompt = `Adjust primary baseline drivers by ${sign}${sliderVal}% across all periods`;
    onSimulate(prompt);
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 text-xs text-slate-800 dark:text-slate-200 shadow-sm dark:shadow-2xl transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-inner">
            <Sliders className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Scenario Simulator</h3>
        </div>

        {activeScenario && (
          <div className="flex items-center gap-1.5">
            {onCommitBaseline && (
              <button
                onClick={onCommitBaseline}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 transition font-semibold text-xs flex items-center gap-1 active:scale-[0.98]"
              >
                <span>Save Baseline</span>
              </button>
            )}
            <button
              onClick={onReset}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition active:scale-[0.98]"
              title="Reset to original baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {activeScenario && (
        <div className="p-3 rounded-xl bg-cyan-50/80 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/30 text-xs">
          <span className="font-bold text-cyan-800 dark:text-cyan-300 block mb-0.5">Active Scenario:</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium">{activeScenario}</span>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <TrendingUp className="w-3 h-3" /> Positive variance
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
              <TrendingDown className="w-3 h-3" /> Negative variance
            </span>
          </div>
        </div>
      )}

      {/* Preset Scenarios */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
          Quick Hypotheses
        </label>
        <div className="grid grid-cols-2 gap-2">
          {quickScenarios.map((sc, i) => (
            <button
              key={i}
              onClick={() => onSimulate(sc.prompt)}
              disabled={isSimulating}
              className="text-left px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 text-slate-700 dark:text-slate-300 font-semibold text-xs transition active:scale-[0.98] disabled:opacity-40"
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Slider Controls */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Sensitivity Adjustment</span>
          </span>
          <span className={`font-mono tabular-nums font-bold px-2 py-0.5 rounded-md text-xs ${
            sliderVal >= 0
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60'
              : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60'
          }`}>
            {sliderVal >= 0 ? `+${sliderVal}%` : `${sliderVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {presetSteps.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setSliderVal(step)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-mono tabular-nums transition border active:scale-[0.98] ${
                sliderVal === step
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {step > 0 ? `+${step}%` : `${step}%`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <input
            id="simulation-range-slider"
            name="simulationRange"
            type="range"
            min="-50"
            max="50"
            step="5"
            value={sliderVal}
            onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
            className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-600"
          />
          <button
            onClick={handleSliderApply}
            disabled={isSimulating}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-950/20 active:scale-[0.98] disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Custom Simulation Prompt */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          id="simulation-hypothesis-input"
          name="simulationHypothesis"
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Custom hypothesis (e.g. churn rises 10%)"
          disabled={isSimulating}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-sm"
        />
        <button
          type="submit"
          disabled={!customInput.trim() || isSimulating}
          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-cyan-950/20 active:scale-[0.98] disabled:opacity-40"
        >
          <Play className="w-3 h-3" />
          <span>Simulate</span>
        </button>
      </form>
    </div>
  );
}
