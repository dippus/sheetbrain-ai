'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Cpu, CheckCircle, ShieldCheck, Sparkles, Layers, Sliders, Activity } from 'lucide-react';

export type PipelineStage = 'idle' | 'planning_schema' | 'compiling_formulas' | 'binding_charts' | 'complete';

interface AgentPipelineBarProps {
  isCompiling?: boolean;
  isSimulating?: boolean;
  prompt?: string;
}

export default function AgentPipelineBar({ isCompiling, isSimulating, prompt }: AgentPipelineBarProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const isActive = !!(isCompiling || isSimulating);
  const mode = isSimulating ? 'simulate' : 'compile';

  useEffect(() => {
    if (!isActive) {
      setActiveStep(0);
      return;
    }

    const interval = setInterval(() => {
      setActiveStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 550);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  const compileSteps = [
    { label: 'Architect Agent', desc: 'Synthesizing grid topology', icon: Layers },
    { label: 'Formula Synthesizer', desc: 'Injecting reactive Excel formulas', icon: Cpu },
    { label: 'Deterministic Engine', desc: 'Evaluating math & dependencies', icon: ShieldCheck },
    { label: 'Executive Visualizer', desc: 'Binding chart telemetry', icon: Sparkles },
  ];

  const simulateSteps = [
    { label: 'Schema Auditor', desc: 'Scanning rows & metrics', icon: Layers },
    { label: 'Delta Synthesizer', desc: 'Synthesizing delta rules', icon: Sliders },
    { label: 'Deterministic Engine', desc: 'Evaluating formula graph', icon: ShieldCheck },
    { label: 'Diff Visualizer', desc: 'Injecting live cell glow', icon: Activity },
  ];

  const steps = mode === 'simulate' ? simulateSteps : compileSteps;

  return (
    <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-blue-200 dark:border-cyan-500/30 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs shadow-sm dark:shadow-xl animate-in fade-in duration-200 z-20 shrink-0">
      <div className="flex items-center gap-2.5 text-blue-600 dark:text-cyan-400 font-semibold min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 dark:bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 dark:bg-cyan-500"></span>
        </span>
        <Bot className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
        <span className="truncate text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
          Autonomous Agent Pipeline: <span className="text-slate-900 dark:text-white font-mono font-medium">&ldquo;{prompt || (mode === 'simulate' ? 'Stress-Testing Scenario' : 'Synthesizing Living Model')}&rdquo;</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = activeStep > idx;
          const isCurrent = activeStep === idx;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-medium transition-all ${
                isDone
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-xs'
                  : isCurrent
                  ? 'bg-blue-50 dark:bg-cyan-500/20 text-blue-700 dark:text-cyan-200 border border-blue-400 dark:border-cyan-400/60 shadow-md shadow-blue-500/10 dark:shadow-cyan-950/50 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-900/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {isDone ? (
                <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Icon className={`w-3 h-3 shrink-0 ${isCurrent ? 'text-blue-600 dark:text-cyan-300 animate-spin' : 'text-slate-400 dark:text-slate-500'}`} />
              )}
              <span className="whitespace-nowrap">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
