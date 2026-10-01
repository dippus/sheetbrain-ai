'use client';

import dynamic from 'next/dynamic';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SheetData, SheetColumn, SheetCell } from '@/types/sheet';
import { indexToColLetter } from '@/lib/engine/csvHelper';
import {
  Plus,
  Table,
  ArrowUpDown,
  Calculator,
  HelpCircle,
  X,
  FileSpreadsheet,
  Activity,
  Sliders,
  CheckCircle,
  RotateCcw,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Sparkles,
  AlertTriangle,
  Trash2,
  Pencil
} from 'lucide-react';

import FormulaExplainerModal from '../inspector/FormulaExplainerModal';

const UniverSheetCore = dynamic(
  () => import('./UniverSheetCore'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full absolute inset-0 flex flex-col bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 select-none overflow-hidden font-mono">
        {/* Top Formula Bar Skeleton */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-900/40">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">fx</span>
          <div className="h-4 flex-1 bg-slate-200 dark:bg-slate-800/40 rounded animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans tracking-wide">Mounting Univer Engine…</span>
          </div>
        </div>

        {/* Column Headers Skeleton */}
        <div className="flex border-b border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-[11px]">
          <div className="w-10 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-600 bg-slate-200/50 dark:bg-slate-950/80">#</div>
          {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((col) => (
            <div key={col} className="flex-1 py-1.5 border-r border-slate-200 dark:border-slate-800/80 text-center font-semibold text-slate-600 dark:text-slate-400">
              {col}
            </div>
          ))}
        </div>

        {/* Grid Cells Skeleton Rows */}
        <div className="flex-1 flex flex-col divide-y divide-slate-200 dark:divide-slate-800/40">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
            <div key={row} className="flex h-8 items-center bg-white dark:bg-slate-950/30">
              <div className="w-10 h-full flex items-center justify-center border-r border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-600 bg-slate-50 dark:bg-slate-950/60 font-mono">
                {row}
              </div>
              <div className="flex-1 px-3 border-r border-slate-200 dark:border-slate-800/30">
                <div className={`h-3 rounded bg-slate-200 dark:bg-slate-800/30 animate-pulse ${row % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
              </div>
              <div className="flex-1 px-3 border-r border-slate-200 dark:border-slate-800/30">
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800/20 animate-pulse w-2/3" />
              </div>
              <div className="flex-1 px-3 border-r border-slate-200 dark:border-slate-800/30">
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800/20 animate-pulse w-1/2" />
              </div>
              <div className="flex-1 px-3 border-r border-slate-200 dark:border-slate-800/30">
                <div className="h-3 rounded bg-emerald-100 dark:bg-emerald-950/30 animate-pulse w-3/5" />
              </div>
              <div className="flex-1 px-3 border-r border-slate-200 dark:border-slate-800/30">
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800/20 animate-pulse w-1/3" />
              </div>
              <div className="flex-1 px-3 border-r border-slate-200 dark:border-slate-800/30">
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800/20 animate-pulse w-1/2" />
              </div>
              <div className="flex-1 px-3">
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800/20 animate-pulse w-2/5" />
              </div>
            </div>
          ))}
        </div>
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
  onReorderSheets?: (sourceId: string, targetId: string) => void;
  theme?: 'dark' | 'light' | 'system';
  activeScenario?: string;
  onCommitBaseline?: () => void;
  onResetSimulation?: () => void;
  onSwitchToScenarios?: () => void;
  onOpenAudit?: () => void;
}

export default function UniverSheetWrapper({
  sheet,
  onCellChange,
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onDeleteSheet,
  onRenameSheet,
  onReorderSheets,
  theme = 'dark',
  activeScenario,
  onCommitBaseline,
  onResetSimulation,
  onSwitchToScenarios,
  onOpenAudit,
}: UniverSheetWrapperProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFormulaMenu, setShowFormulaMenu] = useState(false);
  const [showDiffDrawer, setShowDiffDrawer] = useState(false);
  const [showFormulaExplainer, setShowFormulaExplainer] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<SheetData | null>(null);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [tempSheetName, setTempSheetName] = useState<string>('');
  const [wrapperRevision, setWrapperRevision] = useState<number>(0);
  const [draggedSheetId, setDraggedSheetId] = useState<string | null>(null);
  const [dragOverSheetId, setDragOverSheetId] = useState<string | null>(null);
  const formulaMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (formulaMenuRef.current && !formulaMenuRef.current.contains(e.target as Node)) {
        setShowFormulaMenu(false);
      }
    };
    if (showFormulaMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFormulaMenu]);

  const handleStartRename = (s: SheetData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSheetId(s.id);
    setTempSheetName(s.name || '');
  };

  const handleSaveRename = (sheetId: string) => {
    const trimmed = tempSheetName.trim();
    if (trimmed && onRenameSheet) {
      onRenameSheet(sheetId, trimmed);
    }
    setEditingSheetId(null);
  };

  // 1. Extract all modified cells with Before vs After values
  const modifiedCellsList = useMemo(() => {
    const list: Array<{
      coord: string;
      label: string;
      before: number | string | boolean | undefined;
      after: number | string | boolean | undefined;
      deltaVal?: number;
      deltaPercent?: string;
      colType: string;
    }> = [];

    const cellMap = sheet?.cellData || {};
    const cols = sheet?.columns || [];

    Object.keys(cellMap).forEach(coord => {
      const cell = cellMap[coord];
      if (cell?.isModified) {
        const colLetter = coord.match(/^([A-Z]+)/)?.[1] || '';
        const rowNum = coord.match(/(\d+)$/)?.[1] || '';
        const colDef = cols.find(c => c.key === colLetter);
        const rowLabel = cellMap[`A${rowNum}`]?.v || `Row ${rowNum}`;
        const label = `${colDef?.label || colLetter} (${rowLabel})`;

        list.push({
          coord,
          label,
          before: cell.baselineValue !== undefined ? cell.baselineValue : '—',
          after: cell.v,
          deltaVal: cell.deltaValue,
          deltaPercent: cell.deltaPercent,
          colType: colDef?.type || 'number',
        });
      }
    });

    return list;
  }, [sheet]);

  // Aggregate Before vs After sums for modified cells
  const diffStats = useMemo(() => {
    let beforeSum = 0;
    let afterSum = 0;
    modifiedCellsList.forEach(item => {
      if (typeof item.before === 'number') beforeSum += item.before;
      if (typeof item.after === 'number') afterSum += item.after;
    });
    const deltaSum = afterSum - beforeSum;
    const deltaPct = beforeSum !== 0 ? Math.round((deltaSum / Math.abs(beforeSum)) * 100) : 0;
    return {
      beforeSum,
      afterSum,
      deltaSum,
      deltaPct,
      count: modifiedCellsList.length,
    };
  }, [modifiedCellsList]);

  const hasSimulation = (activeScenario !== undefined && activeScenario.length > 0) || modifiedCellsList.length > 0;

  // 1. Add 25 empty rows to bottom
  const handleAdd25Rows = () => {
    setWrapperRevision(r => r + 1);
    onCellChange({
      ...sheet,
      rowCount: (sheet.rowCount || 20) + 25,
    });
  };

  // 2. Add New Column
  const handleAddColumn = () => {
    const currentCols = sheet.columns || [];
    const nextColLetter = indexToColLetter(currentCols.length);
    const newCol: SheetColumn = {
      key: nextColLetter,
      label: `Column ${nextColLetter}`,
      type: 'number',
      width: 130,
    };
    setWrapperRevision(r => r + 1);
    onCellChange({
      ...sheet,
      columnCount: (sheet.columnCount || currentCols.length) + 1,
      columns: [...currentCols, newCol],
    });
  };

  // 3. Quick Formula Injector (Appends a calculated summary row)
  const handleInsertSummaryFormula = (formulaType: 'SUM' | 'AVERAGE' | 'MAX' | 'MIN' | 'COUNT') => {
    const numericCols = (sheet.columns || []).filter(
      c => c.type === 'number' || c.type === 'currency' || c.type === 'percentage'
    );
    const targetCols = numericCols.length > 0 ? numericCols : (sheet.columns || []).slice(1);

    const currentRowCount = sheet.rowCount || 20;
    const summaryRowNum = currentRowCount + 1;

    const newCellData: Record<string, SheetCell> = { ...(sheet.cellData || {}) };
    newCellData[`A${summaryRowNum}`] = {
      v: `Total (${formulaType})`,
      bold: true,
      align: 'left',
    };

    targetCols.forEach(col => {
      const coord = `${col.key}${summaryRowNum}`;
      newCellData[coord] = {
        f: `=${formulaType}(${col.key}2:${col.key}${currentRowCount})`,
        bold: true,
        align: 'right',
      };
    });

    setWrapperRevision(r => r + 1);
    onCellChange({
      ...sheet,
      rowCount: summaryRowNum,
      cellData: newCellData,
    });
    setShowFormulaMenu(false);
  };

  // 4. Sort Rows by Primary Column (Ascending / Descending Natural Sort)
  const handleSortByCol = (ascending: boolean) => {
    const totalRows = sheet.rowCount || 2;
    if (totalRows <= 2) return;

    // Collect data rows (row 2 to totalRows)
    const rowList: { rowNum: number; valA: number | string | boolean | undefined; cells: Record<string, SheetCell> }[] = [];
    for (let r = 2; r <= totalRows; r++) {
      const rowCells: Record<string, SheetCell> = {};
      (sheet.columns || []).forEach(c => {
        const cell = sheet.cellData?.[`${c.key}${r}`];
        if (cell) rowCells[c.key] = cell;
      });
      rowList.push({
        rowNum: r,
        valA: sheet.cellData?.[`A${r}`]?.v ?? '',
        cells: rowCells,
      });
    }

    rowList.sort((a, b) => {
      const va = a.valA;
      const vb = b.valA;
      const strA = String(va ?? '').trim();
      const strB = String(vb ?? '').trim();
      const cleanA = strA.replace(/[^0-9.-]+/g, '');
      const cleanB = strB.replace(/[^0-9.-]+/g, '');
      const numA = typeof va === 'number' ? va : (cleanA !== '' && !isNaN(Number(cleanA)) ? Number(cleanA) : NaN);
      const numB = typeof vb === 'number' ? vb : (cleanB !== '' && !isNaN(Number(cleanB)) ? Number(cleanB) : NaN);

      if (!isNaN(numA) && !isNaN(numB)) {
        return ascending ? numA - numB : numB - numA;
      }

      return ascending
        ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' })
        : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Reconstruct cellData
    const updatedCellData: Record<string, SheetCell> = {};
    (sheet.columns || []).forEach(c => {
      const hCell = sheet.cellData?.[`${c.key}1`];
      if (hCell) updatedCellData[`${c.key}1`] = hCell;
    });

    rowList.forEach((rObj, idx) => {
      const targetRow = idx + 2;
      Object.entries(rObj.cells).forEach(([colKey, cell]) => {
        updatedCellData[`${colKey}${targetRow}`] = cell;
      });
    });

    setWrapperRevision(r => r + 1);
    onCellChange({
      ...sheet,
      cellData: updatedCellData,
    });
  };

  const totalCells = Object.keys(sheet?.cellData || {}).length;

  const formatNum = (v: number | string | boolean | undefined | null) => {
    if (typeof v !== 'number' || isNaN(v)) return String(v ?? '—');
    return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 flex flex-col relative select-none">
      
      {/* 1. WHAT-IF SIMULATION ACTIVE: BEFORE vs AFTER FLOATING DIFF BANNER */}
      {hasSimulation && (
        <div className="bg-cyan-50/95 dark:bg-gradient-to-r dark:from-cyan-950/80 dark:via-slate-900/95 dark:to-slate-950/95 border-b border-cyan-200 dark:border-cyan-500/30 px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm dark:shadow-md shrink-0 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-bold border border-cyan-300 dark:border-cyan-400/30 text-[11px]">
              <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-600 dark:text-cyan-400" />
              <span>What-If Diff Active</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
              {activeScenario || 'Custom Sensitivity Model'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 text-[10px] font-mono">
              {diffStats.count} cells modified
            </span>
          </div>

          {/* Quick Metrics: Before ➔ After ➔ Diff */}
          <div className="flex items-center gap-3 font-mono">
            {diffStats.beforeSum > 0 && (
              <div className="hidden md:flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                <span className="text-slate-400 dark:text-slate-500">Baseline:</span>
                <span>${formatNum(diffStats.beforeSum)}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span className="text-cyan-700 dark:text-cyan-400 font-bold">Simulated:</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-bold">${formatNum(diffStats.afterSum)}</span>
                <span className={`font-bold ml-1 ${diffStats.deltaSum >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  ({diffStats.deltaSum >= 0 ? `+` : `-`}${formatNum(Math.abs(diffStats.deltaSum))} / {diffStats.deltaPct >= 0 ? `+` : ``}{diffStats.deltaPct}%)
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowDiffDrawer(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 border active:scale-[0.98] ${
                  showDiffDrawer
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                    : 'bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 shadow-2xs'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showDiffDrawer ? 'Hide Diff' : 'View Diff Breakdown'}</span>
              </button>

              {onSwitchToScenarios && (
                <button
                  onClick={onSwitchToScenarios}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1 border border-slate-200 dark:border-slate-700/80 shadow-2xs hidden sm:flex active:scale-[0.98]"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Scenario Studio</span>
                </button>
              )}

              {onCommitBaseline && (
                <button
                  onClick={onCommitBaseline}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm shadow-emerald-950/20 active:scale-[0.98]"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Commit Baseline</span>
                </button>
              )}

              {onResetSimulation && (
                <button
                  onClick={onResetSimulation}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1 border border-slate-200 dark:border-slate-700/80 shadow-2xs active:scale-[0.98]"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIFF BREAKDOWN OVERLAY DRAWER */}
      {showDiffDrawer && hasSimulation && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-700 dark:text-slate-200 z-40 max-h-56 overflow-y-auto shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Cell-Level Before vs After Audit Trail</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({modifiedCellsList.length} modified entries)</span>
            </span>
            <button
              onClick={() => setShowDiffDrawer(false)}
              className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-0.5 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {modifiedCellsList.map(item => (
              <div
                key={item.coord}
                className="p-2 rounded bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 shadow-2xs"
              >
                <div>
                  <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-[11px]">{item.coord}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">{item.label}</div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 line-through">
                    {formatNum(item.before)}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatNum(item.after)}
                  </div>
                </div>

                {item.deltaPercent && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    item.deltaPercent.startsWith('+')
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'
                  }`}>
                    {item.deltaPercent}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Quick Productivity Ribbon Strip */}
      <div className="h-9 px-3 bg-slate-100/90 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Quick Auto-Formula Dropdown */}
          <div className="relative" ref={formulaMenuRef}>
            <button
              onClick={() => setShowFormulaMenu(!showFormulaMenu)}
              title="Insert Auto-Calculation Formula"
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 shadow-2xs active:scale-[0.98]"
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>fx Formula</span>
            </button>

            {showFormulaMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 text-xs">
                <button
                  onClick={() => handleInsertSummaryFormula('SUM')}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 flex items-center justify-between transition"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">AutoSum</span>
                  <span className="text-[10px] text-slate-400 font-mono">=SUM(...)</span>
                </button>
                <button
                  onClick={() => handleInsertSummaryFormula('AVERAGE')}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 flex items-center justify-between transition"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Average</span>
                  <span className="text-[10px] text-slate-400 font-mono">=AVERAGE(...)</span>
                </button>
                <button
                  onClick={() => handleInsertSummaryFormula('MAX')}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 flex items-center justify-between transition"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Maximum</span>
                  <span className="text-[10px] text-slate-400 font-mono">=MAX(...)</span>
                </button>
                <button
                  onClick={() => handleInsertSummaryFormula('MIN')}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 flex items-center justify-between transition"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Minimum</span>
                  <span className="text-[10px] text-slate-400 font-mono">=MIN(...)</span>
                </button>
                <button
                  onClick={() => handleInsertSummaryFormula('COUNT')}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 transition"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Count Rows</span>
                  <span className="text-[10px] text-slate-400 font-mono">=COUNT(...)</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Row/Col Adders */}
          <button
            onClick={handleAdd25Rows}
            title="Append 25 rows to bottom"
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs transition flex items-center gap-1 border border-slate-200 dark:border-slate-800 active:scale-[0.98]"
          >
            <Plus className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>+25 Rows</span>
          </button>

          <button
            onClick={handleAddColumn}
            title="Add new column"
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs transition flex items-center gap-1 border border-slate-200 dark:border-slate-800 active:scale-[0.98]"
          >
            <Table className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>+Column</span>
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-800 mx-0.5 hidden sm:block" />

          {/* Sort Buttons (A-Z and Z-A) */}
          <div className="hidden sm:flex items-center rounded-lg bg-slate-200/50 dark:bg-slate-800/50 p-0.5 border border-slate-300/60 dark:border-slate-700/60">
            <button
              onClick={() => handleSortByCol(true)}
              title="Sort rows Ascending (A to Z / Low to High) by primary column"
              className="px-2 py-0.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition flex items-center gap-1 active:scale-[0.98]"
            >
              <ArrowUpDown className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span>Sort A-Z</span>
            </button>
            <button
              onClick={() => handleSortByCol(false)}
              title="Sort rows Descending (Z to A / High to Low) by primary column"
              className="px-1.5 py-0.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition flex items-center gap-1 active:scale-[0.98]"
            >
              <span>Z-A</span>
            </button>
          </div>

          {/* Clear Sheet Cells */}
          <button
            onClick={() => {
              if (window.confirm('Clear all cell data from current sheet? Columns and structure will be preserved.')) {
                setWrapperRevision(r => r + 1);
                onCellChange({
                  ...sheet,
                  cellData: {},
                });
              }
            }}
            title="Clear all cell data from current sheet without removing columns"
            className="px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs transition hidden sm:flex items-center gap-1 active:scale-[0.98]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Cells</span>
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-800 mx-0.5 hidden sm:block" />

          {/* Anomaly Radar Quick Inspector */}
          {onOpenAudit && (
            <button
              onClick={onOpenAudit}
              title="Scan Sheet for Broken Formulas, Missing Totals, and Statistical Outliers"
              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs transition flex items-center gap-1.5 border border-rose-200 dark:border-rose-800/60 font-medium shrink-0 active:scale-[0.98]"
            >
              <AlertTriangle className="w-3 h-3 text-rose-500 animate-pulse" />
              <span>Anomaly Radar</span>
            </button>
          )}

          {/* Plain-English Formula Explainer */}
          <button
            onClick={() => setShowFormulaExplainer(true)}
            title="AI Formula Explainer: Plain-business-English explanation of all active spreadsheet formulas"
            className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 text-xs transition flex items-center gap-1.5 border border-cyan-200 dark:border-cyan-800/60 font-medium shrink-0 active:scale-[0.98]"
          >
            <Sparkles className="w-3 h-3 text-cyan-500" />
            <span>Explain Formulas</span>
          </button>
        </div>

        {/* Right Stats & Keyboard Shortcut helper */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <span className="hidden xl:inline tabular-nums">
            {sheet?.rowCount || 0} rows · {sheet?.columns?.length || 0} cols ({totalCells} cells)
          </span>
          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard Shortcuts"
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Univer Canvas Workspace */}
      <div className="flex-1 w-full h-full min-h-0 relative">
        <UniverSheetCore
          key={`univer_${sheet.id}_${theme}_${activeScenario || 'base'}_rev${wrapperRevision}_${(sheets || [sheet]).map(s => s.id).join('_')}`}
          sheet={sheet}
          sheets={sheets}
          activeSheetId={activeSheetId}
          onSelectSheet={onSelectSheet}
          onAddSheet={onAddSheet}
          onDeleteSheet={onDeleteSheet}
          onRenameSheet={onRenameSheet}
          onCellChange={onCellChange}
          theme={theme}
        />
      </div>

      {/* 4. Multi-Sheet Tabs Navigation Bar (Excel & Google Sheets Style) */}
      <div className="h-9 px-2 bg-slate-100/90 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs shrink-0 select-none z-10">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[80%] sm:max-w-[85%] py-1">
          {/* Add New Sheet Button */}
          {onAddSheet && (
            <button
              onClick={onAddSheet}
              title="Add New Sheet Tab"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition shrink-0 flex items-center gap-1 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[11px] font-semibold hidden md:inline">Add Sheet</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-800 mx-1 shrink-0" />

          {/* Sheet Tabs List */}
          {(sheets && sheets.length > 0 ? sheets : [sheet]).map((s, idx) => {
            const isActive = s.id === (activeSheetId || sheet.id);
            return (
              <div
                key={s.id}
                draggable={!editingSheetId}
                onDragStart={(e) => {
                  setDraggedSheetId(s.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', s.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverSheetId !== s.id) {
                    setDragOverSheetId(s.id);
                  }
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  if (dragOverSheetId === s.id) {
                    setDragOverSheetId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const sourceId = e.dataTransfer.getData('text/plain') || draggedSheetId;
                  if (sourceId && sourceId !== s.id && onReorderSheets) {
                    onReorderSheets(sourceId, s.id);
                  }
                  setDraggedSheetId(null);
                  setDragOverSheetId(null);
                }}
                onDragEnd={() => {
                  setDraggedSheetId(null);
                  setDragOverSheetId(null);
                }}
                onClick={() => onSelectSheet?.(s.id)}
                title="Click to select, drag anywhere to reorder sheet tab"
                className={`group flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-grab active:cursor-grabbing transition shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 shadow-xs'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
                } ${draggedSheetId === s.id ? 'opacity-40 scale-95 border-dashed border-cyan-500' : ''} ${
                  dragOverSheetId === s.id && draggedSheetId !== s.id ? 'border-2 border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 ring-2 ring-cyan-500/20' : ''
                }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />

                {/* Tab Label / Inline Rename Input */}
                {editingSheetId === s.id ? (
                  <input
                    id="sheet-rename-input"
                    name="sheetRename"
                    type="text"
                    value={tempSheetName}
                    onChange={(e) => setTempSheetName(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') handleSaveRename(s.id);
                      if (e.key === 'Escape') setEditingSheetId(null);
                    }}
                    onBlur={() => handleSaveRename(s.id)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="px-1.5 py-0.5 text-xs font-bold bg-white dark:bg-slate-950 border border-cyan-500 rounded-md text-slate-900 dark:text-slate-100 outline-none w-24 sm:w-28 shadow-inner"
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => handleStartRename(s, e)}
                    title="Double-click to rename sheet"
                    className="select-none font-medium"
                  >
                    {s.name || `Sheet ${idx + 1}`}
                  </span>
                )}

                {/* Move Left / Right Quick Reorder Arrows (visible on hover) */}
                {(sheets || []).length > 1 && onReorderSheets && editingSheetId !== s.id && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-1 transition">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const prevSheet = (sheets || [])[idx - 1];
                          if (prevSheet) onReorderSheets(s.id, prevSheet.id);
                        }}
                        title="Move sheet left"
                        className="hover:text-cyan-400 p-0.5 rounded text-[10px]"
                      >
                        ◀
                      </button>
                    )}
                    {idx < (sheets || []).length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextSheet = (sheets || [])[idx + 1];
                          if (nextSheet) onReorderSheets(s.id, nextSheet.id);
                        }}
                        title="Move sheet right"
                        className="hover:text-cyan-400 p-0.5 rounded text-[10px]"
                      >
                        ▶
                      </button>
                    )}
                  </div>
                )}

                {/* Rename Pencil Button (visible on hover) */}
                {editingSheetId !== s.id && onRenameSheet && (
                  <button
                    onClick={(e) => handleStartRename(s, e)}
                    title="Rename Sheet"
                    className="opacity-0 group-hover:opacity-100 hover:text-cyan-500 hover:bg-cyan-500/10 p-0.5 rounded transition ml-0.5"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}

                {/* Delete Sheet Tab (Only if more than 1 sheet exists) */}
                {(sheets || []).length > 1 && onDeleteSheet && editingSheetId !== s.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSheetToDelete(s);
                    }}
                    title={`Delete ${s.name}`}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 p-0.5 rounded transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono shrink-0 pr-2">
          <span>{(sheets && sheets.length > 0 ? sheets.length : 1)} Tab(s)</span>
        </div>
      </div>

      {/* 5. Delete Sheet Confirmation Modal */}
      {sheetToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheetToDelete(null);
          }}
          className="fixed inset-0 bg-black/50 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-5 text-slate-800 dark:text-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Delete Sheet Tab?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-slate-800 dark:text-slate-200">&ldquo;{sheetToDelete.name}&rdquo;</span>? All data, cells, and formulas in this tab will be removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSheetToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition border border-slate-200 dark:border-transparent active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDeleteSheet && sheetToDelete) {
                    onDeleteSheet(sheetToDelete.id);
                  }
                  setSheetToDelete(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-rose-950/20 active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShortcuts(false);
          }}
          className="fixed inset-0 bg-black/50 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Spreadsheet Keyboard Shortcuts
                </h3>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Edit Cell Directly</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-semibold text-[10px] text-slate-800 dark:text-slate-200">F2</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Confirm & Move Down</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-semibold text-[10px] text-slate-800 dark:text-slate-200">Enter</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Confirm & Move Right</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-semibold text-[10px] text-slate-800 dark:text-slate-200">Tab</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Undo Action</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-semibold text-[10px] text-slate-800 dark:text-slate-200">Ctrl + Z</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Redo Action</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-semibold text-[10px] text-slate-800 dark:text-slate-200">Ctrl + Y</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Copy / Paste Cells</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-semibold text-[10px] text-slate-800 dark:text-slate-200">Ctrl + C / V</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600 dark:text-slate-400">Right-Click Menu</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Insert / Delete Row, Col, Format</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowShortcuts(false)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-950/20 active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Formula Explainer AI Modal */}
      <FormulaExplainerModal
        sheet={sheet}
        sheets={sheets}
        isOpen={showFormulaExplainer}
        onClose={() => setShowFormulaExplainer(false)}
      />
    </div>
  );
}
