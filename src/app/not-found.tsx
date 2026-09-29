import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-200">
      <div className="bg-white dark:bg-[#0d1422] p-8 rounded-lg border border-slate-200 dark:border-[#1e293b] shadow-xl max-w-md w-full text-center">
        <h1 className="text-6xl font-black text-slate-300 dark:text-slate-700 mb-4 tracking-tighter">404</h1>
        <h2 className="text-xl font-bold mb-2">Workspace Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          The spreadsheet or dataset you are looking for does not exist or has been removed.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition shadow-sm"
        >
          Return to Studio
        </Link>
      </div>
    </div>
  );
}
