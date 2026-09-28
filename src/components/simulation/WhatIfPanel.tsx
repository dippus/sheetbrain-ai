'use client';

import React, { useState } from 'react';
import { Sliders, Sparkles, ArrowRight, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface WhatIfPanelProps {
  onSimulate: (scenarioPrompt: string) => void;
  onReset: () => void;
  activeScenario?: string;
  isSimulating?: boolean;
}

export default function WhatIfPanel({ onSimulate, onReset, activeScenario, isSimulating }: WhatIfPanelProps) {
  const [customInput, setCustomInput] = useState('');

  const quickScenarios = [
    { label: '+25% Marketing Spend', prompt: 'Increase marketing spend by 25% across all months' },
    { label: '+15% MRR Acceleration', prompt: 'Accelerate MRR growth by 15% from month 3 onwards' },
    { label: '+3 Engineers Hired', prompt: 'Add 3 senior engineering salaries starting in month 4' },
    { label: '-20% Ad Budget Cuts', prompt: 'Cut ad spend across all channels by 20%' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onSimulate(customInput.trim());
    setCustomInput('');
  };

  return (
    <div className="bg-studio-900 border border-studio-800 rounded-xl p-4 flex flex-col shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-studio-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-brand-amber">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">"What-If" Sensitivity Simulator</h3>
            <p className="text-xs text-slate-400">Stress-test formulas with natural language hypotheses</p>
          </div>
        </div>
        {activeScenario && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-studio-800 hover:bg-studio-700 transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {activeScenario ? (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-600/40 text-xs text-amber-200 mb-3 animate-fadeIn">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Active Simulation: </span>
              <span>{activeScenario}</span>
              <p className="text-slate-400 mt-1">
                Affected driver cells recalculated and tagged in spreadsheet. Red tags indicate increased burn or cost; Green tags indicate improved margin.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-400 mb-3">
          Select a quick business scenario or type a custom hypothesis to see real-time impact:
        </div>
      )}

      {/* Quick Scenarios */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {quickScenarios.map((sc, i) => (
          <button
            key={i}
            onClick={() => onSimulate(sc.prompt)}
            disabled={isSimulating}
            className="text-left p-2 rounded-lg bg-studio-850 hover:bg-studio-800 border border-studio-800 hover:border-slate-700 text-xs text-slate-300 hover:text-slate-100 transition flex items-center justify-between group disabled:opacity-50"
          >
            <span className="truncate">{sc.label}</span>
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-brand-emerald transition group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      {/* Custom Scenario Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="e.g. What if conversion rate falls by 30%?"
          disabled={isSimulating}
          className="flex-1 bg-studio-950 border border-studio-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand-emerald"
        />
        <button
          type="submit"
          disabled={!customInput.trim() || isSimulating}
          className="px-3 py-1.5 rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-slate-950 font-semibold text-xs transition flex items-center gap-1 disabled:opacity-40"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simulate</span>
        </button>
      </form>
    </div>
  );
}
