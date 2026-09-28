'use client';

import React from 'react';
import { Cpu, CheckCircle2, Loader2, Terminal, Network, ShieldCheck } from 'lucide-react';

export type PipelineStage = 'idle' | 'planning_schema' | 'compiling_formulas' | 'binding_charts' | 'complete';

interface AgentPipelineBarProps {
  stage: PipelineStage;
  currentPrompt?: string;
}

export default function AgentPipelineBar({ stage, currentPrompt }: AgentPipelineBarProps) {
  if (stage === 'idle') {
    return (
      <div className="flex flex-wrap items-center justify-between px-5 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Multi-Agent Engine: <strong className="text-slate-200">Idle & Ready</strong></span>
          <span className="text-slate-700">|</span>
          <span>Foundation Model: <strong className="text-slate-300">Amazon Bedrock (Claude 3.5 Sonnet)</strong></span>
        </div>
        <div className="flex items-center gap-3 text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Deterministic Engine: 0.05s</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Anti-Hallucination Guard: Active</span>
          </span>
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
    <div className="flex flex-col md:flex-row md:items-center justify-between px-5 py-2.5 bg-slate-900 border-b border-slate-800 text-xs gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-[11px]">
          <Network className="w-3 h-3 animate-pulse" />
          <span>Multi-Agent Pipeline Active</span>
        </div>
        {currentPrompt && (
          <span className="text-slate-300 truncate max-w-xs md:max-w-md italic text-xs">
            "{currentPrompt}"
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {steps.map((st, i) => {
          const status = getStatus(st.key);
          return (
            <div key={st.key} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  status === 'done'
                    ? 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-400'
                    : status === 'active'
                    ? 'bg-amber-950/70 border border-amber-500/70 text-amber-300 animate-pulse'
                    : 'bg-slate-800/50 text-slate-500 border border-transparent'
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
              {i < steps.length - 1 && <span className="text-slate-700 text-xs">→</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
