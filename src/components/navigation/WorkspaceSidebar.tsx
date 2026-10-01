'use client';

import React, { useId, useRef, useState } from 'react';
import {
  Trash2,
  FileSpreadsheet,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  HardDrive,
  TableProperties,
  Layers,
  X,
  RotateCcw
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
  activeSheetId?: string;
  onSelectSheet?: (sheetId: string) => void;
  onAddSheet?: () => void;
  onDeleteSheet?: (sheetId: string) => void;
  onRenameSheet?: (sheetId: string, newName: string) => void;
  onReorderSheets?: (sourceId: string, targetId: string) => void;
  onNewBlankSpreadsheet?: () => void;
  onClearAllData?: () => void;
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
  onDeleteDataset,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onDeleteSheet,
  onRenameSheet,
  onReorderSheets,
  onNewBlankSpreadsheet,
  onClearAllData,
}: WorkspaceSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sectionId = useId();
  const [expandedSections, setExpandedSections] = useState({
    sheets: true,
    datasets: true,
    info: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const resetSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const defaultDatasets: DatasetItem[] = [
    { key: 'blank_sheet', label: 'Sheet 1', category: 'Workspace', periods: 'Blank (1 Sheet)', type: 'Blank' },
  ];

  const activeDatasets = datasets || defaultDatasets;
  const query = searchQuery.trim().toLowerCase();
  const filteredDatasets = activeDatasets.filter(t =>
    !query || t.label.toLowerCase().includes(query) || t.category.toLowerCase().includes(query)
  );

  const sheetsList = currentWorkbook?.sheets || [];
  const currentActiveSheetId = activeSheetId || sheetsList[0]?.id || 'sheet_1';

  const filteredSheets = sheetsList.filter(s =>
    !query || (s.name || '').toLowerCase().includes(query)
  );

  const noMatches = query.length > 0 && filteredDatasets.length === 0 && filteredSheets.length === 0;
  const workbookTitle = currentWorkbook?.title || customImportName || 'Active spreadsheet';
  const focusStyle = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]';
  const selectionStyle = (isActive: boolean) => isActive
    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-xs'
    : 'border-transparent text-[var(--cell-text)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]';
  const sectionStyle = `flex min-h-10 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold text-[var(--cell-muted)] transition-colors duration-150 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] ${focusStyle}`;
  const railStyle = `flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150 ${focusStyle}`;

  if (isCollapsed) {
    return (
      <aside aria-label="Workspace sidebar" className="studio-sidebar-collapsed flex h-full min-h-0 w-14 shrink-0 flex-col overflow-hidden border-r border-[var(--border-color)] bg-[var(--panel-bg)] text-[var(--cell-text)]">
        <header className="flex shrink-0 flex-col items-center gap-2 border-b border-[var(--border-color)] px-1 py-3">
          <div aria-label="SheetBrain AI" role="img" className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <TableProperties aria-hidden="true" className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand Sidebar"
            title="Expand Sidebar"
            className={`${railStyle} ${selectionStyle(false)}`}
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        {/* Collapsed Rail Navigation: Active Sheets */}
        <nav aria-label="Active sheet tabs" className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden px-1 py-2">
          <div className="text-[9px] font-bold text-[var(--cell-muted)] uppercase tracking-wider py-1 select-none">Sheets</div>
          {sheetsList.map((s, idx) => {
            const isActive = s.id === currentActiveSheetId;
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => onSelectSheet?.(s.id)}
                aria-label={s.name || `Sheet ${idx + 1}`}
                aria-current={isActive ? 'true' : undefined}
                title={`${s.name || `Sheet ${idx + 1}`} (${s.rowCount || 0} rows)`}
                className={`${railStyle} ${selectionStyle(isActive)}`}
              >
                <span className="text-xs font-mono font-bold">{idx + 1}</span>
              </button>
            );
          })}
          {onAddSheet && (
            <button
              type="button"
              onClick={onAddSheet}
              aria-label="Add Sheet Tab"
              title="Add New Sheet Tab"
              className={`${railStyle} text-[var(--cell-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]`}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          )}

          <div className="my-2 h-px w-6 bg-[var(--border-color)]" />
          <div className="text-[9px] font-bold text-[var(--cell-muted)] uppercase tracking-wider py-1 select-none">Files</div>
          <button
            type="button"
            onClick={onNewBlankSpreadsheet || (() => onSelectTemplate('blank_sheet'))}
            aria-label="New Blank Spreadsheet"
            aria-current={activeTemplateKey.startsWith('blank_') ? 'true' : undefined}
            title="Create New Blank Spreadsheet"
            className={`${railStyle} ${selectionStyle(activeTemplateKey.startsWith('blank_'))}`}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
          {activeDatasets.slice(0, 5).map(d => (
            <button
              type="button"
              key={d.key}
              onClick={() => onSelectTemplate(d.key)}
              aria-label={d.label}
              aria-current={activeTemplateKey === d.key ? 'true' : undefined}
              title={d.label}
              className={`${railStyle} ${selectionStyle(activeTemplateKey === d.key)}`}
            >
              <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
            </button>
          ))}
        </nav>

        <footer className="flex shrink-0 justify-center border-t border-[var(--border-color)] p-1 py-3">
          <button
            type="button"
            onClick={onUploadClick}
            aria-label="Import CSV / XLSX Files"
            title="Import CSV / XLSX Files"
            className={`${railStyle} border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90`}
          >
            <Upload aria-hidden="true" className="h-4 w-4" />
          </button>
        </footer>
      </aside>
    );
  }

  return (
    <aside aria-label="Workspace sidebar" className="studio-sidebar-wrapper flex h-full min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r border-[var(--border-color)] bg-[var(--panel-bg)] text-[var(--cell-text)] max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-2xl">
      <header className="shrink-0 border-b border-[var(--border-color)]">
        <div className="flex min-w-0 items-center gap-2 px-3 py-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <TableProperties aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="studio-brand truncate text-base font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              SheetBrain AI
            </div>
            <p className="truncate text-xs leading-4 text-[var(--cell-muted)]" title="Spreadsheet intelligence">
              Spreadsheet intelligence
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse Sidebar"
            title="Collapse Sidebar"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--cell-muted)] transition-colors duration-150 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] ${focusStyle}`}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="px-3 pb-3">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--cell-muted)]" />
            <input
              ref={searchInputRef}
              id="workspace-search-input"
              name="workspaceSearch"
              type="search"
              aria-label="Search datasets and files"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setExpandedSections(prev => ({ ...prev, sheets: true, datasets: true }));
              }}
              placeholder="Search sheets & files..."
              className={`h-10 w-full min-w-0 rounded-lg border border-[var(--border-color)] bg-[var(--app-bg)] pl-9 pr-11 text-xs text-[var(--cell-text)] placeholder:text-[var(--cell-muted)] transition-colors duration-150 [&::-webkit-search-cancel-button]:appearance-none ${focusStyle}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={resetSearch}
                aria-label="Clear search"
                title="Clear search"
                className={`absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md text-[var(--cell-muted)] transition-colors duration-150 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] ${focusStyle}`}
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <nav aria-label="Workspace navigation" className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3">
        {/* Quick New Blank Spreadsheet Button */}
        <button
          type="button"
          onClick={onNewBlankSpreadsheet || (() => onSelectTemplate('blank_sheet'))}
          aria-label="New Blank Spreadsheet"
          className="flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white px-3 py-2 text-xs font-semibold shadow-md shadow-cyan-950/20 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="truncate">New blank spreadsheet</span>
        </button>

        {noMatches ? (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-subtle)] p-3">
            <div role="status">
              <p className="text-xs font-semibold">No matches found</p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--cell-muted)]">Try another keyword or reset search to view all sheets & files.</p>
            </div>
            <button
              type="button"
              onClick={resetSearch}
              className={`mt-2.5 min-h-9 w-full rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition-colors duration-150 hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] ${focusStyle}`}
            >
              Reset search
            </button>
          </div>
        ) : (
          <>
            {/* 1. Sheets in Active Workbook Section */}
            <section className="rounded-xl border border-[var(--border-color)] bg-[var(--panel-subtle)]/50 p-2">
              <div className="flex items-center justify-between px-1 mb-1.5">
                <button
                  type="button"
                  onClick={() => toggleSection('sheets')}
                  aria-expanded={expandedSections.sheets}
                  aria-controls={`${sectionId}-sheets`}
                  className="flex items-center gap-2 text-left text-xs font-semibold text-[var(--cell-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  <Layers aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                  <span className="truncate">Workbook Sheets</span>
                  <span className="font-mono tabular-nums px-1.5 py-0.2 bg-[var(--accent-soft)] text-[var(--accent)] text-[10px] font-bold rounded-full">
                    {sheetsList.length}
                  </span>
                  <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${expandedSections.sheets ? '' : '-rotate-90'}`} />
                </button>
                {onAddSheet && (
                  <button
                    type="button"
                    onClick={onAddSheet}
                    title="Add new sheet tab"
                    className="p-1 rounded-md text-[var(--cell-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div id={`${sectionId}-sheets`} hidden={!expandedSections.sheets} className="space-y-1">
                {filteredSheets.map((s, idx) => {
                  const isActive = s.id === currentActiveSheetId;
                  return (
                    <div
                      key={s.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', s.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const sourceId = e.dataTransfer.getData('text/plain');
                        if (sourceId && sourceId !== s.id && onReorderSheets) {
                          onReorderSheets(sourceId, s.id);
                        }
                      }}
                      title="Click to select, drag to reorder sheet"
                      className={`group flex min-w-0 items-center justify-between rounded-lg border transition-all duration-150 cursor-grab active:cursor-grabbing ${selectionStyle(isActive)}`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectSheet?.(s.id)}
                        className={`flex min-h-10 min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left ${focusStyle}`}
                      >
                        <FileSpreadsheet className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--cell-muted)]'}`} />
                        <div className="min-w-0 flex-1">
                          <span className={`block truncate text-xs font-semibold ${isActive ? 'text-[var(--accent)]' : 'text-[var(--cell-text)]'}`}>
                            {s.name || `Sheet ${idx + 1}`}
                          </span>
                          <span className="block text-[10px] text-[var(--cell-muted)] font-mono tabular-nums">
                            {s.rowCount || 0} rows · {(s.columns || []).length} cols
                          </span>
                        </div>
                        {isActive && (
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded border border-[var(--accent)]/30">
                            Active
                          </span>
                        )}
                      </button>

                      {/* Move Up/Down Quick Reorder Arrows */}
                      {sheetsList.length > 1 && onReorderSheets && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 mr-1 transition">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const prevSheet = sheetsList[idx - 1];
                                if (prevSheet) onReorderSheets(s.id, prevSheet.id);
                              }}
                              title="Move sheet up"
                              className="text-[10px] p-0.5 hover:text-cyan-400 text-slate-400 rounded"
                            >
                              ▲
                            </button>
                          )}
                          {idx < sheetsList.length - 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextSheet = sheetsList[idx + 1];
                                if (nextSheet) onReorderSheets(s.id, nextSheet.id);
                              }}
                              title="Move sheet down"
                              className="text-[10px] p-0.5 hover:text-cyan-400 text-slate-400 rounded"
                            >
                              ▼
                            </button>
                          )}
                        </div>
                      )}
                      {onDeleteSheet && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSheet(s.id);
                          }}
                          aria-label={sheetsList.length > 1 ? `Delete ${s.name || `Sheet ${idx + 1}`}` : `Clear and reset sheet to blank`}
                          title={sheetsList.length > 1 ? `Delete ${s.name || `Sheet ${idx + 1}`}` : `Clear and reset sheet to blank`}
                          className={`mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 text-[var(--cell-muted)] transition-opacity duration-150 ${sheetsList.length > 1 ? 'hover:bg-rose-500/10 hover:text-rose-500' : 'hover:bg-amber-500/10 hover:text-amber-500'} ${focusStyle}`}
                        >
                          {sheetsList.length > 1 ? (
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          ) : (
                            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. Datasets & Files Section */}
            <section>
              <h2>
                <button
                  type="button"
                  onClick={() => toggleSection('datasets')}
                  aria-expanded={expandedSections.datasets}
                  aria-controls={`${sectionId}-datasets`}
                  className={sectionStyle}
                >
                  <HardDrive aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-500" />
                  <span className="min-w-0 flex-1 truncate">Datasets & files</span>
                  <span className="font-mono tabular-nums">{filteredDatasets.length}</span>
                  <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${expandedSections.datasets ? '' : '-rotate-90'}`} />
                </button>
              </h2>
              <div id={`${sectionId}-datasets`} hidden={!expandedSections.datasets} className="mt-1 space-y-1">
                {filteredDatasets.length === 0 ? (
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--panel-subtle)] p-3 text-center">
                    <p className="text-xs text-[var(--cell-muted)] font-medium">
                      {query ? 'No matching datasets found.' : 'No datasets saved.'}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--cell-muted)]">
                      Paste or enter your data in the grid, or click "+ New blank spreadsheet".
                    </p>
                  </div>
                ) : filteredDatasets.map(t => {
                  const isActive = activeTemplateKey === t.key;
                  return (
                    <div key={t.key} className={`group flex min-w-0 items-center rounded-lg border transition-colors duration-150 ${selectionStyle(isActive)}`}>
                      <button
                        type="button"
                        onClick={() => onSelectTemplate(t.key)}
                        aria-label={t.label}
                        aria-current={isActive ? 'true' : undefined}
                        title={t.label}
                        className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left ${focusStyle}`}
                      >
                        <FileSpreadsheet aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">{t.label}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-[var(--cell-muted)]" title={`${t.category} · ${t.periods}`}>
                            {t.category}<span aria-hidden="true"> · </span><span className="font-mono tabular-nums">{t.periods}</span>
                          </span>
                        </span>
                      </button>
                      {onDeleteDataset && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDataset(t.key);
                          }}
                          aria-label={`Delete ${t.label}`}
                          title={`Delete ${t.label} and reset page`}
                          className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors duration-150 ${focusStyle}`}
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* 3. Current Workbook Info */}
        <section className="border-t border-[var(--border-color)] pt-3">
          <h2>
            <button
              type="button"
              onClick={() => toggleSection('info')}
              aria-expanded={expandedSections.info}
              aria-controls={`${sectionId}-info`}
              className={sectionStyle}
            >
              <TableProperties aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Current workbook</span>
              <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${expandedSections.info ? '' : '-rotate-90'}`} />
            </button>
          </h2>
          <div id={`${sectionId}-info`} hidden={!expandedSections.info} className="mt-1 rounded-lg border border-[var(--border-color)] bg-[var(--panel-subtle)] p-2.5">
            <p className="truncate text-xs font-semibold" title={workbookTitle}>{workbookTitle}</p>
            <dl className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <dt className="text-[var(--cell-muted)]">Active sheet</dt>
                <dd className="min-w-0 truncate font-mono font-medium text-[var(--accent)]">
                  {sheetsList.find(s => s.id === currentActiveSheetId)?.name || 'Sheet1'}
                </dd>
              </div>
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <dt className="text-[var(--cell-muted)]">Total sheets</dt>
                <dd className="min-w-0 truncate font-mono tabular-nums font-medium">{sheetsList.length}</dd>
              </div>
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <dt className="shrink-0 text-[var(--cell-muted)]">Grid dimensions</dt>
                <dd className="min-w-0 truncate font-mono tabular-nums" title="Columns × rows">
                  {(sheetsList.find(s => s.id === currentActiveSheetId)?.columns || []).length}C × {sheetsList.find(s => s.id === currentActiveSheetId)?.rowCount || 0}R
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </nav>

      <footer className="shrink-0 space-y-2 border-t border-[var(--border-color)] bg-[var(--panel-bg)] p-3">
        <button
          type="button"
          onClick={onUploadClick}
          title="Import CSV / XLSX Files"
          className="flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 px-3 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <Upload aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="truncate">Import workbook (CSV / XLSX)</span>
        </button>
        {onClearAllData && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear all datasets from sidebar and start with a clean empty sheet?')) {
                onClearAllData();
              }
            }}
            title="Clear all datasets and reset to a clean blank spreadsheet"
            className="flex min-h-9 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Clear All Datasets</span>
          </button>
        )}
      </footer>
    </aside>
  );
}
