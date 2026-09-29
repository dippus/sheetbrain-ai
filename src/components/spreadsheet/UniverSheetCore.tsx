'use client';

import React, { useEffect, useRef } from 'react';
import { SheetData, SheetCell } from '@/types/sheet';
import { parseCoord, colToIndex } from '@/lib/engine/formulaEngine';
import { indexToColLetter } from '@/lib/engine/csvHelper';
import { createUniver, defaultTheme, LocaleType } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import '@univerjs/preset-sheets-core/lib/index.css';

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

/**
 * Converts SheetData to Univer IWorkbookData snapshot format.
 * Maps coordinates directly (A1 -> row 0, col 0) without injecting dummy headers into data cells.
 */
function convertSheetDataToUniver(sheet: SheetData) {
  const safeColumns = sheet.columns || [];
  const safeRowCount = Math.max(100, (sheet.rowCount || 20) + 30);
  const safeColCount = Math.max(26, safeColumns.length + 5);

  const univerCellData: Record<number, Record<number, any>> = {};

  // Map user and template cells directly: A1 -> row 0, col 0; B2 -> row 1, col 1
  Object.entries(sheet.cellData || {}).forEach(([coord, cell]) => {
    const p = parseCoord(coord);
    if (!p) return;
    const colIdx = colToIndex(p.col);
    const rowIdx = p.row - 1;

    if (rowIdx < 0 || colIdx < 0) return;

    if (!univerCellData[rowIdx]) {
      univerCellData[rowIdx] = {};
    }

    const isNumeric = typeof cell.v === 'number';
    univerCellData[rowIdx][colIdx] = {
      v: cell.v,
      f: cell.f,
      s: {
        bl: cell.bold ? 1 : undefined,
        ht: cell.align === 'center' ? 2 : cell.align === 'right' || isNumeric ? 3 : 1,
      },
    };
  });

  // Column width configurations
  const columnData: Record<number, any> = {};
  safeColumns.forEach((col, cIdx) => {
    columnData[cIdx] = {
      w: col.width || 130,
    };
  });

  return {
    id: sheet.id || 'workbook-sheetbrain',
    name: sheet.name || 'SheetBrain',
    appVersion: '3.0.0',
    sheetOrder: [sheet.id || 'sheet-1'],
    sheets: {
      [sheet.id || 'sheet-1']: {
        id: sheet.id || 'sheet-1',
        name: sheet.name || 'Sheet1',
        rowCount: safeRowCount,
        columnCount: safeColCount,
        cellData: univerCellData,
        columnData,
      },
    },
  };
}

export default function UniverSheetCore({
  sheet,
  onCellChange,
}: UniverSheetCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<any>(null);
  const isInternalChangeRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sheetRef = useRef<SheetData>(sheet);

  sheetRef.current = sheet;

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    let localUniver: any = null;

    try {
      // Initialize Open-Source Univer Sheets Core Preset with full toolbar, formula bar, and context menu
      const { univer, univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS,
        },
        theme: defaultTheme,
        presets: [
          UniverSheetsCorePreset({
            container: containerRef.current,
            header: true,      // Display ribbon toolbar & formula bar
            toolbar: true,     // Excel ribbon toolbar (Bold, Italic, Color, Borders, Align)
            formulaBar: true,  // Excel fx formula bar
            contextMenu: true, // Native right-click context menu
            footer: { sheetBar: true, statisticBar: true }, // Tabs and live calculation stats
          }),
        ],
      });

      localUniver = univer;
      univerRef.current = { univer, univerAPI };

      // Convert active sheet to Univer workbook data
      const initialWorkbookData = convertSheetDataToUniver(sheetRef.current);
      const fWorkbook = univerAPI.createWorkbook(initialWorkbookData);

      // Listen to Univer edits and sync back to SheetBrain state safely
      fWorkbook.onCommandExecuted((command: any) => {
        if (destroyed || isInternalChangeRef.current) return;

        // Skip non-mutation commands (selections, cursor moves, focus, hover, scroll)
        const cmdId = String(command?.id || '').toLowerCase();
        if (
          cmdId.includes('selection') ||
          cmdId.includes('operation') ||
          cmdId.includes('focus') ||
          cmdId.includes('hover') ||
          cmdId.includes('scroll')
        ) {
          return;
        }

        // Debounce cell change sync to prevent re-render thrashing during drag/typing/right-click
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          if (destroyed) return;

          try {
            const snapshot = fWorkbook.save();
            const activeId = fWorkbook.getActiveSheet()?.getSheetId() || Object.keys(snapshot.sheets || {})[0];
            const activeSheetSnapshot = snapshot.sheets?.[activeId];
            if (!activeSheetSnapshot) return;

            const rawCellData = activeSheetSnapshot.cellData || {};
            const updatedCellData: Record<string, SheetCell> = {};
            let maxRow = sheetRef.current.rowCount || 2;
            let maxCol = (sheetRef.current.columns || []).length || 1;

            Object.entries(rawCellData).forEach(([rStr, rowObj]: [string, any]) => {
              const rIdx = parseInt(rStr, 10);
              const rowNum = rIdx + 1;
              if (rowNum > maxRow) maxRow = rowNum;

              Object.entries(rowObj || {}).forEach(([cStr, cellObj]: [string, any]) => {
                const cIdx = parseInt(cStr, 10);
                if (cIdx + 1 > maxCol) maxCol = cIdx + 1;
                const colLetter = indexToColLetter(cIdx);
                const coord = `${colLetter}${rowNum}`;

                if (cellObj && (cellObj.v !== undefined || cellObj.f)) {
                  updatedCellData[coord] = {
                    v: cellObj.v,
                    f: cellObj.f,
                    bold: !!cellObj.s?.bl,
                  };
                }
              });
            });

            // Compare with existing cellData to avoid unnecessary React re-renders
            const oldKeys = Object.keys(sheetRef.current.cellData || {});
            const newKeys = Object.keys(updatedCellData);
            let hasChanged = oldKeys.length !== newKeys.length;
            if (!hasChanged) {
              for (const k of newKeys) {
                const o = sheetRef.current.cellData[k];
                const n = updatedCellData[k];
                if (!o || o.v !== n.v || o.f !== n.f || o.bold !== n.bold) {
                  hasChanged = true;
                  break;
                }
              }
            }

            if (!hasChanged) return;

            // Sync with SheetBrain without feedback loop
            isInternalChangeRef.current = true;
            onCellChange({
              ...sheetRef.current,
              rowCount: Math.max(sheetRef.current.rowCount, maxRow),
              cellData: updatedCellData,
            });
            setTimeout(() => {
              isInternalChangeRef.current = false;
            }, 100);
          } catch {
            // Guard against transient state reads during teardown
          }
        }, 200);
      });
    } catch (err) {
      console.warn('Univer initialization fallback:', err);
    }

    return () => {
      destroyed = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (localUniver) {
        try {
          localUniver.dispose();
        } catch {
          // Teardown guard
        }
      }
      univerRef.current = null;
    };
  }, [sheet.id]); // Re-initialize only when sheet template changes

  return (
    <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden bg-white dark:bg-[#090d16]">
      <div
        ref={containerRef}
        className="w-full h-full absolute inset-0 overflow-hidden"
      />
    </div>
  );
}
