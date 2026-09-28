'use client';

import React, { useState, useEffect } from 'react';
import { SheetData, SheetCell } from '@/types/sheet';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';
import { FileSpreadsheet, Plus, Download, Edit3, Check, Table } from 'lucide-react';

interface UniverSheetCoreProps {
  sheet: SheetData;
  onCellChange: (updatedSheet: SheetData) => void;
}

export default function UniverSheetCore({ sheet, onCellChange }: UniverSheetCoreProps) {
  const [selectedCoord, setSelectedCoord] = useState<string>('B2');
  const [editingCoord, setEditingCoord] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const activeCell = sheet.cellData[selectedCoord] || {};
  const activeFormulaOrValue = activeCell.f || (activeCell.v !== undefined ? String(activeCell.v) : '');

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

  return (
    <div className="flex flex-col h-full bg-studio-950 border border-studio-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-studio-900 border-b border-studio-800 text-xs">
        <div className="flex items-center gap-1 font-mono font-semibold px-2 py-1 rounded bg-studio-850 border border-studio-750 text-brand-emerald min-w-[50px] justify-center">
          {selectedCoord}
        </div>
        <div className="font-mono text-slate-500 font-semibold px-1 select-none">fx</div>
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleFormulaCommit(editValue);
          }}
          placeholder="Enter formula e.g. =SUM(B2:B9) or cell value"
          className="flex-1 bg-studio-950 border border-studio-800 rounded px-2.5 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-emerald transition"
        />
        <button
          onClick={() => handleFormulaCommit(editValue)}
          title="Commit formula/value"
          className="p-1 rounded bg-brand-emerald/10 hover:bg-brand-emerald/20 text-brand-emerald border border-brand-emerald/30 transition"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid Canvas Table */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse font-sans text-xs select-none">
          <thead>
            <tr className="bg-studio-900 text-slate-400 sticky top-0 z-10 border-b border-studio-800">
              <th className="w-10 py-1.5 px-2 border-r border-studio-800 text-center font-mono font-normal text-slate-500 bg-studio-900">
                #
              </th>
              {sheet.columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width ? `${col.width}px` : '130px' }}
                  className="py-1.5 px-3 border-r border-studio-800 text-left font-semibold text-slate-200 tracking-wide"
                >
                  <div className="flex items-center justify-between">
                    <span>{col.label}</span>
                    <span className="text-[10px] font-mono text-slate-500">{col.key}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: sheet.rowCount }).map((_, rIdx) => {
              const rowNum = rIdx + 1;
              return (
                <tr key={rowNum} className="hover:bg-studio-900/40 border-b border-studio-850/60 transition-colors">
                  <td className="w-10 py-1.5 px-2 border-r border-studio-800 text-center font-mono text-slate-500 bg-studio-900/60 sticky left-0 z-0">
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
                        className={`py-1.5 px-3 border-r border-studio-850/80 cursor-cell relative font-mono transition-all ${
                          isSelected
                            ? 'bg-brand-emerald/10 ring-2 ring-brand-emerald z-10'
                            : isHeaderRow
                            ? 'bg-studio-900/40 font-bold text-slate-100'
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
                            className="w-full bg-studio-950 border border-brand-emerald px-1 py-0.5 text-xs font-mono text-slate-100 focus:outline-none"
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
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald/60 ml-1" title={cell.f} />
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
      <div className="flex items-center justify-between px-3 py-1.5 bg-studio-900 border-t border-studio-800 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-studio-850 border border-studio-700 text-slate-200 font-medium text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 text-brand-emerald" />
            <span>{sheet.name}</span>
          </div>
          <button className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-studio-800 transition">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
          <span>Cells: {Object.keys(sheet.cellData).length}</span>
          <span>Formulas: {Object.values(sheet.cellData).filter(c => c.f).length} active</span>
        </div>
      </div>
    </div>
  );
}
