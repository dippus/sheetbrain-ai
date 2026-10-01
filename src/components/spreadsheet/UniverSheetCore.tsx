'use client';

import React, { useEffect, useRef } from 'react';
import { SheetData, SheetCell } from '@/types/sheet';
import { parseCoord, colToIndex } from '@/lib/engine/formulaEngine';
import { indexToColLetter } from '@/lib/engine/csvHelper';
import { createUniver, defaultTheme, darkBlueTheme, LocaleType } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import '@univerjs/design/lib/index.css';
import '@univerjs/ui/lib/index.css';
import '@univerjs/sheets-ui/lib/index.css';
import '@univerjs/sheets-formula-ui/lib/index.css';
import '@univerjs/sheets-numfmt-ui/lib/index.css';
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
  theme?: 'dark' | 'light' | 'system';
}

interface UniverCellRaw {
  v?: string | number | boolean;
  f?: string;
  s?: {
    bl?: number;
    ht?: number;
    bg?: { rgb: string };
    cl?: { rgb: string };
  };
}

interface UniverSnapshotSheet {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  cellData: Record<number, Record<number, UniverCellRaw>>;
  columnData: Record<number, { w: number }>;
}

type UniverAPI = ReturnType<typeof createUniver>['univerAPI'];
type FWorkbook = ReturnType<UniverAPI['createWorkbook']>;
type WorkbookCreateParam = Parameters<UniverAPI['createWorkbook']>[0];

/**
 * Converts SheetData to Univer IWorkbookData snapshot format.
 * Maps coordinates directly (A1 -> row 0, col 0) without injecting dummy headers into data cells.
 * Supports multi-sheet workbook datasets.
 */
function convertSheetDataToUniver(activeSheet: SheetData, allSheets?: SheetData[], isDark: boolean = true) {
  const targetSheets = allSheets && allSheets.length > 0 ? allSheets : [activeSheet];
  const sheetOrder: string[] = [];
  const sheetsSnapshot: Record<string, UniverSnapshotSheet> = {};

  targetSheets.forEach((s, idx) => {
    const sId = s.id || `sheet_${idx + 1}`;
    sheetOrder.push(sId);

    const safeColumns = s.columns || [];
    const safeRowCount = Math.max(100, (s.rowCount || 20) + 30);
    const safeColCount = Math.max(26, safeColumns.length + 5);

    const univerCellData: Record<number, Record<number, UniverCellRaw>> = {};

    // Map user and template cells directly: A1 -> row 0, col 0; B2 -> row 1, col 1
    Object.entries(s.cellData || {}).forEach(([coord, cell]) => {
      const p = parseCoord(coord);
      if (!p) return;
      const colIdx = colToIndex(p.col);
      const rowIdx = p.row - 1;

      if (rowIdx < 0 || colIdx < 0) return;

      if (!univerCellData[rowIdx]) {
        univerCellData[rowIdx] = {};
      }

      const isNumeric = typeof cell.v === 'number';
      const isModified = !!cell.isModified;
      const isHeaderRow = rowIdx === 0;
      const isSummaryRow = !isHeaderRow && !!cell.bold;

      let fontColor: string;
      if (isModified) {
        fontColor = isDark ? '#60a5fa' : '#1d4ed8';
      } else if (cell.fontColor) {
        fontColor = cell.fontColor;
      } else if (isHeaderRow) {
        fontColor = isDark ? '#38bdf8' : '#0284c7';
      } else if (isSummaryRow) {
        fontColor = isDark ? '#34d399' : '#059669';
      } else {
        fontColor = isDark ? '#f8fafc' : '#0f172a';
      }

      let bgColor: string | undefined;
      if (isModified) {
        bgColor = isDark ? '#172554' : '#dbeafe';
      } else if (cell.bg) {
        bgColor = cell.bg;
      } else if (isHeaderRow) {
        bgColor = isDark ? '#0f172a' : '#f1f5f9';
      } else {
        bgColor = undefined;
      }

      univerCellData[rowIdx][colIdx] = {
        v: cell.v,
        f: cell.f,
        s: {
          bl: isHeaderRow || isSummaryRow || cell.bold || isModified ? 1 : undefined,
          ht: cell.align === 'center' ? 2 : cell.align === 'right' || isNumeric ? 3 : 1,
          bg: bgColor ? { rgb: bgColor } : undefined,
          cl: { rgb: fontColor },
        },
      };
    });

    // Ensure header row from safeColumns is populated and brightly styled if row 0 was empty
    safeColumns.forEach((col, cIdx) => {
      if (!univerCellData[0]) {
        univerCellData[0] = {};
      }
      if (!univerCellData[0][cIdx] || univerCellData[0][cIdx].v === undefined) {
        univerCellData[0][cIdx] = {
          v: col.label,
          s: {
            bl: 1,
            ht: col.type === 'string' ? 1 : 3,
            bg: isDark ? { rgb: '#0f172a' } : { rgb: '#f1f5f9' },
            cl: { rgb: isDark ? '#38bdf8' : '#0284c7' },
          },
        };
      }
    });

    // Column width configurations
    const columnData: Record<number, { w: number }> = {};
    safeColumns.forEach((col, cIdx) => {
      columnData[cIdx] = {
        w: col.width || 130,
      };
    });

    sheetsSnapshot[sId] = {
      id: sId,
      name: s.name || `Sheet${idx + 1}`,
      rowCount: safeRowCount,
      columnCount: safeColCount,
      cellData: univerCellData,
      columnData,
    };
  });

  return {
    id: activeSheet.id || 'workbook-sheetbrain',
    name: activeSheet.name || 'SheetBrain',
    appVersion: '3.0.0',
    sheetOrder,
    sheets: sheetsSnapshot,
  } as unknown as WorkbookCreateParam;
}

export default function UniverSheetCore({
  sheet,
  sheets,
  activeSheetId,
  onSelectSheet,
  onCellChange,
  theme = 'dark',
}: UniverSheetCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<{ univer: { dispose: () => void }; univerAPI: UniverAPI } | null>(null);
  const isInternalChangeRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sheetRef = useRef<SheetData>(sheet);
  // Track the sheet ID at mount time so the unmount cleanup knows if the workbook changed
  const mountedSheetIdRef = useRef<string>(sheet.id);

  sheetRef.current = sheet;

  // Extract cell values from active sheet in Univer and sync to React state
  const extractAndSyncSheet = (fWorkbook: FWorkbook | null) => {
    try {
      if (!fWorkbook) return;
      const snapshot = fWorkbook.save();
      const currentActiveId = fWorkbook.getActiveSheet()?.getSheetId() || Object.keys(snapshot.sheets || {})[0];
      const targetId = sheetRef.current.id || currentActiveId;
      const sheetSnapshot = snapshot.sheets?.[currentActiveId] || snapshot.sheets?.[targetId];
      if (!sheetSnapshot) return;

      const rawCellData = (sheetSnapshot.cellData || {}) as Record<string, Record<string, UniverCellRaw>>;
      const updatedCellData: Record<string, SheetCell> = {};
      let maxRow = sheetRef.current.rowCount || 2;
      let maxCol = (sheetRef.current.columns || []).length || 1;

      Object.entries(rawCellData).forEach(([rStr, rowObj]: [string, Record<string, UniverCellRaw>]) => {
        const rIdx = parseInt(rStr, 10);
        const rowNum = rIdx + 1;
        if (rowNum > maxRow) maxRow = rowNum;

        Object.entries(rowObj || {}).forEach(([cStr, cellObj]: [string, UniverCellRaw]) => {
          const cIdx = parseInt(cStr, 10);
          if (cIdx + 1 > maxCol) maxCol = cIdx + 1;
          const colLetter = indexToColLetter(cIdx);
          const coord = `${colLetter}${rowNum}`;

          if (cellObj && (cellObj.v !== undefined || cellObj.f)) {
            const existingCell = sheetRef.current.cellData?.[coord];
            let cellFormula = cellObj.f;
            if (!cellFormula && typeof cellObj.v === 'string' && cellObj.v.startsWith('=')) {
              cellFormula = cellObj.v;
            }
            if (!cellFormula && existingCell?.f) {
              cellFormula = existingCell.f;
            }

            updatedCellData[coord] = {
              v: cellObj.v,
              f: cellFormula,
              bold: !!cellObj.s?.bl,
            };
          }
        });
      });

      // Compare with existing cellData to avoid unnecessary state thrashing
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

      // Sync safely back to SheetBrain state
      isInternalChangeRef.current = true;
      onCellChange({
        ...sheetRef.current,
        id: targetId,
        rowCount: Math.max(sheetRef.current.rowCount, maxRow),
        cellData: updatedCellData,
      });
      setTimeout(() => {
        isInternalChangeRef.current = false;
      }, 100);
    } catch (e) {
      // Guard against transient state reads during teardown
    }
  };

  // Switch active sheet in Univer when activeSheetId changes without tearing down the canvas
  useEffect(() => {
    if (!univerRef.current?.univerAPI || !activeSheetId) return;
    try {
      const fWorkbook = univerRef.current.univerAPI.getActiveWorkbook();
      if (!fWorkbook) return;

      // Flush pending save for current sheet before switching
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        extractAndSyncSheet(fWorkbook);
      }

      const targetSheet = fWorkbook.getSheetBySheetId(activeSheetId);
      if (targetSheet) {
        const currentActive = fWorkbook.getActiveSheet();
        if (currentActive?.getSheetId() !== activeSheetId) {
          fWorkbook.setActiveSheet(targetSheet);
        }
      }
    } catch (err) {
      console.warn('Switch active sheet in Univer:', err);
    }
  }, [activeSheetId]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    // Snapshot the sheet ID at the moment this Univer instance mounts
    mountedSheetIdRef.current = sheetRef.current.id;

    let destroyed = false;
    let localUniver: { dispose: () => void } | null = null;
    let localWorkbook: FWorkbook | null = null;

    // Create an isolated sub-container for Univer instance to prevent DOM collisions
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'absolute';
    container.style.inset = '0';
    container.style.overflow = 'hidden';
    host.append(container);

    try {
      const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

      // Initialize Open-Source Univer Sheets Core Preset with official clean locales
      const { univer, univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS,
        },
        theme: isDark ? darkBlueTheme : defaultTheme,
        presets: [
          UniverSheetsCorePreset({
            container,
            header: true,      // Display ribbon toolbar & formula bar
            toolbar: true,     // Excel ribbon toolbar (Bold, Italic, Color, Borders, Align)
            formulaBar: true,  // Excel fx formula bar
            contextMenu: true, // Native right-click context menu
            footer: { sheetBar: false, statisticBar: true }, // SheetBrain provides native safe bottom tab bar
          }),
        ],
      });

      localUniver = univer;
      univerRef.current = { univer, univerAPI };

      // Convert active sheet to Univer workbook data with multi-sheet support
      const initialWorkbookData = convertSheetDataToUniver(sheetRef.current, sheets, isDark);
      const fWorkbook = univerAPI.createWorkbook(initialWorkbookData);
      localWorkbook = fWorkbook;

      // Ensure active sheet is selected in Univer
      if (activeSheetId) {
        try {
          const targetSheet = fWorkbook.getSheetBySheetId(activeSheetId);
          if (targetSheet) {
            fWorkbook.setActiveSheet(targetSheet);
          }
        } catch {}
      }

      // Flush data before browser window reload/close
      const handleBeforeUnload = () => {
        if (fWorkbook) {
          extractAndSyncSheet(fWorkbook);
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Listen to Univer edits and sync back to SheetBrain state safely
      fWorkbook.onCommandExecuted((command: { id?: string }) => {
        if (destroyed || isInternalChangeRef.current) return;

        // Skip ONLY pure UI/navigation commands that never mutate cell data
        // IMPORTANT: Do NOT filter 'operation' - that blocks undo/redo!
        const cmdId = String(command?.id || '').toLowerCase();
        const isNonMutation =
          (cmdId.includes('selection') && !cmdId.includes('set')) ||
          cmdId.includes('focus') ||
          cmdId.includes('hover') ||
          cmdId.includes('scroll') ||
          cmdId === 'sheet.command.set-zoom-ratio';

        if (isNonMutation) return;

        // Snappy sync (100ms) for cell edits / confirm / move-range / auto-fill / undo / redo to synchronize without lag
        const isCellMutation =
          cmdId.includes('undo') ||
          cmdId.includes('redo') ||
          cmdId.includes('set-range-values') ||
          cmdId.includes('set-cell-value') ||
          cmdId.includes('move-range') ||
          cmdId.includes('auto-fill');
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          if (destroyed) return;
          extractAndSyncSheet(fWorkbook);
        }, isCellMutation ? 100 : 250);
      });
    } catch (err) {
      console.warn('Univer initialization fallback:', err);
    }

    return () => {
      destroyed = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        // Flush pending edit before unmounting so tab switching never drops active user edits
        if (localWorkbook) {
          extractAndSyncSheet(localWorkbook);
        }
      }
      queueMicrotask(() => {
        if (localUniver) {
          try {
            localUniver.dispose();
          } catch {
            // Teardown guard
          }
        }
        try {
          container.remove();
        } catch {}
      });
      univerRef.current = null;
    };
  }, [theme, sheet.id]);

  return (
    <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden bg-white dark:bg-[#090d16]">
      <div
        ref={containerRef}
        className="w-full h-full absolute inset-0 overflow-hidden"
      />
    </div>
  );
}
