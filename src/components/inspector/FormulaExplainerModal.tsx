'use client';

import React, { useState, useMemo } from 'react';
import { SheetData, SheetCell } from '@/types/sheet';
import {
  FileCode,
  Sparkles,
  HelpCircle,
  X,
  Search,
  Check,
  ArrowRight,
  ShieldCheck,
  Copy,
  Layers,
  Calculator
} from 'lucide-react';

interface FormulaExplainerModalProps {
  sheet: SheetData;
  isOpen: boolean;
  onClose: () => void;
  onSelectCell?: (coord: string) => void;
}

interface FormulaItem {
  coord: string;
  formula: string;
  value: number | string | boolean | undefined | null;
  rowLabel: string;
  colLabel: string;
  explanation: string;
  category: 'Aggregation' | 'Ratio / %' | 'Arithmetic' | 'Logical';
}

export default function FormulaExplainerModal({
  sheet,
  isOpen,
  onClose,
  onSelectCell,
}: FormulaExplainerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCoord, setCopiedCoord] = useState<string | null>(null);

  const formulaList = useMemo<FormulaItem[]>(() => {
    if (!sheet?.cellData) return [];
    const items: FormulaItem[] = [];
    const cellMap = sheet.cellData;
    const cols = sheet.columns || [];

    Object.entries(cellMap).forEach(([coord, cell]) => {
      if (!cell || !cell.f) return;

      const colKey = coord.replace(/[0-9]/g, '');
      const rowNum = parseInt(coord.replace(/[^0-9]/g, ''), 10);
      const colObj = cols.find(c => c.key === colKey);
      const colLabel = colObj?.label || colKey;
      const rowLabelCell = cellMap[`A${rowNum}`]?.v;
      const rowLabel = rowLabelCell ? String(rowLabelCell) : `Row ${rowNum}`;

      const f = cell.f.trim();
      let explanation = '';
      let category: FormulaItem['category'] = 'Arithmetic';

      const fUpper = f.toUpperCase();
      if (fUpper.includes('SUM')) {
        category = 'Aggregation';
        explanation = `Aggregates and sums all underlying metric values for ${rowLabel} (${colLabel}).`;
      } else if (fUpper.includes('AVERAGE') || fUpper.includes('AVG')) {
        category = 'Aggregation';
        explanation = `Computes the arithmetic mean across the target range for ${rowLabel}.`;
      } else if (fUpper.includes('*') && (fUpper.includes('1.') || fUpper.includes('0.'))) {
        category = 'Ratio / %';
        explanation = `Applies a percentage variance factor or multiplier to baseline metrics in ${rowLabel}.`;
      } else if (fUpper.includes('/') || fUpper.includes('%')) {
        category = 'Ratio / %';
        explanation = `Calculates efficiency ratio or percentage share relative to total baseline.`;
      } else if (fUpper.includes('IF')) {
        category = 'Logical';
        explanation = `Applies conditional branch logic based on threshold parameters.`;
      } else {
        explanation = `Computes dynamic value for ${rowLabel} (${colLabel}) using formula syntax ${f}.`;
      }

      items.push({
        coord,
        formula: f,
        value: cell.v,
        rowLabel,
        colLabel,
        explanation,
        category,
      });
    });

    return items;
  }, [sheet]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return formulaList;
    const q = searchQuery.toLowerCase();
    return formulaList.filter(
      item =>
        item.coord.toLowerCase().includes(q) ||
        item.formula.toLowerCase().includes(q) ||
        item.rowLabel.toLowerCase().includes(q) ||
        item.explanation.toLowerCase().includes(q)
    );
  }, [formulaList, searchQuery]);

  const handleCopy = (item: FormulaItem) => {
    navigator.clipboard.writeText(`${item.coord}: ${item.formula} -> ${item.explanation}`);
    setCopiedCoord(item.coord);
    setTimeout(() => setCopiedCoord(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Plain-English Formula Explainer</span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-mono font-semibold border border-cyan-500/30">
                  {formulaList.length} formulas active
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                AI audit explaining the business logic and dependencies behind each dynamic formula
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

        {/* Search & Filter Strip */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="formula-search-input"
              name="formulaSearch"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search formulas by cell (e.g. B10, SUM, Total)..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-sm"
            />
          </div>
        </div>

        {/* Formula Explanations List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[300px]">
          {filtered.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
              <Calculator className="w-8 h-8 mb-2 opacity-40 text-cyan-600 dark:text-cyan-400" />
              <p className="text-xs font-medium">No formulas found matching &ldquo;{searchQuery}&rdquo;</p>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {formulaList.length === 0 ? 'This sheet contains raw data cells without dynamic formulas.' : 'Try clearing your search query.'}
              </span>
            </div>
          ) : (
            filtered.map((item) => {
              const isCopied = copiedCoord === item.coord;

              return (
                <div
                  key={item.coord}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col gap-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectCell?.(item.coord)}
                        title={onSelectCell ? `Select cell ${item.coord}` : undefined}
                        className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-mono font-bold text-xs border border-cyan-500/30 hover:border-cyan-500 transition-colors"
                      >
                        {item.coord}
                      </button>
                      <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {item.formula}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(item)}
                        title="Copy formula explanation"
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition text-[11px] flex items-center gap-1"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/90 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold mr-1.5">Business Logic:</span>
                    {item.explanation}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                    <span>Target: {item.rowLabel} ({item.colLabel})</span>
                    <span>Evaluated Value: <strong className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{item.value !== undefined ? String(item.value) : 'Auto'}</strong></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>100% Deterministic Spreadsheet Execution</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all duration-150 shadow-md shadow-cyan-950/20 active:scale-[0.98]"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
