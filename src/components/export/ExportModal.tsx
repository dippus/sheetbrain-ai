'use client';

import React, { useState } from 'react';
import {
  Download,
  X,
  FileSpreadsheet,
  FileText,
  FileCode,
  Copy,
  Briefcase,
  Check,
  Layers,
  Sparkles
} from 'lucide-react';
import { WorkbookModel, SheetData } from '@/types/sheet';

export type ExportFormatType = 'xlsx' | 'csv' | 'tsv' | 'json' | 'boardroom';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbook: WorkbookModel;
  activeSheet: SheetData;
  onExportXLSX: (customName?: string) => void;
  onExportCSV: (customName?: string) => void;
  onExportJSON: (customName?: string) => void;
  onCopyTSV: () => void;
  onOpenBoardroom: () => void;
}

export default function ExportModal({
  isOpen,
  onClose,
  workbook,
  activeSheet,
  onExportXLSX,
  onExportCSV,
  onExportJSON,
  onCopyTSV,
  onOpenBoardroom,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormatType>('xlsx');
  const [fileName, setFileName] = useState<string>(
    (workbook?.title || 'Spreadsheet').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'SheetBrain_Model'
  );
  const [copiedTsv, setCopiedTsv] = useState(false);

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    const finalName = fileName.trim() || 'SheetBrain_Workbook';
    if (selectedFormat === 'xlsx') {
      onExportXLSX(finalName);
      onClose();
    } else if (selectedFormat === 'csv') {
      onExportCSV(finalName);
      onClose();
    } else if (selectedFormat === 'json') {
      onExportJSON(finalName);
      onClose();
    } else if (selectedFormat === 'tsv') {
      onCopyTSV();
      setCopiedTsv(true);
      setTimeout(() => {
        setCopiedTsv(false);
        onClose();
      }, 1000);
    } else if (selectedFormat === 'boardroom') {
      onClose();
      onOpenBoardroom();
    }
  };

  const formats: Array<{
    id: ExportFormatType;
    label: string;
    extension: string;
    badge: string;
    badgeColor: string;
    description: string;
    icon: React.ElementType;
  }> = [
    {
      id: 'xlsx',
      label: 'Microsoft Excel Workbook',
      extension: '.xlsx',
      badge: 'Recommended',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description: 'Preserves multi-sheet workbook tabs, formulas, bold styling, and cell alignments.',
      icon: FileSpreadsheet,
    },
    {
      id: 'csv',
      label: 'Comma-Separated Values',
      extension: '.csv',
      badge: 'Universal',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      description: 'Standard flat tabular dataset for Python, Pandas, SQL databases, and BI platforms.',
      icon: FileText,
    },
    {
      id: 'tsv',
      label: 'Tab-Separated Clipboard',
      extension: '.tsv',
      badge: 'Instant Copy',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      description: 'Copies clean grid data to your clipboard ready to paste into Google Sheets or Excel.',
      icon: Copy,
    },
    {
      id: 'boardroom',
      label: 'Boardroom Executive Memo',
      extension: '.md / PDF',
      badge: 'C-Suite',
      badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      description: 'Strategic summary memo with variance deltas, Monte Carlo bounds, and executive narrative.',
      icon: Briefcase,
    },
    {
      id: 'json',
      label: 'SheetBrain Architecture Schema',
      extension: '.json',
      badge: 'Backup',
      badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      description: 'Complete programmatic JSON state with sheet metadata, chart configurations, and formulas.',
      icon: FileCode,
    },
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-inner">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Export Spreadsheet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose your desired file format and options
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* File Name Configuration */}
          <div>
            <label htmlFor="export-filename-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              File Name
            </label>
            <div className="flex items-center">
              <input
                id="export-filename-input"
                name="exportFilename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter export file name..."
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-l-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
              />
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-l-0 border-slate-300 dark:border-slate-700 rounded-r-xl px-3 py-2 text-xs font-mono">
                {formats.find(f => f.id === selectedFormat)?.extension || '.xlsx'}
              </span>
            </div>
          </div>

          {/* Format Options Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Export Format
            </label>
            <div className="space-y-2">
              {formats.map((fmt) => {
                const IconComponent = fmt.icon;
                const isSelected = selectedFormat === fmt.id;

                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/60'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold ${
                          isSelected ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-900 dark:text-white'
                        }`}>
                          {fmt.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${fmt.badgeColor}`}>
                          {fmt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {fmt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Sheet vs Multi-Sheet Info */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              <span>
                Workbook Scope: <strong>{workbook.sheets?.length || 1} sheet(s)</strong>
              </span>
            </div>
            <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
              Active: {activeSheet?.name || 'Sheet 1'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteExport}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-cyan-950/20 active:scale-[0.98]"
          >
            {copiedTsv ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>
                  {selectedFormat === 'tsv'
                    ? 'Copy to Clipboard'
                    : selectedFormat === 'boardroom'
                    ? 'Open Executive Memo'
                    : `Export ${selectedFormat.toUpperCase()}`}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
