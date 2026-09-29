'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { SheetData } from '@/types/sheet';

const UniverSheetCore = dynamic(
  () => import('./UniverSheetCore'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[480px] flex flex-col items-center justify-center bg-white border border-slate-300 text-slate-500 gap-2">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-600">Loading spreadsheet workspace...</span>
      </div>
    ),
  }
);

interface UniverSheetWrapperProps {
  sheet: SheetData;
  onCellChange: (updatedSheet: SheetData) => void;
  sheets?: SheetData[];
  activeSheetId?: string;
  onSelectSheet?: (id: string) => void;
  onAddSheet?: () => void;
  onDeleteSheet?: (id: string) => void;
  onRenameSheet?: (id: string, newName: string) => void;
}

export default function UniverSheetWrapper(props: UniverSheetWrapperProps) {
  return <UniverSheetCore {...props} />;
}
