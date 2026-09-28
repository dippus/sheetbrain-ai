'use client';

import React, { useState } from 'react';
import { SheetData, SheetCell, SheetColumn, CellFormatType } from '@/types/sheet';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';
import { indexToColLetter } from '@/lib/engine/csvHelper';
import {
  FileSpreadsheet,
  Plus,
  Check,
  Bold,
  DollarSign,
  Percent,
  PlusSquare,
  Columns,
  Trash2,
  Sigma,
  Calculator
} from 'lucide-react';

interface UniverSheetCoreProps {
  sheet: SheetData;
  onCellChange: (updatedSheet: SheetData) => void;
}

export default function UniverSheetCore({ sheet, onCellChange }: UniverSheetCoreProps) {
  const [selectedCoord, setSelectedCoord] = useState<string>('B2');
  const [editingCoord, setEditingCoord] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const activeCell = sheet.cellData[selectedCoord] || {};

  // Extract selected col letter and row number
  const match = selectedCoord.match(/^([A-Z]+)(\d+)$/);
  const selectedColKey = match ? match[1] : 'B';
  const selectedRowNum = match ? parseInt(match[2], 10) : 2;

  const handleCellClick = (coord: string) => {
    setSelectedCoord(coord);
    const cell = sheet.cellData[coord];
    setEditValue(cell?.f || (cell?.v !== undefined ? String(cell.v) : ''));
  };

  const handleCellDoubleClick = (coord: string) => {
    setEditingCoord(coord);
    const cell = sheet.cellData[coord];
    setEditValue(cell?.f || (cell?.v !== undefined ? String(cell.v) : ''));
  };

  const handleFormulaCommit = (newValue: string) => {
    if (!selectedCoord) return;
    const isFormula = newValue.startsWith('=');
    const updatedCells: Record<string, SheetCell> = {
      ...sheet.cellData,
      [selectedCoord]: {
        ...sheet.cellData[selectedCoord],
        f: isFormula ? newValue.toUpperCase() : undefined,
        v: isFormula ? undefined : (isNaN(Number(newValue)) ? newValue : Number(newValue)),
      },
    };

    const recomputed = recalculateWorkbook(updatedCells);
    onCellChange({
      ...sheet,
      cellData: recomputed,
    });
    setEditingCoord(null);
  };

  // Toggle Bold on Selected Cell
  const handleToggleBold = () => {
    if (!selectedCoord) return;
    const cell = sheet.cellData[selectedCoord] || {};
    const updatedCells = {
      ...sheet.cellData,
      [selectedCoord]: {
        ...cell,
        bold: !cell.bold,
      },
    };
    onCellChange({
      ...sheet,
      cellData: updatedCells,
    });
  };

  // Toggle Currency Format on Current Column
  const handleToggleCurrency = () => {
    const updatedColumns: SheetColumn[] = sheet.columns.map(col => {
      if (col.key === selectedColKey) {
        const nextType: CellFormatType = col.type === 'currency' ? 'number' : 'currency';
        return {
          ...col,
          type: nextType,
        };
      }
      return col;
    });

    onCellChange({
      ...sheet,
      columns: updatedColumns,
    });
  };

  // Toggle Percentage Format on Current Column
  const handleTogglePercent = () => {
    const updatedColumns: SheetColumn[] = sheet.columns.map(col => {
      if (col.key === selectedColKey) {
        const nextType: CellFormatType = col.type === 'percentage' ? 'number' : 'percentage';
        return {
          ...col,
          type: nextType,
        };
      }
      return col;
    });

    onCellChange({
      ...sheet,
      columns: updatedColumns,
    });
  };

  // Insert Quick Formula: =SUM(...)
  const handleInsertSum = () => {
    const formula = `=SUM(${selectedColKey}2:${selectedColKey}${sheet.rowCount})`;
    setEditValue(formula);
    handleFormulaCommit(formula);
  };

  // Insert Quick Formula: =AVERAGE(...)
  const handleInsertAvg = () => {
    const formula = `=AVERAGE(${selectedColKey}2:${selectedColKey}${sheet.rowCount})`;
    setEditValue(formula);
    handleFormulaCommit(formula);
  };

  // Append a New Row at the Bottom
  const handleAddRow = () => {
    const newRowCount = sheet.rowCount + 1;
    const updatedCells = { ...sheet.cellData };

    sheet.columns.forEach((col, idx) => {
      const coord = `${col.key}${newRowCount}`;
      if (idx === 0) {
        updatedCells[coord] = { v: `Item ${newRowCount - 1}` };
      } else {
        updatedCells[coord] = { v: 0 };
      }
    });

    const recomputed = recalculateWorkbook(updatedCells);
    onCellChange({
      ...sheet,
      rowCount: newRowCount,
      cellData: recomputed,
    });
    setSelectedCoord(`A${newRowCount}`);
  };

  // Delete Selected Row (row > 1)
  const handleDeleteRow = () => {
    if (selectedRowNum <= 1 || sheet.rowCount <= 2) return;

    const updatedCells: Record<string, SheetCell> = {};

    for (let r = 1; r <= sheet.rowCount; r++) {
      if (r === selectedRowNum) continue;
      const targetRow = r > selectedRowNum ? r - 1 : r;
      sheet.columns.forEach(col => {
        const oldCoord = `${col.key}${r}`;
        const newCoord = `${col.key}${targetRow}`;
        if (sheet.cellData[oldCoord]) {
          updatedCells[newCoord] = sheet.cellData[oldCoord];
        }
      });
    }

    const recomputed = recalculateWorkbook(updatedCells);
    onCellChange({
      ...sheet,
      rowCount: sheet.rowCount - 1,
      cellData: recomputed,
    });

    setSelectedCoord(`${selectedColKey}${Math.min(selectedRowNum, sheet.rowCount - 1)}`);
  };

  // Append a New Column to the Right
  const handleAddColumn = () => {
    const newColIndex = sheet.columns.length;
    const newColKey = indexToColLetter(newColIndex);
    const newCol: SheetColumn = {
      key: newColKey,
      label: `Col ${newColKey}`,
      type: 'number',
      width: 120,
    };

    const updatedCells = {
      ...sheet.cellData,
      [`${newColKey}1`]: { v: `Col ${newColKey}`, bold: true },
    };

    for (let r = 2; r <= sheet.rowCount; r++) {
      updatedCells[`${newColKey}${r}`] = { v: 0 };
    }

    const recomputed = recalculateWorkbook(updatedCells);
    onCellChange({
      ...sheet,
      columnCount: sheet.columnCount + 1,
      columns: [...sheet.columns, newCol],
      cellData: recomputed,
    });
    setSelectedCoord(`${newColKey}2`);
  };

  // Delete Selected Column (if more than 1 col)
  const handleDeleteColumn = () => {
    if (sheet.columns.length <= 1) return;

    const remainingCols = sheet.columns.filter(c => c.key !== selectedColKey);
    const updatedCells = { ...sheet.cellData };

    for (let r = 1; r <= sheet.rowCount; r++) {
      delete updatedCells[`${selectedColKey}${r}`];
    }

    const recomputed = recalculateWorkbook(updatedCells);
    onCellChange({
      ...sheet,
      columnCount: remainingCols.length,
      columns: remainingCols,
      cellData: recomputed,
    });

    const fallbackCol = remainingCols[0]?.key || 'A';
    setSelectedCoord(`${fallbackCol}${selectedRowNum}`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Interactive Toolbar & Formula Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        {/* Left: Cell & Formula input */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="flex items-center gap-1 font-mono font-semibold px-2 py-1 rounded bg-slate-850 border border-slate-750 text-emerald-400 min-w-[48px] justify-center">
            {selectedCoord}
          </div>
          <div className="font-mono text-slate-500 font-semibold px-0.5 select-none text-[11px]">fx</div>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFormulaCommit(editValue);
            }}
            placeholder="Enter value or formula e.g. =SUM(B2:B9)"
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 transition"
          />
          <button
            onClick={() => handleFormulaCommit(editValue)}
            title="Commit formula/value (Enter)"
            className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Formatting & Row/Column Manipulation Controls */}
        <div className="flex items-center gap-1">
          {/* Quick Math Formulas */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-800">
            <button
              onClick={handleInsertSum}
              title="Insert =SUM() for current column"
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[11px] font-mono font-medium text-slate-300 border border-slate-700 transition"
            >
              <Sigma className="w-3 h-3 text-emerald-400" />
              <span>SUM</span>
            </button>
            <button
              onClick={handleInsertAvg}
              title="Insert =AVERAGE() for current column"
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[11px] font-mono font-medium text-slate-300 border border-slate-700 transition"
            >
              <Calculator className="w-3 h-3 text-sky-400" />
              <span>AVG</span>
            </button>
          </div>

          {/* Format Modifiers */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-800">
            <button
              onClick={handleToggleBold}
              title="Toggle Bold"
              className={`p-1.5 rounded transition ${
                activeCell.bold
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleCurrency}
              title="Toggle Currency ($) on current column"
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </button>
            <button
              onClick={handleTogglePercent}
              title="Toggle Percentage (%) on current column"
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <Percent className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>

          {/* Row & Column Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddRow}
              title="Add row at bottom"
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[11px] font-medium text-slate-200 border border-slate-700 transition"
            >
              <PlusSquare className="w-3 h-3 text-emerald-400" />
              <span>+ Row</span>
            </button>
            <button
              onClick={handleAddColumn}
              title="Add column to right"
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[11px] font-medium text-slate-200 border border-slate-700 transition"
            >
              <Columns className="w-3 h-3 text-sky-400" />
              <span>+ Col</span>
            </button>
            {selectedRowNum > 1 && (
              <button
                onClick={handleDeleteRow}
                title={`Delete row ${selectedRowNum}`}
                className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Canvas Table */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse font-sans text-xs select-none">
          <thead>
            <tr className="bg-slate-900 text-slate-400 sticky top-0 z-10 border-b border-slate-800">
              <th className="w-10 py-1.5 px-2 border-r border-slate-800 text-center font-mono font-normal text-slate-500 bg-slate-900">
                #
              </th>
              {sheet.columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width ? `${col.width}px` : '130px' }}
                  className={`py-1.5 px-3 border-r border-slate-800 text-left font-medium tracking-wide ${
                    selectedColKey === col.key ? 'bg-slate-850 text-emerald-300' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{col.label}</span>
                    <span className="text-[10px] font-mono text-slate-500 ml-1">{col.key}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: sheet.rowCount }).map((_, rIdx) => {
              const rowNum = rIdx + 1;
              const isSelectedRow = selectedRowNum === rowNum;
              return (
                <tr
                  key={rowNum}
                  className={`border-b border-slate-850/60 transition-colors ${
                    isSelectedRow ? 'bg-slate-900/60' : 'hover:bg-slate-900/30'
                  }`}
                >
                  <td className="w-10 py-1.5 px-2 border-r border-slate-800 text-center font-mono text-slate-500 bg-slate-900/70 sticky left-0 z-0">
                    {rowNum}
                  </td>
                  {sheet.columns.map((col) => {
                    const coord = `${col.key}${rowNum}`;
                    const cell = sheet.cellData[coord];
                    const isSelected = selectedCoord === coord;
                    const isEditing = editingCoord === coord;
                    const isFormula = !!cell?.f;
                    const isHeaderRow = rowNum === 1;

                    // Display Value formatting
                    let displayVal = cell?.v !== undefined ? String(cell.v) : '';
                    if (typeof cell?.v === 'number') {
                      if (col.type === 'currency') {
                        displayVal = '$' + cell.v.toLocaleString('en-US');
                      } else if (col.type === 'percentage') {
                        displayVal = (cell.v * 100).toFixed(1) + '%';
                      } else {
                        displayVal = cell.v.toLocaleString('en-US');
                      }
                    }

                    return (
                      <td
                        key={coord}
                        onClick={() => handleCellClick(coord)}
                        onDoubleClick={() => handleCellDoubleClick(coord)}
                        className={`py-1.5 px-3 border-r border-slate-850/80 cursor-cell relative font-mono transition-all ${
                          isSelected
                            ? 'bg-emerald-500/10 ring-2 ring-emerald-500 z-10'
                            : isHeaderRow
                            ? 'bg-slate-900/40 font-semibold text-slate-100'
                            : 'text-slate-200'
                        } ${cell?.isModified ? 'bg-amber-950/40 text-amber-200' : ''}`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleFormulaCommit(editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleFormulaCommit(editValue);
                              if (e.key === 'Escape') setEditingCoord(null);
                            }}
                            className="w-full bg-slate-950 border border-emerald-500 px-1 py-0.5 text-xs font-mono text-slate-100 focus:outline-none"
                          />
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className={`truncate ${cell?.bold ? 'font-bold text-slate-100' : ''}`}>
                              {displayVal}
                            </span>
                            {cell?.deltaPercent && (
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-950 px-1 rounded ml-1">
                                {cell.deltaPercent}
                              </span>
                            )}
                            {isFormula && !cell?.deltaPercent && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 ml-1" title={cell.f} />
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tabs & Status Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-850 border border-slate-700 text-slate-200 font-medium text-xs">
            <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
            <span>{sheet.name}</span>
          </div>
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <Plus className="w-3 h-3" />
            <span>Append Row</span>
          </button>
        </div>
        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
          <span>Rows: {sheet.rowCount}</span>
          <span>Cols: {sheet.columns.length}</span>
          <span>Formulas: {Object.values(sheet.cellData).filter(c => c.f).length} active</span>
        </div>
      </div>
    </div>
  );
}
