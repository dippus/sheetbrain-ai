import React from 'react';
import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-4 transition-colors">
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl max-w-md w-full text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 shadow-inner">
          <FileQuestion className="w-7 h-7" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">404</h1>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2">Workspace Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          The spreadsheet, dataset, or route you requested does not exist or has been relocated.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-semibold rounded-xl text-xs transition-all shadow-xs active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Studio</span>
        </Link>
      </div>
    </div>
  );
}
