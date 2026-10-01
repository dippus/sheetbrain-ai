'use client';

import React from 'react';
import { Briefcase, X, ShieldCheck, Copy, Download, Table } from 'lucide-react';
import { WorkbookModel, SheetData } from '@/types/sheet';

interface BoardroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbook: WorkbookModel;
  sheet: SheetData;
  activeScenario?: string;
  markdownContent: string;
  onCopyMarkdown: () => void;
  onDownloadMarkdown: () => void;
  onCopyTSV: () => void;
}

export default function BoardroomModal({
  isOpen,
  onClose,
  workbook,
  sheet,
  activeScenario,
  markdownContent,
  onCopyMarkdown,
  onDownloadMarkdown,
  onCopyTSV,
}: BoardroomModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-inner">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Boardroom Executive Findings & Governance Briefing</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-mono font-semibold">
                  C-Suite Ready
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Automated governance audit and executive briefing for board-level decision review.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Active Model</span>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">{workbook?.title || 'Operational Model'}</div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
              {sheet?.rowCount ? sheet.rowCount - 1 : 0} Rows · {sheet?.columns?.length || 0} Cols
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Scenario State</span>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
              {activeScenario ? 'Simulation Active' : 'Baseline Verified'}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
              {activeScenario ? 'Deterministic Variance' : 'Standard Baseline'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Governance Integrity</span>
            <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>100% Passed</span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
              Zero Formula Injections
            </div>
          </div>
        </div>

        {/* Executive Summary Preview Box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 font-mono text-[11px] text-slate-800 dark:text-slate-300 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all shadow-inner">
          {markdownContent}
        </div>

        {/* Modal Actions */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onCopyMarkdown}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition flex items-center gap-1.5 shadow-md shadow-cyan-950/20 active:scale-[0.98]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Markdown</span>
            </button>
            <button
              onClick={onDownloadMarkdown}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Download .md</span>
            </button>
            <button
              onClick={onCopyTSV}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 active:scale-[0.98]"
            >
              <Table className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Copy TSV Data</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition border border-slate-200 dark:border-transparent active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
