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
    <div className="bg-white dark:bg-[#0d1422] border border-slate-300 dark:border-[#1e293b] rounded p-4 flex flex-col gap-3 text-xs text-slate-800 dark:text-slate-200 transition-colors">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Scenario Simulator</h3>
        </div>

        {activeScenario && (
          <div className="flex items-center gap-1.5">
            {onCommitBaseline && (
              <button
                onClick={onCommitBaseline}
                className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition font-medium text-xs flex items-center gap-1"
              >
                <span>Save Baseline</span>
              </button>
            )}
            <button
              onClick={onReset}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#162031] text-slate-600 dark:text-slate-400 transition"
              title="Reset to original baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {activeScenario && (
        <div className="p-2.5 rounded bg-blue-50 dark:bg-[#101b2e] border border-blue-200 dark:border-[#1c2e4d] text-xs">
          <span className="font-semibold text-blue-900 dark:text-blue-300 block mb-0.5">Active Scenario:</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium">{activeScenario}</span>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
              <TrendingUp className="w-3 h-3" /> Positive variance
            </span>
            <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
              <TrendingDown className="w-3 h-3" /> Negative variance
            </span>
          </div>
        </div>
      )}

      {/* Preset Scenarios */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
          Quick Hypotheses
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {quickScenarios.map((sc, i) => (
            <button
              key={i}
              onClick={() => onSimulate(sc.prompt)}
              disabled={isSimulating}
              className="text-left px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#223049] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-[#0f1c30] text-slate-700 dark:text-slate-300 font-medium transition disabled:opacity-40"
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Slider Controls */}
      <div className="p-3 rounded bg-slate-50 dark:bg-[#111928] border border-slate-200 dark:border-[#1e293b] flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Sensitivity Adjustment</span>
          </span>
          <span className={`font-mono tabular-nums font-bold px-1.5 py-0.5 rounded ${
            sliderVal >= 0
              ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/60'
              : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60'
          }`}>
            {sliderVal >= 0 ? `+${sliderVal}%` : `${sliderVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {presetSteps.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setSliderVal(step)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums transition border ${
                sliderVal === step
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-[#0c121e] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#223049] hover:bg-slate-100 dark:hover:bg-[#162031]'
              }`}
            >
              {step > 0 ? `+${step}%` : `${step}%`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min="-50"
            max="50"
            step="5"
            value={sliderVal}
            onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
            className="flex-1 h-1.5 bg-slate-200 dark:bg-[#1e293b] rounded appearance-none cursor-pointer accent-blue-600"
          />
          <button
            onClick={handleSliderApply}
            disabled={isSimulating}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Custom Simulation Prompt */}
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Custom hypothesis (e.g. churn rises 10%)"
          disabled={isSimulating}
          className="flex-1 bg-white dark:bg-[#0c121e] border border-slate-300 dark:border-[#223049] rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition"
        />
        <button
          type="submit"
          disabled={!customInput.trim() || isSimulating}
          className="px-3 py-1.5 rounded bg-slate-800 dark:bg-[#162031] hover:bg-slate-900 dark:hover:bg-[#1a2840] border dark:border-[#223049] text-white text-xs font-medium transition flex items-center gap-1 disabled:opacity-40"
        >
          <Play className="w-3 h-3" />
          <span>Simulate</span>
        </button>
      </form>
    </div>
  );
}
