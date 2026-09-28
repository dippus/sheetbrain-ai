'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { SheetData } from '@/types/sheet';

// Dynamic import with SSR disabled ensures zero "window is not defined" crashes on Next.js build / Amplify
const UniverSheetCore = dynamic(
  () => import('./UniverSheetCore'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[450px] flex flex-col items-center justify-center bg-studio-900/60 rounded-xl border border-studio-800 animate-pulse text-slate-400 gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-slate-300">Loading SheetBrain Reactive Canvas...</span>
      </div>
    ),
  }
);

interface UniverSheetWrapperProps {
  sheet: SheetData;
  onCellChange: (updatedSheet: SheetData) => void;
}

export default function UniverSheetWrapper(props: UniverSheetWrapperProps) {
  return <UniverSheetCore {...props} />;
}
