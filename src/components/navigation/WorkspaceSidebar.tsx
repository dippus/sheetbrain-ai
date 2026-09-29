'use client';

import React, { useState } from 'react';
import {
  Trash2,
  FolderOpen,
  GitBranch,
  Folder,
  FileSpreadsheet,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Layers,
  Database,
  Search,
  Server,
  FileText
} from 'lucide-react';
import { WorkbookModel } from '@/types/sheet';

export interface DatasetItem {
  key: string;
  label: string;
  category: string;
  periods: string;
  type: string;
}

interface WorkspaceSidebarProps {
  currentWorkbook: WorkbookModel;
  activeTemplateKey: string;
  onSelectTemplate: (key: string) => void;
  customImportName: string | null;
  onUploadClick: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  datasets?: DatasetItem[];
  onDeleteDataset?: (key: string) => void;
}

export default function WorkspaceSidebar({
  currentWorkbook,
  activeTemplateKey,
  onSelectTemplate,
  customImportName,
  onUploadClick,
  isCollapsed,
  onToggleCollapse,
  datasets,
  onDeleteDataset
}: WorkspaceSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const defaultDatasets: DatasetItem[] = [
    { key: 'blank_sheet', label: 'New Blank Spreadsheet', category: 'Workspace', periods: 'Blank', type: 'Blank' },
    { key: 'Expense-Claims.xlsx', label: 'Expense-Claims.xlsx', category: 'Excel Dataset', periods: '1,001 Rows', type: 'Native XLSX' },
  ];

  const activeDatasets = datasets || defaultDatasets;

  const filteredTemplates = activeDatasets.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-white dark:bg-[#0c121e] border-r border-slate-200 dark:border-[#1e293b] flex flex-col items-center py-3 select-none justify-between transition-colors shrink-0">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onToggleCollapse}
            title="Expand Workspace Navigator"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#1a2333] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-6 h-px bg-slate-200 dark:bg-[#1e293b]" />
          {activeDatasets.slice(0, 6).map((d) => (
            <button
              key={d.key}
              onClick={() => onSelectTemplate(d.key)}
              title={d.label}
              className={`p-2 rounded transition ${
                activeTemplateKey === d.key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a2333]'
              }`}
            >
              {d.key === 'blank_sheet' ? (
                <Plus className="w-4 h-4" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onUploadClick}
          title="Upload CSV / XLSX"
          className="p-2 rounded hover:bg-slate-100 dark:hover:bg-[#1a2333] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <Upload className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-slate-50 dark:bg-[#0c121e] border-r border-slate-200 dark:border-[#1e293b] flex flex-col justify-between text-xs text-slate-700 dark:text-slate-300 select-none transition-colors shrink-0">
      <div className="flex flex-col min-h-0">
        {/* Workspace Brand & Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-xs tracking-tight">
              SB
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-tight">
                  SheetBrain Pro
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block ">
                Desktop Spreadsheet
              </span>
            </div>
          </div>
          <button
            onClick={onToggleCollapse}
            title="Collapse Sidebar (Alt+[)"
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Model Filter Search Input */}
        <div className="p-2 border-b border-slate-200 dark:border-[#1e293b]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search datasets & sheets..."
              className="w-full bg-white dark:bg-[#151e2e] border border-slate-200 dark:border-[#223049] rounded px-2.5 py-1.5 pl-8 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
            />
          </div>
        </div>

        {/* Financial Models Section */}
        <div className="p-2 overflow-y-auto max-h-[calc(100vh-270px)]">
          <div className="flex items-center justify-between px-1 py-1 mb-1">
            <span className="text-[10px] font-bold font-medium text-slate-400 dark:text-slate-500">
              Local Datasets (data/)
            </span>
            <span className="text-[10px] bg-slate-200 dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded ">
              {activeDatasets.length}
            </span>
          </div>

          <div className="space-y-0.5">
            {filteredTemplates.map((t) => {
              const isActive = activeTemplateKey === t.key;
              const isDeletable = t.key !== 'blank_sheet';

              return (
                <div
                  key={t.key}
                  onClick={() => onSelectTemplate(t.key)}
                  className={`w-full text-left px-2.5 py-2 rounded text-xs transition flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'hover:bg-slate-200/70 dark:hover:bg-[#162031] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                    <span className="truncate">{t.label}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-slate-200/60 dark:bg-[#1e293b] text-slate-500 dark:text-slate-400 group-hover:bg-slate-300/60'
                    }`}>
                      {t.periods}
                    </span>
                    {isDeletable && onDeleteDataset && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDataset(t.key);
                        }}
                        title={`Delete ${t.label} from workspace`}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition ${
                          isActive
                            ? 'hover:bg-blue-700 text-white'
                            : 'hover:bg-red-100 dark:hover:bg-red-950/60 text-slate-400 hover:text-red-500'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Custom Imported File Pill */}
            {customImportName && (
              <button
                onClick={() => onSelectTemplate('imported')}
                className={`w-full text-left px-2.5 py-2 rounded text-xs transition flex items-center justify-between ${
                  activeTemplateKey === 'imported'
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'hover:bg-slate-200/70 dark:hover:bg-[#162031] text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Database className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{customImportName}</span>
                </div>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded ">
                  Custom
                </span>
              </button>
            )}
          </div>

          {/* Active Sheets in Current Workbook */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#1e293b]">
            <div className="px-1 py-1 mb-1">
              <span className="text-[10px] font-bold font-medium text-slate-400 dark:text-slate-500">
                Current Workbook
              </span>
            </div>
            <div className="px-2 py-1.5 bg-white dark:bg-[#131b2a] rounded border border-slate-200 dark:border-[#1e293b] space-y-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentWorkbook.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 ">
                {(currentWorkbook?.sheets || []).length} Sheet(s) · {(currentWorkbook?.sheets?.[0]?.columns || []).length} Col x {currentWorkbook?.sheets?.[0]?.rowCount || 0} Row
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Engine Status */}
      <div className="p-3 border-t border-slate-200 dark:border-[#1e293b] bg-slate-100/70 dark:bg-[#0a0f19] space-y-2">
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-white dark:bg-[#162031] hover:bg-slate-100 dark:hover:bg-[#1e2a40] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#223049] font-medium text-xs transition shadow-sm"
        >
          <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Import CSV / TSV</span>
        </button>

        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400  pt-1">
          <div className="flex items-center gap-1">
            <Server className="w-3 h-3 text-blue-500" />
            <span>Local WASM Engine</span>
          </div>
          <span className="text-blue-600 dark:text-blue-400 font-bold">60 FPS</span>
        </div>
      </div>
    </aside>
  );
}
