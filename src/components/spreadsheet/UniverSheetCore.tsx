'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SheetData, SheetCell, SheetColumn, CellFormatType } from '@/types/sheet';
import { recalculateWorkbook, parseCoord } from '@/lib/engine/formulaEngine';
import { indexToColLetter } from '@/lib/engine/csvHelper';
import {
  Plus,
  Bold,
  DollarSign,
  Percent,
  PlusSquare,
  Columns,
  Trash2,
  Sigma,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileSpreadsheet,
  X,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Scissors
} from 'lucide-react';

interface UniverSheetCoreProps {
  sheet: SheetData;
  onCellChange: (updatedSheet: SheetData) => void;
  sheets?: SheetData[];
  activeSheetId?: string;
  onSelectSheet?: (id: string) => void;
  onAddSheet?: () => void;
  onDeleteSheet?: (id: string) => void;
  onRenameSheet?: (id: string, newName: string) => void;
}

interface SelectionRange {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

export default function UniverSheetCore({
  sheet,
  onCellChange,
  sheets = [sheet],
  activeSheetId = sheet.id,
  onSelectSheet,
  onAddSheet,
  onDeleteSheet,
  onRenameSheet,
}: UniverSheetCoreProps) {
  // Safe sheet fallbacks
  const safeCellData = useMemo(() => sheet?.cellData || {}, [sheet?.cellData]);
  const safeColumns = useMemo(() => sheet?.columns || [], [sheet?.columns]);
  const safeRowCount = Math.max(2, sheet?.rowCount || 2);

  // 1. Navigation, Selection & Editing State
  const [selectedCoord, setSelectedCoord] = useState<string>('A2');
  const [selectionRange, setSelectionRange] = useState<SelectionRange>({
    startCol: 0,
    startRow: 2,
    endCol: 0,
    endRow: 2,
  });
  const [editingCoord, setEditingCoord] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [copiedRange, setCopiedRange] = useState<SelectionRange | null>(null);
  const [isCut, setIsCut] = useState<boolean>(false);

  // 2. Tab Management State
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState<string>('');

  // 3. Column Resizing State
  const [resizingColKey, setResizingColKey] = useState<string | null>(null);
  const [resizingStartX, setResizingStartX] = useState<number>(0);
  const [resizingStartWidth, setResizingStartWidth] = useState<number>(130);

  // 4. Right-Click Context Menu & Formula Dropdown
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; coord: string } | null>(null);
  const [showFormulaMenu, setShowFormulaMenu] = useState<boolean>(false);

  // 5. DOM References
  const containerRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const tabsRailRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef<boolean>(false);

  // Current coordinate parsing
  const parsedCoord = parseCoord(selectedCoord);
  const selectedColKey = parsedCoord ? parsedCoord.col : (safeColumns[0]?.key || 'A');
  const selectedRowNum = parsedCoord ? parsedCoord.row : 2;
  const currentColIndex = Math.max(0, safeColumns.findIndex(c => c.key === selectedColKey));
  const activeCell = safeCellData[selectedCoord] || {};

  // Focus Grid Helper (guarantees keyboard events are captured)
  const focusGrid = useCallback(() => {
    requestAnimationFrame(() => {
      containerRef.current?.focus();
    });
  }, []);

  // Sync formula bar and cell value when selection changes
  useEffect(() => {
    if (editingCoord === null) {
      const cell = safeCellData[selectedCoord];
      setEditValue(cell?.f || (cell?.v !== undefined ? String(cell.v) : ''));
    }
  }, [selectedCoord, safeCellData, editingCoord]);

  // Auto-focus and place cursor in cell input upon entering edit mode
  useEffect(() => {
    if (editingCoord && cellInputRef.current) {
      cellInputRef.current.focus();
      if (editValue.length <= 1) {
        cellInputRef.current.setSelectionRange(editValue.length, editValue.length);
      } else {
        cellInputRef.current.select();
      }
    }
  }, [editingCoord]);

  // Global mouse up to end range dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false;
    };
    const handleOutsideClick = () => setContextMenu(null);

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Column Resizing Mouse Listeners
  useEffect(() => {
    if (!resizingColKey) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizingStartX;
      const newWidth = Math.max(60, Math.min(600, resizingStartWidth + delta));
      onCellChange({
        ...sheet,
        columns: (sheet.columns || []).map(c => c.key === resizingColKey ? { ...c, width: newWidth } : c),
      });
    };

    const handleMouseUp = () => {
      setResizingColKey(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColKey, resizingStartX, resizingStartWidth, sheet, onCellChange]);

  // Normalized Range Boundaries (Min/Max Col & Row)
  const normRange = useMemo(() => {
    const minCol = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxCol = Math.max(selectionRange.startCol, selectionRange.endCol);
    const minRow = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxRow = Math.max(selectionRange.startRow, selectionRange.endRow);
    const isMulti = minCol !== maxCol || minRow !== maxRow;
    return { minCol, maxCol, minRow, maxRow, isMulti };
  }, [selectionRange]);

  // Compute live summary statistics for bottom status bar (Range-aware)
  const stats = useMemo(() => {
    let sum = 0;
    let count = 0;
    let numericCount = 0;
    let min = Infinity;
    let max = -Infinity;

    if (normRange.isMulti) {
      for (let c = normRange.minCol; c <= normRange.maxCol; c++) {
        const colDef = safeColumns[c];
        if (!colDef) continue;
        for (let r = normRange.minRow; r <= normRange.maxRow; r++) {
          const coord = `${colDef.key}${r}`;
          const cell = safeCellData[coord];
          if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
            count++;
            const val = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v).replace(/[^0-9.-]/g, ''));
            if (!isNaN(val)) {
              sum += val;
              numericCount++;
              if (val < min) min = val;
              if (val > max) max = val;
            }
          }
        }
      }
    } else {
      for (let r = 2; r <= safeRowCount; r++) {
        const coord = `${selectedColKey}${r}`;
        const cell = safeCellData[coord];
        if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
          count++;
          const val = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v).replace(/[^0-9.-]/g, ''));
          if (!isNaN(val)) {
            sum += val;
            numericCount++;
            if (val < min) min = val;
            if (val > max) max = val;
          }
        }
      }
    }

    const avg = numericCount > 0 ? sum / numericCount : 0;
    return {
      sum,
      avg,
      count,
      min: numericCount > 0 ? min : 0,
      max: numericCount > 0 ? max : 0,
      isRange: normRange.isMulti,
    };
  }, [safeCellData, safeRowCount, safeColumns, selectedColKey, normRange]);

  // Commit Cell Value or Formula
  const handleFormulaCommit = useCallback((newValue: string, moveDir: 'down' | 'right' | 'up' | 'left' | 'none' = 'none') => {
    const targetCoord = editingCoord || selectedCoord;
    if (!targetCoord) return;

    const trimmed = newValue.trim();
    const isFormula = trimmed.startsWith('=');
    const updatedCells: Record<string, SheetCell> = {
      ...safeCellData,
      [targetCoord]: {
        ...(safeCellData[targetCoord] || {}),
        f: isFormula ? trimmed.toUpperCase() : undefined,
        v: isFormula ? undefined : (trimmed === '' ? '' : (isNaN(Number(trimmed)) ? trimmed : Number(trimmed))),
      },
    };

    const recomputed = recalculateWorkbook(updatedCells);
    onCellChange({
      ...sheet,
      cellData: recomputed,
    });

    setEditingCoord(null);

    let nextColIdx = currentColIndex;
    let nextRowNum = selectedRowNum;

    if (moveDir === 'down') {
      nextRowNum = Math.min(sheet.rowCount, selectedRowNum + 1);
    } else if (moveDir === 'right') {
      nextColIdx = Math.min(safeColumns.length - 1, currentColIndex + 1);
    } else if (moveDir === 'up') {
      nextRowNum = Math.max(2, selectedRowNum - 1);
    } else if (moveDir === 'left') {
      nextColIdx = Math.max(0, currentColIndex - 1);
    }

    const nextColKey = safeColumns[nextColIdx]?.key || selectedColKey;
    const nextCoord = `${nextColKey}${nextRowNum}`;
    setSelectedCoord(nextCoord);
    setSelectionRange({
      startCol: nextColIdx,
      startRow: nextRowNum,
      endCol: nextColIdx,
      endRow: nextRowNum,
    });

    focusGrid();
  }, [editingCoord, selectedCoord, safeCellData, onCellChange, sheet, currentColIndex, selectedRowNum, safeColumns, selectedColKey, focusGrid]);

  // Cell Mouse Handlers (with smooth drag selection)
  const handleCellMouseDown = (colIdx: number, rowNum: number, coord: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); // Prevents disruptive browser text selection drag

    if (editingCoord && editingCoord !== coord) {
      handleFormulaCommit(editValue, 'none');
    }

    isMouseDownRef.current = true;
    setSelectedCoord(coord);
    setEditingCoord(null);

    if (e.shiftKey) {
      setSelectionRange(prev => ({
        ...prev,
        endCol: colIdx,
        endRow: rowNum,
      }));
    } else {
      setSelectionRange({
        startCol: colIdx,
        startRow: rowNum,
        endCol: colIdx,
        endRow: rowNum,
      });
    }

    focusGrid();
  };

  const handleCellMouseEnter = (colIdx: number, rowNum: number) => {
    if (!isMouseDownRef.current) return;
    setSelectionRange(prev => ({
      ...prev,
      endCol: colIdx,
      endRow: rowNum,
    }));
  };

  const handleCellDoubleClick = (coord: string) => {
    setSelectedCoord(coord);
    setEditingCoord(coord);
    const cell = safeCellData[coord];
    setEditValue(cell?.f || (cell?.v !== undefined ? String(cell.v) : ''));
  };

  const handleContextMenu = (e: React.MouseEvent, coord: string) => {
    e.preventDefault();
    setSelectedCoord(coord);
    const p = parseCoord(coord);
    if (p) {
      const cIdx = safeColumns.findIndex(c => c.key === p.col);
      if (cIdx >= 0) {
        setSelectionRange({
          startCol: cIdx,
          startRow: p.row,
          endCol: cIdx,
          endRow: p.row,
        });
      }
    }
    setContextMenu({ x: e.clientX, y: e.clientY, coord });
  };

  // Header Click (Select Entire Column or Row)
  const handleSelectEntireColumn = (colIdx: number) => {
    const colKey = safeColumns[colIdx]?.key;
    if (!colKey) return;
    setSelectedCoord(`${colKey}2`);
    setSelectionRange({
      startCol: colIdx,
      startRow: 2,
      endCol: colIdx,
      endRow: safeRowCount,
    });
    focusGrid();
  };

  const handleSelectEntireRow = (rowNum: number) => {
    const firstColKey = safeColumns[0]?.key || 'A';
    setSelectedCoord(`${firstColKey}${rowNum}`);
    setSelectionRange({
      startCol: 0,
      startRow: rowNum,
      endCol: Math.max(0, safeColumns.length - 1),
      endRow: rowNum,
    });
    focusGrid();
  };

  const handleSelectAll = () => {
    const firstColKey = safeColumns[0]?.key || 'A';
    setSelectedCoord(`${firstColKey}2`);
    setSelectionRange({
      startCol: 0,
      startRow: 2,
      endCol: Math.max(0, safeColumns.length - 1),
      endRow: safeRowCount,
    });
    focusGrid();
  };

  // Copy & Cut Implementation (TSV Format)
  const executeCopy = useCallback((cut: boolean = false) => {
    const lines: string[] = [];
    for (let r = normRange.minRow; r <= normRange.maxRow; r++) {
      const rowVals: string[] = [];
      for (let c = normRange.minCol; c <= normRange.maxCol; c++) {
        const colKey = safeColumns[c]?.key;
        if (!colKey) continue;
        const cell = safeCellData[`${colKey}${r}`];
        const val = cell?.f || (cell?.v !== undefined ? String(cell.v) : '');
        rowVals.push(val);
      }
      lines.push(rowVals.join('\t'));
    }
    const tsvData = lines.join('\n');
    navigator.clipboard.writeText(tsvData).catch(() => {});

    setCopiedRange({
      startCol: normRange.minCol,
      startRow: normRange.minRow,
      endCol: normRange.maxCol,
      endRow: normRange.maxRow,
    });
    setIsCut(cut);
  }, [normRange, safeColumns, safeCellData]);

  // Paste Implementation
  const executePaste = useCallback((pastedText: string) => {
    if (!pastedText || !pastedText.trim()) return;

    const lines = pastedText.split(/\r?\n/).filter(line => line.length > 0);
    if (lines.length === 0) return;

    const rows = lines.map(line => {
      if (line.includes('\t')) return line.split('\t');
      return line.split(',');
    });

    const startColIdx = currentColIndex;
    const startRowNum = selectedRowNum;

    const updatedCells: Record<string, SheetCell> = { ...safeCellData };
    let maxColIdx = safeColumns.length - 1;
    let maxRowNum = sheet.rowCount;

    if (isCut && copiedRange) {
      const cMinCol = Math.min(copiedRange.startCol, copiedRange.endCol);
      const cMaxCol = Math.max(copiedRange.startCol, copiedRange.endCol);
      const cMinRow = Math.min(copiedRange.startRow, copiedRange.endRow);
      const cMaxRow = Math.max(copiedRange.startRow, copiedRange.endRow);
      for (let r = cMinRow; r <= cMaxRow; r++) {
        for (let c = cMinCol; c <= cMaxCol; c++) {
          const colKey = safeColumns[c]?.key;
          if (colKey) {
            delete updatedCells[`${colKey}${r}`];
          }
        }
      }
      setCopiedRange(null);
      setIsCut(false);
    }

    rows.forEach((rowVals, rOffset) => {
      const targetRow = startRowNum + rOffset;
      if (targetRow > maxRowNum) maxRowNum = targetRow;

      rowVals.forEach((val, cOffset) => {
        const targetColIdx = startColIdx + cOffset;
        if (targetColIdx > maxColIdx) maxColIdx = targetColIdx;
        const colLetter = indexToColLetter(targetColIdx);
        const coord = `${colLetter}${targetRow}`;
        const cleanVal = val.trim().replace(/^["']|["']$/g, '');

        if (cleanVal.startsWith('=')) {
          updatedCells[coord] = { f: cleanVal.toUpperCase() };
        } else if (!isNaN(Number(cleanVal)) && cleanVal !== '') {
          updatedCells[coord] = { v: Number(cleanVal) };
        } else {
          updatedCells[coord] = { v: cleanVal };
        }
      });
    });

    let updatedColumns = [...safeColumns];
    if (maxColIdx >= safeColumns.length) {
      for (let c = safeColumns.length; c <= maxColIdx; c++) {
        const letter = indexToColLetter(c);
        updatedColumns.push({
          key: letter,
          label: letter,
          type: 'string',
          width: 130,
        });
      }
    }

    const recomputed = recalculateWorkbook(updatedCells);
    onCellChange({
      ...sheet,
      columns: updatedColumns,
      columnCount: updatedColumns.length,
      rowCount: Math.max(sheet.rowCount, maxRowNum),
      cellData: recomputed,
    });

    setSelectionRange({
      startCol: startColIdx,
      startRow: startRowNum,
      endCol: Math.min(startColIdx + (rows[0]?.length || 1) - 1, maxColIdx),
      endRow: Math.min(startRowNum + rows.length - 1, maxRowNum),
    });

    focusGrid();
  }, [currentColIndex, selectedRowNum, safeCellData, safeColumns, sheet, isCut, copiedRange, onCellChange, focusGrid]);

  const handlePasteEvent = (e: React.ClipboardEvent) => {
    if (editingCoord) return;
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      e.preventDefault();
      executePaste(text);
    }
  };

  // Full Spreadsheet Keyboard Engine
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (editingCoord) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleFormulaCommit(editValue, e.shiftKey ? 'up' : 'down');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleFormulaCommit(editValue, e.shiftKey ? 'left' : 'right');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditingCoord(null);
        const cell = safeCellData[selectedCoord];
        setEditValue(cell?.f || (cell?.v !== undefined ? String(cell.v) : ''));
        focusGrid();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      executeCopy(false);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      executeCopy(true);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      handleSelectAll();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handleToggleBold();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = Math.max(2, selectedRowNum - 1);
      if (e.shiftKey) {
        setSelectionRange(prev => ({ ...prev, endRow: prevRow }));
      } else {
        setSelectedCoord(`${selectedColKey}${prevRow}`);
        setSelectionRange({ startCol: currentColIndex, startRow: prevRow, endCol: currentColIndex, endRow: prevRow });
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = Math.min(sheet.rowCount, selectedRowNum + 1);
      if (e.shiftKey) {
        setSelectionRange(prev => ({ ...prev, endRow: nextRow }));
      } else {
        setSelectedCoord(`${selectedColKey}${nextRow}`);
        setSelectionRange({ startCol: currentColIndex, startRow: nextRow, endCol: currentColIndex, endRow: nextRow });
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevColIdx = Math.max(0, currentColIndex - 1);
      const colLetter = safeColumns[prevColIdx]?.key || selectedColKey;
      if (e.shiftKey) {
        setSelectionRange(prev => ({ ...prev, endCol: prevColIdx }));
      } else {
        setSelectedCoord(`${colLetter}${selectedRowNum}`);
        setSelectionRange({ startCol: prevColIdx, startRow: selectedRowNum, endCol: prevColIdx, endRow: selectedRowNum });
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextColIdx = Math.min(safeColumns.length - 1, currentColIndex + 1);
      const colLetter = safeColumns[nextColIdx]?.key || selectedColKey;
      if (e.shiftKey) {
        setSelectionRange(prev => ({ ...prev, endCol: nextColIdx }));
      } else {
        setSelectedCoord(`${colLetter}${selectedRowNum}`);
        setSelectionRange({ startCol: nextColIdx, startRow: selectedRowNum, endCol: nextColIdx, endRow: selectedRowNum });
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        const prevColIdx = Math.max(0, currentColIndex - 1);
        const colLetter = safeColumns[prevColIdx]?.key || selectedColKey;
        setSelectedCoord(`${colLetter}${selectedRowNum}`);
        setSelectionRange({ startCol: prevColIdx, startRow: selectedRowNum, endCol: prevColIdx, endRow: selectedRowNum });
      } else {
        const nextColIdx = Math.min(safeColumns.length - 1, currentColIndex + 1);
        const colLetter = safeColumns[nextColIdx]?.key || selectedColKey;
        setSelectedCoord(`${colLetter}${selectedRowNum}`);
        setSelectionRange({ startCol: nextColIdx, startRow: selectedRowNum, endCol: nextColIdx, endRow: selectedRowNum });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        const prevRow = Math.max(2, selectedRowNum - 1);
        setSelectedCoord(`${selectedColKey}${prevRow}`);
        setSelectionRange({ startCol: currentColIndex, startRow: prevRow, endCol: currentColIndex, endRow: prevRow });
      } else {
        const nextRow = Math.min(sheet.rowCount, selectedRowNum + 1);
        setSelectedCoord(`${selectedColKey}${nextRow}`);
        setSelectionRange({ startCol: currentColIndex, startRow: nextRow, endCol: currentColIndex, endRow: nextRow });
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      const firstColLetter = safeColumns[0]?.key || 'A';
      if (e.ctrlKey || e.metaKey) {
        setSelectedCoord(`${firstColLetter}2`);
        setSelectionRange({ startCol: 0, startRow: 2, endCol: 0, endRow: 2 });
      } else {
        setSelectedCoord(`${firstColLetter}${selectedRowNum}`);
        setSelectionRange({ startCol: 0, startRow: selectedRowNum, endCol: 0, endRow: selectedRowNum });
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const updatedCells = { ...safeCellData };

      for (let r = normRange.minRow; r <= normRange.maxRow; r++) {
        for (let c = normRange.minCol; c <= normRange.maxCol; c++) {
          const colKey = safeColumns[c]?.key;
          if (colKey) {
            delete updatedCells[`${colKey}${r}`];
          }
        }
      }

      const recomputed = recalculateWorkbook(updatedCells);
      onCellChange({ ...sheet, cellData: recomputed });
      setEditValue('');
    } else if (e.key === 'F2') {
      e.preventDefault();
      setEditingCoord(selectedCoord);
      const cell = safeCellData[selectedCoord];
      setEditValue(cell?.f || (cell?.v !== undefined ? String(cell.v) : ''));
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setEditingCoord(selectedCoord);
      setEditValue(e.key);
    }
  };

  // Formatting Actions
  const handleToggleBold = () => {
    const isBold = !activeCell.bold;
    const updatedCells = { ...safeCellData };

    for (let r = normRange.minRow; r <= normRange.maxRow; r++) {
      for (let c = normRange.minCol; c <= normRange.maxCol; c++) {
        const colKey = safeColumns[c]?.key;
        if (!colKey) continue;
        const coord = `${colKey}${r}`;
        updatedCells[coord] = {
          ...(updatedCells[coord] || {}),
          bold: isBold,
        };
      }
    }

    onCellChange({
      ...sheet,
      cellData: updatedCells,
    });
    focusGrid();
  };

  const handleToggleCurrency = () => {
    const col = safeColumns.find(c => c.key === selectedColKey);
    if (!col) return;
    const nextType: CellFormatType = col.type === 'currency' ? 'number' : 'currency';
    onCellChange({
      ...sheet,
      columns: safeColumns.map(c => c.key === selectedColKey ? { ...c, type: nextType } : c),
    });
    focusGrid();
  };

  const handleTogglePercent = () => {
    const col = safeColumns.find(c => c.key === selectedColKey);
    if (!col) return;
    const nextType: CellFormatType = col.type === 'percentage' ? 'number' : 'percentage';
    onCellChange({
      ...sheet,
      columns: safeColumns.map(c => c.key === selectedColKey ? { ...c, type: nextType } : c),
    });
    focusGrid();
  };

  const handleSetAlign = (align: 'left' | 'center' | 'right') => {
    const updatedCells = { ...safeCellData };
    for (let r = normRange.minRow; r <= normRange.maxRow; r++) {
      for (let c = normRange.minCol; c <= normRange.maxCol; c++) {
        const colKey = safeColumns[c]?.key;
        if (!colKey) continue;
        const coord = `${colKey}${r}`;
        updatedCells[coord] = {
          ...(updatedCells[coord] || {}),
          align,
        };
      }
    }
    onCellChange({
      ...sheet,
      cellData: updatedCells,
    });
    focusGrid();
  };

  // Structural Grid Actions
  const handleAddRow = () => {
    onCellChange({
      ...sheet,
      rowCount: sheet.rowCount + 1,
    });
    focusGrid();
  };

  const handleDeleteRow = () => {
    if (sheet.rowCount <= 3 || selectedRowNum < 2) return;
    const updatedCells: Record<string, SheetCell> = {};
    for (const [coord, cell] of Object.entries(safeCellData)) {
      const p = parseCoord(coord);
      if (!p) continue;
      if (p.row < selectedRowNum) {
        updatedCells[coord] = cell;
      } else if (p.row > selectedRowNum) {
        updatedCells[`${p.col}${p.row - 1}`] = cell;
      }
    }
    const recomputed = recalculateWorkbook(updatedCells);
    onCellChange({
      ...sheet,
      rowCount: sheet.rowCount - 1,
      cellData: recomputed,
    });
    if (selectedRowNum >= sheet.rowCount) {
      setSelectedCoord(`${selectedColKey}${sheet.rowCount - 1}`);
    }
    focusGrid();
  };

  const handleAddColumn = () => {
    const nextLetter = indexToColLetter(safeColumns.length);
    const newCol: SheetColumn = {
      key: nextLetter,
      label: `Metric ${nextLetter}`,
      type: 'number',
      width: 130,
    };
    onCellChange({
      ...sheet,
      columnCount: safeColumns.length + 1,
      columns: [...safeColumns, newCol],
    });
    focusGrid();
  };

  const handleDeleteColumn = () => {
    if (safeColumns.length <= 1) return;
    const targetColIdx = currentColIndex;
    const remainingCols = safeColumns.filter((_, idx) => idx !== targetColIdx);

    const reindexedCols: SheetColumn[] = remainingCols.map((col, idx) => ({
      ...col,
      key: indexToColLetter(idx),
    }));

    const updatedCells: Record<string, SheetCell> = {};
    for (let r = 1; r <= sheet.rowCount; r++) {
      reindexedCols.forEach((col, idx) => {
        const oldCol = remainingCols[idx];
        const oldCoord = `${oldCol.key}${r}`;
        const newCoord = `${col.key}${r}`;
        if (safeCellData[oldCoord]) {
          updatedCells[newCoord] = safeCellData[oldCoord];
        }
      });
    }

    const recomputed = recalculateWorkbook(updatedCells);
    onCellChange({
      ...sheet,
      columns: reindexedCols,
      columnCount: reindexedCols.length,
      cellData: recomputed,
    });
    const nextColKey = reindexedCols[Math.min(targetColIdx, reindexedCols.length - 1)].key;
    setSelectedCoord(`${nextColKey}${selectedRowNum}`);
    focusGrid();
  };

  const handleClearGrid = () => {
    onCellChange({
      ...sheet,
      cellData: {},
    });
    setEditValue('');
    focusGrid();
  };

  // Column Resizing Trigger
  const handleStartResize = (e: React.MouseEvent, colKey: string, width: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColKey(colKey);
    setResizingStartX(e.clientX);
    setResizingStartWidth(width);
  };

  // Column Sorting (Ascending / Descending)
  const handleSortColumn = (colKey: string, direction: 'asc' | 'desc') => {
    const rowIndexes: number[] = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      rowIndexes.push(r);
    }

    rowIndexes.sort((a, b) => {
      const cellA = safeCellData[`${colKey}${a}`]?.v;
      const cellB = safeCellData[`${colKey}${b}`]?.v;

      if (cellA === undefined || cellA === '') return 1;
      if (cellB === undefined || cellB === '') return -1;

      const numA = typeof cellA === 'number' ? cellA : parseFloat(String(cellA).replace(/[^0-9.-]/g, ''));
      const numB = typeof cellB === 'number' ? cellB : parseFloat(String(cellB).replace(/[^0-9.-]/g, ''));

      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(cellA).toLowerCase();
      const strB = String(cellB).toLowerCase();
      return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    const updatedCells: Record<string, SheetCell> = {};
    safeColumns.forEach(c => {
      const hCoord = `${c.key}1`;
      if (safeCellData[hCoord]) updatedCells[hCoord] = safeCellData[hCoord];
    });

    rowIndexes.forEach((oldRow, newIdx) => {
      const targetRow = newIdx + 2;
      safeColumns.forEach(c => {
        const oldCoord = `${c.key}${oldRow}`;
        const newCoord = `${c.key}${targetRow}`;
        if (safeCellData[oldCoord]) {
          updatedCells[newCoord] = safeCellData[oldCoord];
        }
      });
    });

    const recomputed = recalculateWorkbook(updatedCells);
    onCellChange({
      ...sheet,
      cellData: recomputed,
    });
    focusGrid();
  };

  // Formula Presets
  const handleInsertFormulaPreset = (fnName: 'SUM' | 'AVERAGE' | 'MIN' | 'MAX' | 'COUNT') => {
    let startCoord = `${selectedColKey}2`;
    let endCoord = `${selectedColKey}${Math.max(2, selectedRowNum - 1)}`;

    if (normRange.isMulti) {
      const sCol = safeColumns[normRange.minCol]?.key || selectedColKey;
      const eCol = safeColumns[normRange.maxCol]?.key || selectedColKey;
      startCoord = `${sCol}${normRange.minRow}`;
      endCoord = `${eCol}${normRange.maxRow}`;
    }

    const formulaStr = `=${fnName}(${startCoord}:${endCoord})`;
    setEditValue(formulaStr);
    handleFormulaCommit(formulaStr, 'none');
    setShowFormulaMenu(false);
  };

  // Tab Rename Handlers
  const handleStartRename = (s: SheetData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(s.id);
    setEditingTabName(s.name);
  };

  const handleCommitRename = (id: string) => {
    if (editingTabName.trim() && onRenameSheet) {
      onRenameSheet(id, editingTabName.trim());
    }
    setEditingTabId(null);
  };

  // Cell Value Formatter
  const formatCellValue = (cell: SheetCell | undefined, col: SheetColumn) => {
    if (!cell || cell.v === undefined || cell.v === null || cell.v === '') return '';
    const val = cell.v;
    if (typeof val === 'number') {
      if (col.type === 'currency') {
        return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      }
      if (col.type === 'percentage') {
        return `${(val * 100).toFixed(1)}%`;
      }
      return val.toLocaleString('en-US');
    }
    return String(val);
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
      onPaste={handlePasteEvent}
      className="flex flex-col h-full min-h-0 bg-white dark:bg-[#090d16] border border-slate-200 dark:border-[#1e293b] outline-none overflow-hidden select-none transition-colors"
    >
      {/* 1. Ribbon Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 px-3 py-1.5 bg-slate-50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-[#1e293b] text-xs text-slate-700 dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-1">
          {/* Quick Format Actions */}
          <button
            onClick={handleToggleBold}
            title="Bold (Ctrl+B)"
            className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] transition ${
              activeCell.bold ? 'bg-slate-200 dark:bg-[#1a2333] text-blue-600 dark:text-blue-400 font-bold' : ''
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleCurrency}
            title="Format as Currency ($)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] transition"
          >
            <DollarSign className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleTogglePercent}
            title="Format as Percentage (%)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] transition"
          >
            <Percent className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-[#223049] mx-1" />

          {/* Alignment */}
          <button
            onClick={() => handleSetAlign('left')}
            title="Align Left"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] transition"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSetAlign('center')}
            title="Align Center"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] transition"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSetAlign('right')}
            title="Align Right"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] transition"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-[#223049] mx-1" />

          {/* Formulas Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFormulaMenu(prev => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] font-medium text-slate-700 dark:text-slate-300 transition"
            >
              <Sigma className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>AutoSum</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showFormulaMenu && (
              <div className="absolute left-0 top-full mt-1 w-36 bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-[#223049] rounded shadow-xl py-1 z-50 text-xs text-slate-800 dark:text-slate-200">
                {(['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT'] as const).map(fn => (
                  <button
                    key={fn}
                    onClick={() => handleInsertFormulaPreset(fn)}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] transition flex items-center justify-between"
                  >
                    <span>{fn}</span>
                    <span className="text-[10px] text-slate-400">fx</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Structural Operations (Row & Column) & Clear Grid */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddRow}
            title="Insert Row at Bottom"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] text-slate-700 dark:text-slate-300 transition"
          >
            <PlusSquare className="w-3.5 h-3.5" />
            <span>+ Row</span>
          </button>
          <button
            onClick={handleAddColumn}
            title="Insert Column at Right"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] text-slate-700 dark:text-slate-300 transition"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>+ Col</span>
          </button>
          <button
            onClick={handleDeleteRow}
            title={`Delete row ${selectedRowNum}`}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>- Row</span>
          </button>
          <button
            onClick={handleDeleteColumn}
            title={`Delete column ${selectedColKey}`}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>- Col</span>
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-[#223049] mx-1" />
          <button
            onClick={handleClearGrid}
            title="Wipe all data from active sheet"
            className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-medium transition text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Grid</span>
          </button>
        </div>
      </div>

      {/* 2. Formula & Address Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#0c121e] border-b border-slate-200 dark:border-[#1e293b] text-xs shrink-0">
        {/* Cell Address Badge */}
        <div className="w-20 h-7 bg-slate-100 dark:bg-[#151e2e] border border-slate-300 dark:border-[#223049] rounded flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-xs shadow-inner">
          {normRange.isMulti
            ? `${safeColumns[normRange.minCol]?.key || 'A'}${normRange.minRow}:${safeColumns[normRange.maxCol]?.key || 'A'}${normRange.maxRow}`
            : selectedCoord}
        </div>

        {/* Formula Symbol Pill */}
        <div className="flex items-center gap-1">
          <span className="w-6 h-6 rounded flex items-center justify-center font-serif italic font-bold text-slate-500 dark:text-slate-400 text-xs">
            fx
          </span>
          {editingCoord && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => handleFormulaCommit(editValue, 'none')}
                title="Commit (Enter)"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] text-blue-600 dark:text-blue-400"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button
                onClick={() => {
                  setEditingCoord(null);
                  const cell = safeCellData[selectedCoord];
                  setEditValue(cell?.f || (cell?.v !== undefined ? String(cell.v) : ''));
                  focusGrid();
                }}
                title="Cancel (Esc)"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#1a2333] text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Formula Input Box */}
        <input
          ref={formulaInputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onFocus={() => setEditingCoord(selectedCoord)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleFormulaCommit(editValue, 'none');
              focusGrid();
            } else if (e.key === 'Escape') {
              setEditingCoord(null);
              const cell = safeCellData[selectedCoord];
              setEditValue(cell?.f || (cell?.v !== undefined ? String(cell.v) : ''));
              focusGrid();
            }
          }}
          placeholder="Enter numeric value or formula (e.g. =SUM(B2:B12), =B2*1.15)..."
          className="flex-1 bg-slate-50 dark:bg-[#131b2a] border border-slate-200 dark:border-[#223049] rounded px-3 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#162031] transition"
        />
      </div>

      {/* 3. Main Data Grid */}
      <div className="flex-1 min-h-0 overflow-auto bg-slate-100 dark:bg-[#060a12]">
        <table className="w-full border-collapse border-spacing-0 text-xs">
          <thead>
            <tr className="sticky top-0 z-20 bg-slate-100 dark:bg-[#0d1422] border-b border-slate-300 dark:border-[#1e293b]">
              {/* Top-left Corner Cell (Select All) */}
              <th
                onClick={handleSelectAll}
                title="Click to select all cells"
                className="w-12 min-w-[48px] max-w-[48px] p-2 border-r border-slate-300 dark:border-[#1e293b] text-center text-[10px] text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-[#101726] cursor-pointer hover:bg-slate-300/80 transition"
              >
                #
              </th>
              {/* Column Headers with Interactive Resize Handles & Sort */}
              {safeColumns.map((col, cIdx) => {
                const isColActive = cIdx >= normRange.minCol && cIdx <= normRange.maxCol;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSelectEntireColumn(cIdx)}
                    style={{ width: col.width || 130, minWidth: col.width || 130 }}
                    className={`p-2 text-left font-semibold border-r border-slate-300 dark:border-[#1e293b] select-none transition-colors relative group cursor-pointer ${
                      isColActive
                        ? 'bg-blue-100 dark:bg-[#1e2d42] text-blue-700 dark:text-blue-300 border-b-2 border-b-blue-600 dark:border-b-blue-500'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#141d2c]'
                    }`}
                  >
                    <div className="flex items-center justify-between pr-2">
                      <div className="flex items-center min-w-0">
                        <span className={`text-[11px] mr-1.5 ${isColActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                          {col.key}
                        </span>
                        <span className="truncate">{col.label}</span>
                      </div>

                      {/* Column Sort Buttons */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSortColumn(col.key, 'asc');
                          }}
                          title="Sort Ascending (A-Z, 0-9)"
                          className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#1e2b40] text-slate-400 hover:text-blue-600"
                        >
                          <ArrowUp className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSortColumn(col.key, 'desc');
                          }}
                          title="Sort Descending (Z-A, 9-0)"
                          className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#1e2b40] text-slate-400 hover:text-blue-600"
                        >
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Column Resize Handle */}
                    <div
                      onMouseDown={(e) => handleStartResize(e, col.key, col.width || 130)}
                      onClick={(e) => e.stopPropagation()}
                      title="Drag to resize column width"
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition z-30"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(0, safeRowCount - 1) }, (_, i) => i + 2).map((rowNum) => {
              const isRowActive = rowNum >= normRange.minRow && rowNum <= normRange.maxRow;
              return (
                <tr
                  key={rowNum}
                  className="border-b border-slate-200 dark:border-[#182335]"
                >
                  {/* Row Number Header */}
                  <td
                    onClick={() => handleSelectEntireRow(rowNum)}
                    title={`Click to select row ${rowNum}`}
                    className={`w-12 min-w-[48px] max-w-[48px] p-2 text-center text-[11px] border-r border-slate-300 dark:border-[#1e293b] select-none sticky left-0 z-10 cursor-pointer transition-colors ${
                      isRowActive
                        ? 'bg-blue-100 dark:bg-[#1e2d42] text-blue-700 dark:text-blue-300 font-bold border-r-2 border-r-blue-600'
                        : 'bg-slate-100/80 dark:bg-[#0c121e] text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {rowNum}
                  </td>

                  {/* Row Data Cells */}
                  {safeColumns.map((col, cIdx) => {
                    const coord = `${col.key}${rowNum}`;
                    const cell = safeCellData[coord];
                    const isSelected = coord === selectedCoord;
                    const isEditing = coord === editingCoord;

                    const inRange =
                      cIdx >= normRange.minCol &&
                      cIdx <= normRange.maxCol &&
                      rowNum >= normRange.minRow &&
                      rowNum <= normRange.maxRow;

                    const isTopEdge = inRange && rowNum === normRange.minRow;
                    const isBottomEdge = inRange && rowNum === normRange.maxRow;
                    const isLeftEdge = inRange && cIdx === normRange.minCol;
                    const isRightEdge = inRange && cIdx === normRange.maxCol;

                    const inCopied =
                      copiedRange &&
                      cIdx >= Math.min(copiedRange.startCol, copiedRange.endCol) &&
                      cIdx <= Math.max(copiedRange.startCol, copiedRange.endCol) &&
                      rowNum >= Math.min(copiedRange.startRow, copiedRange.endRow) &&
                      rowNum <= Math.max(copiedRange.startRow, copiedRange.endRow);

                    const isModified = !!cell?.isModified;
                    const deltaPercent = cell?.deltaPercent;

                    const isNumeric = col.type === 'currency' || col.type === 'number' || col.type === 'percentage';
                    const textAlign = cell?.align || (isNumeric ? 'right' : 'left');

                    const isBottomRightOfRange =
                      normRange.isMulti &&
                      cIdx === normRange.maxCol &&
                      rowNum === normRange.maxRow;

                    // Unmistakable Excel & Sheets selection styling
                    let cellBg = 'bg-white dark:bg-[#090d16]';
                    if (isSelected && !normRange.isMulti) {
                      cellBg = 'bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-600 dark:ring-blue-500 z-20';
                    } else if (inRange) {
                      if (isSelected) {
                        cellBg = 'bg-white dark:bg-[#0c1524] z-10';
                      } else {
                        // Vibrant, high-contrast Excel range blue
                        cellBg = 'bg-[#d8e7ff] dark:bg-[#1a2f4c] z-10';
                      }
                    } else if (inCopied) {
                      cellBg = 'bg-blue-50/30 ring-2 ring-dashed ring-blue-500';
                    } else if (isModified) {
                      cellBg = 'bg-blue-50/40 dark:bg-blue-950/20';
                    }

                    // Continuous 2px solid perimeter outline for multi-cell selection
                    const shadowParts: string[] = [];
                    if (inRange && normRange.isMulti) {
                      if (isTopEdge) shadowParts.push('inset 0 2px 0 0 #2563eb');
                      if (isBottomEdge) shadowParts.push('inset 0 -2px 0 0 #2563eb');
                      if (isLeftEdge) shadowParts.push('inset 2px 0 0 0 #2563eb');
                      if (isRightEdge) shadowParts.push('inset -2px 0 0 0 #2563eb');
                    }
                    const rangeBoxShadow = shadowParts.length > 0 ? shadowParts.join(', ') : undefined;

                    return (
                      <td
                        key={coord}
                        onMouseDown={(e) => handleCellMouseDown(cIdx, rowNum, coord, e)}
                        onMouseEnter={() => handleCellMouseEnter(cIdx, rowNum)}
                        onDoubleClick={() => handleCellDoubleClick(coord)}
                        onContextMenu={(e) => handleContextMenu(e, coord)}
                        style={{
                          width: col.width || 130,
                          minWidth: col.width || 130,
                          boxShadow: rangeBoxShadow,
                        }}
                        className={`p-0 border-r border-slate-200 dark:border-[#162030] relative tabular-nums transition-colors cursor-cell ${cellBg} ${
                          !inRange ? 'hover:bg-slate-50 dark:hover:bg-[#0e1624]' : ''
                        }`}
                      >
                        {isEditing ? (
                          <input
                            ref={cellInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleFormulaCommit(editValue, 'none')}
                            className="w-full h-full px-2 py-1.5 text-xs bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 border-none outline-none focus:ring-0 shadow-inner"
                          />
                        ) : (
                          <div
                            className={`w-full h-full px-2.5 py-1.5 flex items-center justify-between text-xs overflow-hidden ${
                              cell?.bold ? 'font-bold' : 'font-normal'
                            } ${
                              textAlign === 'right' ? 'justify-end' : textAlign === 'center' ? 'justify-center' : 'justify-start'
                            }`}
                          >
                            <span className={`truncate ${
                              isModified
                                ? 'text-blue-700 dark:text-blue-300 font-semibold'
                                : inRange && !isSelected
                                  ? 'text-slate-900 dark:text-slate-100 font-medium'
                                  : 'text-slate-800 dark:text-slate-200'
                            }`}>
                              {formatCellValue(cell, col)}
                            </span>

                            {isModified && deltaPercent && (
                              <span className="ml-1 text-[9px] px-1 py-0.2 rounded font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 shrink-0">
                                {deltaPercent}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Excel-style Active Cell Corner Drag Handle */}
                        {((isSelected && !normRange.isMulti) || isBottomRightOfRange) && !isEditing && (
                          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 border border-white dark:border-black absolute -bottom-1 -right-1 z-30 cursor-crosshair shadow-xs pointer-events-none" />
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

      {/* 4. Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-48 bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-[#223049] rounded-lg shadow-xl py-1 text-xs text-slate-800 dark:text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              executeCopy(false);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </div>
            <span className="text-[10px] text-slate-400">Ctrl+C</span>
          </button>
          <button
            onClick={() => {
              executeCopy(true);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-slate-400" />
              <span>Cut</span>
            </div>
            <span className="text-[10px] text-slate-400">Ctrl+X</span>
          </button>
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                executePaste(text);
              } catch {
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] flex items-center justify-between"
          >
            <span>Paste</span>
            <span className="text-[10px] text-slate-400">Ctrl+V</span>
          </button>
          <div className="border-t border-slate-200 dark:border-[#223049] my-1" />
          <button
            onClick={() => {
              handleAddRow();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538]"
          >
            Insert Row Below
          </button>
          <button
            onClick={() => {
              handleDeleteRow();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] text-red-600 dark:text-red-400"
          >
            Delete Row {selectedRowNum}
          </button>
          <div className="border-t border-slate-200 dark:border-[#223049] my-1" />
          <button
            onClick={() => {
              handleAddColumn();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538]"
          >
            Insert Column Right
          </button>
          <button
            onClick={() => {
              handleDeleteColumn();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] text-red-600 dark:text-red-400"
          >
            Delete Column {selectedColKey}
          </button>
          <div className="border-t border-slate-200 dark:border-[#223049] my-1" />
          <button
            onClick={() => {
              const updatedCells = { ...safeCellData };
              for (let r = normRange.minRow; r <= normRange.maxRow; r++) {
                for (let c = normRange.minCol; c <= normRange.maxCol; c++) {
                  const colKey = safeColumns[c]?.key;
                  if (colKey) delete updatedCells[`${colKey}${r}`];
                }
              }
              onCellChange({ ...sheet, cellData: recalculateWorkbook(updatedCells) });
              setEditValue('');
              setContextMenu(null);
              focusGrid();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] text-slate-500"
          >
            Clear Contents (Del)
          </button>
        </div>
      )}

      {/* 5. Bottom Sheet Tabs Bar & Live Spreadsheet Status Bar */}
      <div className="h-9 bg-slate-100 dark:bg-[#0d1422] border-t border-slate-300 dark:border-[#1e293b] flex items-center justify-between px-3 text-xs shrink-0 select-none">
        {/* Left: Multi-Sheet Tabs + Always-Visible Single + New Sheet Button */}
        <div className="flex items-center gap-2 h-full min-w-0 flex-1 max-w-[68%]">
          {/* Scrollable Tabs Rail with horizontal wheel support */}
          <div
            ref={tabsRailRef}
            onWheel={(e) => {
              if (tabsRailRef.current) {
                tabsRailRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1 overflow-x-auto h-full py-0.5 flex-1 min-w-0 scrollbar-none"
          >
            {sheets.map((s) => {
              const isTabActive = s.id === activeSheetId;
              const isEditing = editingTabId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSheet?.(s.id)}
                  onDoubleClick={(e) => handleStartRename(s, e)}
                  title="Click to view sheet, double-click to rename"
                  className={`group flex items-center gap-1.5 px-3 h-full text-xs font-semibold rounded-t border transition cursor-pointer shrink-0 select-none ${
                    isTabActive
                      ? 'bg-white dark:bg-[#090d16] text-blue-600 dark:text-blue-400 border-slate-300 dark:border-[#1e293b] border-b-transparent shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200/60 dark:hover:bg-[#162031]'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingTabName}
                      onChange={(e) => setEditingTabName(e.target.value)}
                      onBlur={() => handleCommitRename(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommitRename(s.id);
                        if (e.key === 'Escape') setEditingTabId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-24 bg-white dark:bg-[#121c2d] border border-blue-500 rounded px-1 text-xs text-slate-900 dark:text-slate-100 outline-none"
                    />
                  ) : (
                    <span>{s.name}</span>
                  )}

                  {/* Delete / Clear Sheet Button */}
                  {onDeleteSheet && !isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSheet(s.id);
                      }}
                      title={sheets.length > 1 ? `Delete ${s.name}` : `Clear ${s.name} to Blank`}
                      className="ml-1 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-950/60 text-slate-400 hover:text-red-500 opacity-60 group-hover:opacity-100 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clean Single "+ New Sheet" Button (No duplicate pluses!) */}
          {onAddSheet && (
            <button
              onClick={onAddSheet}
              title="Add New Blank Sheet (Unlimited sheets allowed)"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-200/80 hover:bg-slate-300 dark:bg-[#162031] dark:hover:bg-[#1e293b] text-blue-600 dark:text-blue-400 font-medium transition text-xs shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">New Sheet</span>
            </button>
          )}
        </div>

        {/* Right: Live Calculation & Financial Summary Stats */}
        <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Ready</span>
          </div>

          <div className="hidden md:flex items-center gap-3 border-l border-slate-300 dark:border-[#223049] pl-3">
            <span>COUNT: <strong className="text-slate-800 dark:text-slate-200">{stats.count}</strong></span>
            <span>SUM: <strong className="text-slate-800 dark:text-slate-200">{stats.sum.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></span>
            <span>AVG: <strong className="text-slate-800 dark:text-slate-200">{stats.avg.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></span>
            <span>MAX: <strong className="text-slate-800 dark:text-slate-200">{stats.max.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></span>
          </div>

          <div className="border-l border-slate-300 dark:border-[#223049] pl-3">
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
