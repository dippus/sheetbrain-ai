'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service like CloudWatch/Sentry
    console.error('Production Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-200">
      <div className="bg-white dark:bg-[#0d1422] p-8 rounded-lg border border-slate-200 dark:border-[#1e293b] shadow-xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          A critical error occurred in the workspace. Don't worry, your data is saved in local state.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#162031] dark:hover:bg-[#1e2c45] text-slate-700 dark:text-slate-300 font-medium rounded text-sm transition"
          >
            Hard Reload
          </button>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-sm transition shadow-sm"
          >
            Attempt Recovery
          </button>
        </div>
      </div>
    </div>
  );
}
