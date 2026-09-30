'use client';

import React, { useState, useMemo } from 'react';
import { SheetData, SheetCell, SheetColumn } from '@/types/sheet';
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
  Calculator,
  Play,
  Lightbulb
} from 'lucide-react';

interface FormulaExplainerModalProps {
  sheet: SheetData;
  sheets?: SheetData[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCell?: (coord: string) => void;
}

interface FormulaItem {
  coord: string;
  sheetName: string;
  formula: string;
  value: number | string | boolean | undefined | null;
  rowLabel: string;
  colLabel: string;
  explanation: string;
  category: 'Aggregation' | 'Financial & Growth' | 'Ratio / %' | 'Arithmetic' | 'Logical';
}

function explainFormulaString(
  formulaStr: string,
  rowLabel: string = 'Metric',
  colLabel: string = 'Column',
  cols?: SheetColumn[]
): { explanation: string; category: FormulaItem['category'] } {
  const f = formulaStr.trim();
  const fUpper = f.toUpperCase();

  const getColName = (colLetter: string): string => {
    const match = cols?.find(c => c.key.toUpperCase() === colLetter.toUpperCase());
    return match?.label ? `"${match.label}" (${colLetter})` : `Column ${colLetter}`;
  };

  // 1. Aggregations (SUM, AVERAGE, MIN, MAX, COUNT)
  if (fUpper.includes('SUM')) {
    const rangeMatch = fUpper.match(/SUM\(([A-Z0-9:]+)\)/i);
    const rangeText = rangeMatch ? ` across ${rangeMatch[1]}` : '';
    return {
      category: 'Aggregation',
      explanation: `Calculates the cumulative sum${rangeText} for ${rowLabel}. Aggregates underlying item rows into a consolidated total.`
    };
  }
  if (fUpper.includes('AVERAGE') || fUpper.includes('AVG')) {
    const rangeMatch = fUpper.match(/AVERAGE\(([A-Z0-9:]+)\)/i);
    const rangeText = rangeMatch ? ` across ${rangeMatch[1]}` : '';
    return {
      category: 'Aggregation',
      explanation: `Computes the arithmetic mean${rangeText} for ${rowLabel}. Normalizes data velocity to identify the benchmark average.`
    };
  }
  if (fUpper.includes('MAX')) {
    return {
      category: 'Aggregation',
      explanation: `Identifies the highest peak value across designated entries for ${rowLabel}.`
    };
  }
  if (fUpper.includes('MIN')) {
    return {
      category: 'Aggregation',
      explanation: `Identifies the lowest minimum threshold across designated entries for ${rowLabel}.`
    };
  }
  if (fUpper.includes('COUNT')) {
    return {
      category: 'Aggregation',
      explanation: `Counts the total number of active recorded entries across target rows for ${rowLabel}.`
    };
  }

  // 2. Financial & Valuation (NPV, IRR)
  if (fUpper.includes('NPV') || fUpper.includes('IRR') || fUpper.includes('XIRR')) {
    return {
      category: 'Financial & Growth',
      explanation: `Executes discounted cash flow / return valuation. Evaluates capital efficiency and yields across designated projection periods.`
    };
  }

  // 3. Conditional / Logical (IF)
  if (fUpper.includes('IF(') || fUpper.startsWith('=IF')) {
    return {
      category: 'Logical',
      explanation: `Evaluates conditional business criteria for ${rowLabel}. Dynamically applies tiered status, grades, or bonus triggers based on threshold checks.`
    };
  }

  // 4. Percentage & Ratio (ROUND, /, %)
  if (fUpper.includes('/') || (fUpper.includes('ROUND') && fUpper.includes('*100'))) {
    const divMatch = f.match(/([A-Z]+)\d+\s*\/\s*([A-Z]+)\d+/i);
    if (divMatch) {
      const colA = getColName(divMatch[1]);
      const colB = getColName(divMatch[2]);
      return {
        category: 'Ratio / %',
        explanation: `Calculates the percentage/efficiency ratio of ${colA} relative to ${colB} for ${rowLabel}.`
      };
    }
    return {
      category: 'Ratio / %',
      explanation: `Calculates the proportional ratio, gross margin percentage, or index value for ${rowLabel} (${colLabel}).`
    };
  }

  // 5. Multiplication (*)
  if (fUpper.includes('*')) {
    if (fUpper.includes('1.') || fUpper.includes('0.') || fUpper.includes('%')) {
      return {
        category: 'Financial & Growth',
        explanation: `Applies compound growth or sensitivity rate multiplier to baseline figures for ${rowLabel}. Simulates scenario expansion or cost variance.`
      };
    }
    const multMatch = f.match(/([A-Z]+)\d+\s*\*\s*([A-Z]+)\d+/i);
    if (multMatch) {
      const colA = getColName(multMatch[1]);
      const colB = getColName(multMatch[2]);
      return {
        category: 'Arithmetic',
        explanation: `Multiplies ${colA} by ${colB} to calculate total product, revenue, or volume for ${rowLabel}.`
      };
    }
    return {
      category: 'Arithmetic',
      explanation: `Multiplies line-item drivers to produce composite total for ${rowLabel} (${colLabel}).`
    };
  }

  // 6. Subtraction (-)
  if (fUpper.includes('-')) {
    const subMatch = f.match(/([A-Z]+)\d+\s*-\s*([A-Z]+)\d+/i);
    if (subMatch) {
      const colA = getColName(subMatch[1]);
      const colB = getColName(subMatch[2]);
      return {
        category: 'Arithmetic',
        explanation: `Calculates the net delta / variance between ${colA} and ${colB} (e.g. Net Margin, Remaining Balance, or Cost Difference) for ${rowLabel}.`
      };
    }
    return {
      category: 'Arithmetic',
      explanation: `Computes the net deduction / difference for ${rowLabel} (${colLabel}).`
    };
  }

  // 7. Addition (+)
  if (fUpper.includes('+')) {
    const addMatch = f.match(/([A-Z]+)\d+\s*\+\s*([A-Z]+)\d+/i);
    if (addMatch) {
      const colA = getColName(addMatch[1]);
      const colB = getColName(addMatch[2]);
      return {
        category: 'Arithmetic',
        explanation: `Combines and sums components of ${colA} and ${colB} together for ${rowLabel}.`
      };
    }
    return {
      category: 'Arithmetic',
      explanation: `Combines additive driver components for ${rowLabel} (${colLabel}).`
    };
  }

  return {
    category: 'Arithmetic',
    explanation: `Computes reactive value for ${rowLabel} (${colLabel}) via deterministic spreadsheet expression ${f}.`
  };
}

const SAMPLE_PRESETS = [
  '=SUM(B2:B10)',
  '=B2 * (1 + 0.15)',
  '=IF(C2 > 100000, "High Margin", "Standard")',
  '=AVERAGE(C2:C12)',
  '=B10 - C10',
];

export default function FormulaExplainerModal({
  sheet,
  sheets,
  isOpen,
  onClose,
  onSelectCell,
}: FormulaExplainerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCoord, setCopiedCoord] = useState<string | null>(null);
  const [selectedSheetFilter, setSelectedSheetFilter] = useState<string>('all');
  const [customFormula, setCustomFormula] = useState('');

  const allSheetsList = useMemo(() => {
    if (sheets && sheets.length > 0) return sheets;
    if (sheet) return [sheet];
    return [];
  }, [sheets, sheet]);

  const formulaList = useMemo<FormulaItem[]>(() => {
    const items: FormulaItem[] = [];

    allSheetsList.forEach(targetSheet => {
      if (!targetSheet?.cellData) return;
      const cellMap = targetSheet.cellData;
      const cols = targetSheet.columns || [];

      Object.entries(cellMap).forEach(([coord, cell]) => {
        if (!cell) return;

        // Check cell.f OR cell.v starting with '='
        let formulaStr: string | null = null;
        if (cell.f && typeof cell.f === 'string' && cell.f.trim()) {
          formulaStr = cell.f.trim();
        } else if (typeof cell.v === 'string' && cell.v.trim().startsWith('=')) {
          formulaStr = cell.v.trim();
        }

        if (!formulaStr) return;

        const colKey = coord.replace(/[0-9]/g, '');
        const rowNum = parseInt(coord.replace(/[^0-9]/g, ''), 10);
        const colObj = cols.find(c => c.key === colKey);
        const colLabel = colObj?.label || colKey;
        const rowLabelCell = cellMap[`A${rowNum}`]?.v;
        const rowLabel = rowLabelCell ? String(rowLabelCell) : `Row ${rowNum}`;

        const { explanation, category } = explainFormulaString(formulaStr, rowLabel, colLabel, cols);

        items.push({
          coord,
          sheetName: targetSheet.name || 'Sheet',
          formula: formulaStr,
          value: cell.v,
          rowLabel,
          colLabel,
          explanation,
          category,
        });
      });
    });

    return items;
  }, [allSheetsList]);

  // Filter formulas by search query and sheet tab
  const filtered = useMemo(() => {
    let result = formulaList;

    if (selectedSheetFilter !== 'all') {
      result = result.filter(item => item.sheetName === selectedSheetFilter);
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      item =>
        item.coord.toLowerCase().includes(q) ||
        item.formula.toLowerCase().includes(q) ||
        item.rowLabel.toLowerCase().includes(q) ||
        item.sheetName.toLowerCase().includes(q) ||
        item.explanation.toLowerCase().includes(q)
    );
  }, [formulaList, searchQuery, selectedSheetFilter]);

  // Live explanation for user custom sandbox input
  const sandboxExplanation = useMemo(() => {
    if (!customFormula.trim()) return null;
    let cleanF = customFormula.trim();
    if (!cleanF.startsWith('=')) cleanF = `=${cleanF}`;
    return explainFormulaString(cleanF, 'Target Metric', 'Active Column', sheet?.columns);
  }, [customFormula, sheet?.columns]);

  const handleCopy = (item: FormulaItem) => {
    navigator.clipboard.writeText(`[${item.sheetName}] ${item.coord}: ${item.formula} -> ${item.explanation}`);
    setCopiedCoord(item.coord);
    setTimeout(() => setCopiedCoord(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-inner shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Plain-English Formula Explainer
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-mono font-semibold border border-cyan-500/30">
                  {formulaList.length} formulas detected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                AI audit explaining the business logic, variables, and math behind each formula
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Formula Sandbox: Type Any Formula */}
        <div className="p-3.5 bg-gradient-to-r from-cyan-950/20 via-slate-900/30 to-slate-950/40 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              <span>Interactive Formula Sandbox (Test Any Formula)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Live Plain-English Translator</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customFormula}
              onChange={(e) => setCustomFormula(e.target.value)}
              placeholder="Type any formula to explain, e.g. =SUM(B2:B9) or =B2*1.15..."
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
            {customFormula && (
              <button
                type="button"
                onClick={() => setCustomFormula('')}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-500" /> Presets:
            </span>
            {SAMPLE_PRESETS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setCustomFormula(sample)}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-800/80 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-700 transition"
              >
                {sample}
              </button>
            ))}
          </div>

          {/* Live Translation of Sandbox Formula */}
          {sandboxExplanation && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-white dark:bg-slate-900/90 border border-cyan-500/40 shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{customFormula.startsWith('=') ? customFormula : `=${customFormula}`}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-semibold">{sandboxExplanation.category}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
                <strong className="text-cyan-600 dark:text-cyan-400 font-semibold mr-1">Explanation:</strong>
                {sandboxExplanation.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Search & Sheet Tab Filters */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="formula-search-input"
              name="formulaSearch"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by cell (B10), sheet, or keyword..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-2xs"
            />
          </div>

          {/* Sheet Selector Tabs */}
          {allSheetsList.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedSheetFilter('all')}
                className={`px-2 py-1 rounded-md font-medium transition ${
                  selectedSheetFilter === 'all'
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All Sheets ({formulaList.length})
              </button>
              {allSheetsList.map(s => {
                const count = formulaList.filter(item => item.sheetName === s.name).length;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSheetFilter(s.name || 'Sheet')}
                    className={`px-2 py-1 rounded-md font-medium transition whitespace-nowrap ${
                      selectedSheetFilter === s.name
                        ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {s.name} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Formula Explanations List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[220px]">
          {filtered.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
              <Calculator className="w-8 h-8 mb-2 opacity-40 text-cyan-600 dark:text-cyan-400" />
              <p className="text-xs font-semibold">
                {searchQuery ? `No formulas match "${searchQuery}"` : 'No formulas in active sheet yet'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm leading-relaxed">
                Use the <strong className="text-cyan-600 dark:text-cyan-400">Interactive Sandbox above</strong> to test any formula, or insert a summary formula via <strong className="font-semibold text-slate-700 dark:text-slate-300">fx Formula ➔ AutoSum</strong> on the sheet ribbon.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isCopied = copiedCoord === item.coord;

              return (
                <div
                  key={`${item.sheetName}_${item.coord}`}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col gap-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
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
                      {allSheetsList.length > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800/50">
                          {item.sheetName}
                        </span>
                      )}
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

                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold mr-1.5">Business Logic:</span>
                    {item.explanation}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-0.5">
                    <span>Target: {item.rowLabel} ({item.colLabel})</span>
                    <span>Evaluated: <strong className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{item.value !== undefined ? String(item.value) : 'Auto'}</strong></span>
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
            <span>100% Deterministic Financial Execution</span>
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
