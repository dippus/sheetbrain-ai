'use client';

import React from 'react';
import { Cpu, CheckCircle2, Loader2, Sparkles, Terminal } from 'lucide-react';

export type PipelineStage = 'idle' | 'planning_schema' | 'compiling_formulas' | 'binding_charts' | 'complete';

interface AgentPipelineBarProps {
  stage: PipelineStage;
  currentPrompt?: string;
}

export default function AgentPipelineBar({ stage, currentPrompt }: AgentPipelineBarProps) {
  if (stage === 'idle') {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-studio-900 border-b border-studio-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-brand-emerald" />
          <span>Multi-Agent Engine: <strong className="text-slate-200">Idle & Ready</strong></span>
          <span className="text-slate-600">|</span>
          <span>Target Model: <strong className="text-slate-300">AWS Bedrock Claude 3.5 Sonnet</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span>Latency: <strong className="text-brand-emerald">~0.1s (Deterministic Fast Engine)</strong></span>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'planning_schema', label: '1. Schema Architect', desc: 'Structuring grid & types' },
    { key: 'compiling_formulas', label: '2. Formula Compiler', desc: 'Injecting =SUM & =IF' },
    { key: 'binding_charts', label: '3. Chart Engine', desc: 'Synthesizing visual trends' },
  ];

  const getStatus = (stepKey: string) => {
    if (stage === 'complete') return 'done';
    if (stage === stepKey) return 'active';
    const order = ['planning_schema', 'compiling_formulas', 'binding_charts'];
    return order.indexOf(stage) > order.indexOf(stepKey) ? 'done' : 'pending';
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-2.5 bg-studio-900/90 border-b border-studio-800 text-xs gap-3 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Autonomous Agents Active</span>
        </div>
        {currentPrompt && (
          <span className="text-slate-400 truncate max-w-xs md:max-w-md italic">
            "{currentPrompt}"
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {steps.map((st, i) => {
          const status = getStatus(st.key);
          return (
            <div key={st.key} className="flex items-center gap-1.5">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  status === 'done'
                    ? 'bg-emerald-950/60 border border-emerald-700/50 text-emerald-400'
                    : status === 'active'
                    ? 'bg-amber-950/60 border border-amber-600/60 text-amber-300 animate-pulse'
                    : 'bg-studio-800/40 text-slate-500 border border-transparent'
                }`}
              >
                {status === 'done' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : status === 'active' ? (
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                ) : (
                  <Cpu className="w-3 h-3 text-slate-600" />
                )}
                <span>{st.label}</span>
              </div>
              {i < steps.length - 1 && <span className="text-slate-700">→</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
