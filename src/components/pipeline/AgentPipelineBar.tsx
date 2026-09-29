'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export type PipelineStage = 'idle' | 'planning_schema' | 'compiling_formulas' | 'binding_charts' | 'complete';

interface AgentPipelineBarProps {
  stage: PipelineStage;
  currentPrompt?: string;
}

export default function AgentPipelineBar({ stage }: AgentPipelineBarProps) {
  if (stage === 'idle' || stage === 'complete') return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-3 py-1 flex items-center gap-2 text-xs text-blue-900">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
      <span>Compiling workbook model schema and recalculating formulas...</span>
    </div>
  );
}
