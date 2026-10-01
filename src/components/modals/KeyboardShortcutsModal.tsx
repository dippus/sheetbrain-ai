'use client';

import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">View Navigation</div>
            <div className="space-y-1">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Spreadsheet Grid</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + 1</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Visual Analytics</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + 2</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Scenario Matrix</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + 3</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Formula Audit</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + 4</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Executive Report</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + 5</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Toggle Left Sidebar</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + B</kbd>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">AI & Spreadsheet Actions</div>
            <div className="space-y-1">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Focus AI Prompt Bar</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Export Excel (.xlsx)</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + E</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Add New Sheet Tab</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + N</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Toggle Dark / Light Theme</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + T</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600 dark:text-slate-400">Show Shortcuts Help</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">F1 / ?</kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-950/20 active:scale-[0.98]"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
