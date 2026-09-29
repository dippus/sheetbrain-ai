'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { WorkbookModel, SheetData } from '@/types/sheet';
import { GOLDEN_TEMPLATES } from '@/lib/templates/goldenTemplates';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';
import { parseCSVToWorkbook } from '@/lib/engine/csvHelper';
import { parseXLSXToWorkbook, exportWorkbookToXLSX } from '@/lib/engine/excelHelper';
import WorkspaceSidebar, { DatasetItem } from '@/components/navigation/WorkspaceSidebar';
import UniverSheetWrapper from '@/components/spreadsheet/UniverSheetWrapper';
import VisualAnalyticsView from '@/components/views/VisualAnalyticsView';
import ScenarioMatrixView from '@/components/views/ScenarioMatrixView';
import ExecutiveReportView from '@/components/views/ExecutiveReportView';
import StudioErrorBoundary from '@/components/common/StudioErrorBoundary';
import {
  FolderOpen,
  RefreshCw,
  GitBranch,
  Table,
  LineChart,
  Sliders,
  FileText,
  Download,
  Upload,
  ChevronDown,
  Copy,
  Sun,
  Moon,
  Laptop,
  HelpCircle,
  X,
  Keyboard,
  AlertTriangle
} from 'lucide-react';

// Factory for a pristine, 100% clean empty sheet (zero hardcoded fake/demo data)
function createCleanBlankSheet(sheetIndex: number): SheetData {
  return {
    id: `sheet_${Date.now()}_${sheetIndex}`,
    name: `Sheet ${sheetIndex}`,
    rowCount: 30,
    columnCount: 10,
    columns: [
      { key: 'A', label: 'A', type: 'string', width: 140 },
      { key: 'B', label: 'B', type: 'number', width: 130 },
      { key: 'C', label: 'C', type: 'number', width: 130 },
      { key: 'D', label: 'D', type: 'number', width: 130 },
      { key: 'E', label: 'E', type: 'number', width: 130 },
      { key: 'F', label: 'F', type: 'string', width: 140 },
      { key: 'G', label: 'G', type: 'string', width: 140 },
      { key: 'H', label: 'H', type: 'string', width: 140 },
      { key: 'I', label: 'I', type: 'string', width: 140 },
      { key: 'J', label: 'J', type: 'string', width: 140 },
    ],
    cellData: {}, // Pristine clean empty cells
  };
}

export default function SheetBrainStudio() {
  // 1. Core State
  const initialWorkbook = GOLDEN_TEMPLATES['blank_sheet'] ?? GOLDEN_TEMPLATES['git_commits'];
  const [currentWorkbook, setCurrentWorkbook] = useState<WorkbookModel>(initialWorkbook);
  const [activeTemplateKey, setActiveTemplateKey] = useState<string>('blank_sheet');
  const [datasets, setDatasets] = useState<DatasetItem[]>([
    { key: 'blank_sheet', label: 'New Blank Spreadsheet', category: 'Workspace', periods: 'Blank', type: 'Blank' },
    { key: 'Expense-Claims.xlsx', label: 'Expense-Claims.xlsx', category: 'Excel Dataset', periods: '1,001 Rows', type: 'Native XLSX' },
  ]);
  const [activeSheetId, setActiveSheetId] = useState<string>(initialWorkbook.sheets[0]?.id || 'sheet-1');
  const [customImportName, setCustomImportName] = useState<string | null>(null);
  const [promptText, setPromptText] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeView, setActiveView] = useState<'grid' | 'analytics' | 'scenarios' | 'report'>('grid');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // 2. Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  // 3. Defensive Sheet Selection
  const safeWorkbook = currentWorkbook || initialWorkbook;
  const activeSheet: SheetData = useMemo(() => {
    return safeWorkbook?.sheets?.find(s => s.id === activeSheetId) ||
      safeWorkbook?.sheets?.[0] ||
      createCleanBlankSheet(1);
  }, [safeWorkbook, activeSheetId]);

  // 4. Toast Notification Callback
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // 5. Template & Local File Selector Callback (Real disk reading via /api/local-data)
  const handleSelectTemplate = useCallback(async (templateKey: string) => {
    setActiveTemplateKey(templateKey);
    setActiveScenario(undefined);

    // 1. Pristine blank sheet requested
    if (templateKey === 'blank_sheet') {
      const blankTpl = GOLDEN_TEMPLATES['blank_sheet'];
      setCurrentWorkbook(blankTpl);
      setActiveSheetId(blankTpl.sheets[0]?.id || 'sheet_1');
      showToast('Created new blank spreadsheet');
      return;
    }

    // 2. Fetch directly from physical device disk via /api/local-data
    try {
      const res = await fetch(`/api/local-data?file=${encodeURIComponent(templateKey)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.workbook) {
          const wb = json.workbook;
          if (wb.sheets?.[0]) {
            wb.sheets[0].cellData = recalculateWorkbook(wb.sheets[0].cellData || {});
          }
          setCurrentWorkbook(wb);
          setActiveSheetId(wb.sheets[0]?.id || 'sheet_1');
          showToast(`Loaded ${json.fileName} from device (${wb.sheets.length} sheet(s), ${wb.sheets[0]?.rowCount || 0} rows)`);
          return;
        }
      }
    } catch (e) {
      console.warn('[handleSelectTemplate] /api/local-data fetch notice:', e);
    }

    // 3. Direct static fallback (/data/...)
    try {
      const isXlsx = templateKey.endsWith('.xlsx');
      const targetFile = isXlsx ? templateKey : (templateKey.endsWith('.csv') ? templateKey : `${templateKey}.csv`);
      const staticRes = await fetch(`/data/${targetFile}?t=${Date.now()}`);
      if (staticRes.ok) {
        if (isXlsx) {
          const buffer = await staticRes.arrayBuffer();
          const imported = parseXLSXToWorkbook(targetFile, buffer);
          setCurrentWorkbook(imported);
          setActiveSheetId(imported.sheets[0]?.id || 'sheet_1');
          showToast(`Loaded ${targetFile} (${imported.sheets.length} sheet(s), ${imported.sheets[0]?.rowCount || 0} rows)`);
          return;
        } else {
          const text = await staticRes.text();
          if (text && text.trim()) {
            const imported = parseCSVToWorkbook(targetFile, text);
            setCurrentWorkbook(imported);
            setActiveSheetId(imported.sheets[0]?.id || 'sheet-1');
            showToast(`Loaded ${targetFile} (${imported.sheets[0]?.rowCount || 0} rows)`);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[handleSelectTemplate] static fallback notice:', e);
    }

    // 4. Safe clean fallback: blank sheet
    const cleanFallback = GOLDEN_TEMPLATES['blank_sheet'];
    setCurrentWorkbook(cleanFallback);
    setActiveSheetId(cleanFallback.sheets[0]?.id || 'sheet_1');
    showToast('Loaded blank workspace');
  }, [showToast]);

  // Real Device Disk Scanner: Queries /api/local-data and populates sidebar
  const handleSyncLocalFiles = useCallback(async () => {
    try {
      showToast('Scanning local device data/ folder...');
      const res = await fetch('/api/local-data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.files) && json.files.length > 0) {
          const realDatasets: DatasetItem[] = [
            { key: 'blank_sheet', label: 'New Blank Spreadsheet', category: 'Workspace', periods: 'Blank', type: 'Blank' },
            ...json.files.map((f: any) => ({
              key: f.fileName,
              label: f.fileName,
              category: f.isXlsx ? 'Excel Dataset' : 'Local CSV',
              periods: `${f.rowCount} Rows`,
              type: f.isXlsx ? 'Native XLSX' : 'Local CSV',
            }))
          ];
          setDatasets(realDatasets);
          showToast(`Synced ${json.files.length} real files from device folder`);
          return;
        }
      }
      showToast('No files found in local data folder', 'error');
    } catch (err) {
      console.error('Sync files error:', err);
      showToast('Failed to sync files from device', 'error');
    }
  }, [showToast]);

  // 6. Theme Engine
  const applyTheme = useCallback((mode: 'dark' | 'light' | 'system') => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'light') {
      root.classList.remove('dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      localStorage.setItem('sheetbrain_theme', nextTheme);
    } catch (e) {}
    showToast(`Theme switched to ${nextTheme.toUpperCase()}`);
  }, [theme, applyTheme, showToast]);

  // 7. Mount & Theme Initialization Effects
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('sheetbrain_theme') as 'dark' | 'light' | 'system' | null;
      if (saved) {
        setTheme(saved);
        applyTheme(saved);
      } else {
        applyTheme('dark');
      }
    } catch (e) {}

    // Attempt to load real git commits CSV from local data/ folder;
    // falls back to the built-in git_analytics golden template if CSV not present
    handleSelectTemplate('blank_sheet');
  }, [applyTheme, handleSelectTemplate]);

  // 8. Outside Click Listener for Menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 9. Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        promptInputRef.current?.focus();
        promptInputRef.current?.select();
      } else if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleToggleTheme();
      } else if (e.key === '?' && e.shiftKey && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        // Shift+/ produces '?' — guard against firing inside any editable element
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowExportMenu(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleToggleTheme]);

  // 10. Sheet & Grid Update Handlers
  const handleSheetUpdate = useCallback((updatedSheet: SheetData) => {
    setCurrentWorkbook(prev => ({
      ...prev,
      sheets: (prev?.sheets || []).map(s => s.id === updatedSheet.id ? updatedSheet : s),
    }));
  }, []);

  const handleAddSheet = useCallback(() => {
    setCurrentWorkbook(prev => {
      const existingSheets = prev?.sheets || [];
      const newIndex = existingSheets.length + 1;
      const newSheet = createCleanBlankSheet(newIndex);
      setActiveSheetId(newSheet.id);
      return {
        ...prev,
        sheets: [...existingSheets, newSheet],
      };
    });
    showToast('Added new blank sheet (unlimited sheets supported)');
  }, [showToast]);

  const handleDeleteSheet = useCallback((sheetId: string) => {
    setCurrentWorkbook(prev => {
      if (!prev || !prev.sheets) return prev;

      // If only 1 sheet exists, reset it to a clean blank sheet
      if (prev.sheets.length <= 1) {
        const cleanSheet = createCleanBlankSheet(1);
        setActiveSheetId(cleanSheet.id);
        return {
          ...prev,
          title: 'Untitled Spreadsheet',
          sheets: [cleanSheet],
        };
      }

      const targetIdx = prev.sheets.findIndex(s => s.id === sheetId);
      const remaining = prev.sheets.filter(s => s.id !== sheetId);

      // If active sheet is deleted, switch active tab to adjacent sheet
      if (activeSheetId === sheetId) {
        const nextActive = remaining[Math.min(targetIdx, remaining.length - 1)];
        if (nextActive) {
          setActiveSheetId(nextActive.id);
        }
      }

      return {
        ...prev,
        sheets: remaining,
      };
    });
    showToast('Sheet cleared / deleted');
  }, [activeSheetId, showToast]);

  const handleDeleteDataset = useCallback((key: string) => {
    setDatasets(prev => prev.filter(d => d.key !== key));
    if (activeTemplateKey === key) {
      handleSelectTemplate('blank_sheet');
    }
    showToast(`Removed dataset from workspace`);
  }, [activeTemplateKey, handleSelectTemplate, showToast]);

  const handleRenameSheet = useCallback((sheetId: string, newName: string) => {
    if (!newName.trim()) return;
    setCurrentWorkbook(prev => {
      if (!prev || !prev.sheets) return prev;
      return {
        ...prev,
        sheets: prev.sheets.map(s => s.id === sheetId ? { ...s, name: newName.trim() } : s),
      };
    });
    showToast(`Renamed sheet to "${newName.trim()}"`);
  }, [showToast]);

  // Batch Processor for Multi-File Selection (.xlsx, .csv)
  const processBatchFiles = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;

    const validFiles = files.filter(f =>
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );

    if (validFiles.length === 0) {
      showToast('Please select valid .xlsx or .csv files.', 'error');
      return;
    }

    showToast(`Processing ${validFiles.length} file(s)... Loading data`);

    const parsedWorkbooks: WorkbookModel[] = [];

    for (const file of validFiles) {
      const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      try {
        if (isXlsx) {
          const buffer = await file.arrayBuffer();
          const wb = parseXLSXToWorkbook(file.name, buffer);
          parsedWorkbooks.push(wb);
        } else {
          const text = await file.text();
          const wb = parseCSVToWorkbook(file.name, text);
          parsedWorkbooks.push(wb);
        }
      } catch (err: any) {
        console.error(`Error parsing ${file.name}:`, err);
      }
    }

    if (parsedWorkbooks.length === 0) {
      showToast('Could not parse the selected files.', 'error');
      return;
    }

    // Single File Selection
    if (parsedWorkbooks.length === 1) {
      const wb = parsedWorkbooks[0];
      if (wb.sheets?.[0]) {
        wb.sheets[0].cellData = recalculateWorkbook(wb.sheets[0].cellData || {});
      }
      setCurrentWorkbook(wb);
      setActiveTemplateKey(validFiles[0].name);
      setActiveSheetId(wb.sheets[0]?.id || 'sheet_1');
      setCustomImportName(validFiles[0].name);

      setDatasets(prev => {
        if (prev.some(d => d.key === validFiles[0].name)) return prev;
        return [
          ...prev,
          {
            key: validFiles[0].name,
            label: validFiles[0].name,
            category: validFiles[0].name.endsWith('.xlsx') ? 'Excel Dataset' : 'Local CSV',
            periods: `${wb.sheets[0]?.rowCount || 0} Rows`,
            type: validFiles[0].name.endsWith('.xlsx') ? 'Native XLSX' : 'Local CSV',
          }
        ];
      });

      showToast(`Imported ${validFiles[0].name} (${wb.sheets.length} sheet(s), ${wb.sheets[0]?.rowCount || 0} rows)`);
      return;
    }

    // MULTI-FILE SELECTION: Combine all selected files into multi-sheet tabs!
    const allSheets: SheetData[] = [];
    const newDatasetItems: DatasetItem[] = [];

    parsedWorkbooks.forEach((wb, idx) => {
      const file = validFiles[idx];
      const fileBaseName = file.name.replace(/\.[^/.]+$/, '');

      wb.sheets.forEach((sheet, sIdx) => {
        const sheetTabName = wb.sheets.length > 1
          ? `${fileBaseName} - ${sheet.name}`
          : fileBaseName;

        allSheets.push({
          ...sheet,
          id: `sheet_batch_${idx}_${sIdx}_${Date.now()}`,
          name: sheetTabName,
          cellData: recalculateWorkbook(sheet.cellData || {}),
        });
      });

      newDatasetItems.push({
        key: file.name,
        label: file.name,
        category: file.name.endsWith('.xlsx') ? 'Excel Dataset' : 'Local CSV',
        periods: `${wb.sheets[0]?.rowCount || 0} Rows`,
        type: file.name.endsWith('.xlsx') ? 'Native XLSX' : 'Local CSV',
      });
    });

    const combinedWorkbook: WorkbookModel = {
      id: `wb_multi_${Date.now()}`,
      title: `Combined Multi-File Workspace (${validFiles.length} Files)`,
      description: `Multi-sheet workspace with files: ${validFiles.map(f => f.name).join(', ')}`,
      category: 'Multi-Sheet Import',
      sheets: allSheets,
      chartConfig: parsedWorkbooks[0]?.chartConfig || {
        type: 'line',
        title: 'Data Trend',
        xAxisKey: 'A',
        series: [{ key: 'B', label: 'Value', color: '#2563eb' }],
      },
    };

    setCurrentWorkbook(combinedWorkbook);
    setActiveTemplateKey('combined_multi');
    setActiveSheetId(allSheets[0].id);
    setCustomImportName(`Combined (${validFiles.length} files)`);

    setDatasets(prev => {
      const existingKeys = new Set(prev.map(d => d.key));
      const toAdd = newDatasetItems.filter(item => !existingKeys.has(item.key));
      return [...prev, ...toAdd];
    });

    showToast(`Loaded all ${validFiles.length} files as ${allSheets.length} sheet tabs!`);
  }, [showToast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processBatchFiles(files);
    }
    e.target.value = '';
  };


  const handleExportXLSX = () => {
    if (!safeWorkbook) return;
    try {
      const blob = exportWorkbookToXLSX(safeWorkbook);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${safeWorkbook.id || 'sheetbrain'}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportMenu(false);
      showToast('Exported workbook to Excel (.xlsx)');
    } catch (err: any) {
      showToast(`Export Error: ${err.message || 'Failed to export'}`, 'error');
    }
  };

  const handleGenerateWithPrompt = async (promptToRun: string) => {
    if (!promptToRun.trim()) return;

    setIsCompiling(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToRun }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.workbook) {
          setCurrentWorkbook(data.workbook);
          setActiveTemplateKey('custom');
          setActiveSheetId(data.workbook.sheets[0]?.id || 'sheet-1');
          setActiveScenario(undefined);
          showToast(`Compiled model: ${promptToRun.slice(0, 32)}...`);
        }
      } else {
        handleSelectTemplate('blank_sheet');
      }
    } catch (err) {
      console.warn('API fallback locally:', err);
      handleSelectTemplate('blank_sheet');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleGenerateWithPrompt(promptText);
  };

  const handleSimulateScenario = async (scenarioPrompt: string) => {
    setIsSimulating(true);
    setActiveScenario(scenarioPrompt);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hypothesis: scenarioPrompt, sheet: activeSheet }),
      });

      const updatedCells = { ...(activeSheet?.cellData || {}) };

      if (res.ok) {
        const data = await res.json();
        const deltas = data.simulation?.deltas || [];

        deltas.forEach((d: any) => {
          const cell = updatedCells[d.cell];
          if (cell && typeof cell.v === 'number') {
            updatedCells[d.cell] = {
              ...cell,
              v: Math.round(cell.v * (d.multiplier || 1.2)),
              isModified: true,
              deltaPercent: d.deltaPercent || '+20%',
            };
          }
        });
      }

      const recomputed = recalculateWorkbook(updatedCells);
      handleSheetUpdate({
        ...activeSheet,
        cellData: recomputed,
      });
      showToast(`Simulated scenario: ${scenarioPrompt}`);
    } catch (err) {
      console.warn('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCommitBaseline = () => {
    const committedCells = { ...(activeSheet?.cellData || {}) };
    Object.keys(committedCells).forEach(k => {
      if (committedCells[k].isModified) {
        delete committedCells[k].isModified;
        delete committedCells[k].deltaPercent;
      }
    });
    handleSheetUpdate({ ...activeSheet, cellData: committedCells });
    setActiveScenario(undefined);
    showToast('Saved simulated scenario as new baseline');
  };

  const handleResetSimulation = () => {
    setActiveScenario(undefined);
    if (activeTemplateKey === 'imported' && currentWorkbook) {
      const cleanCells = { ...(activeSheet?.cellData || {}) };
      Object.keys(cleanCells).forEach(k => {
        if (cleanCells[k].isModified) {
          delete cleanCells[k].isModified;
          delete cleanCells[k].deltaPercent;
        }
      });
      handleSheetUpdate({ ...activeSheet, cellData: cleanCells });
    } else {
      handleSelectTemplate(activeTemplateKey);
    }
    showToast('Reset scenario to baseline');
  };

  const handleExportCSV = () => {
    if (!activeSheet || !activeSheet.columns) return;
    const rows: string[] = [];
    const colKeys = activeSheet.columns.map(c => c.key);
    // Row 1: export column label names as header (template row-1 cell values like A1/B1
    // are formatting metadata; the canonical column labels from SheetColumn.label are used here)
    rows.push(activeSheet.columns.map(c => `"${c.label}"`).join(','));

    for (let r = 2; r <= activeSheet.rowCount; r++) {
      const rowVals = colKeys.map(k => {
        const cell = activeSheet.cellData[`${k}${r}`];
        const val = cell?.v !== undefined ? String(cell.v) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      rows.push(rowVals.join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${safeWorkbook.id || 'sheetbrain'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
    showToast('Exported workbook to CSV');
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(safeWorkbook, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${safeWorkbook.id || 'sheetbrain'}_model_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
    showToast('Exported full model JSON');
  };

  const handleCopyTSV = () => {
    if (!activeSheet || !activeSheet.columns) return;
    const lines: string[] = [];
    const colKeys = activeSheet.columns.map(c => c.key);
    lines.push(activeSheet.columns.map(c => c.label).join('\t'));

    for (let r = 2; r <= activeSheet.rowCount; r++) {
      const rowVals = colKeys.map(k => {
        const cell = activeSheet.cellData[`${k}${r}`];
        return cell?.v !== undefined ? String(cell.v) : '';
      });
      lines.push(rowVals.join('\t'));
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setShowExportMenu(false);
    showToast('Copied to clipboard (ready for Excel / Sheets)');
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processBatchFiles(Array.from(e.dataTransfer.files));
        }
      }}
      className="h-screen flex bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 select-none overflow-hidden transition-colors relative"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 border-2 border-dashed border-blue-600 flex flex-col items-center justify-center pointer-events-none transition">
          <div className="bg-white dark:bg-[#0c121e] border border-slate-300 dark:border-[#1e293b] p-6 rounded-xl shadow-2xl flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-blue-500 stroke-[1.5]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Drop Excel (.xlsx) or CSV files here</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">All files will be batch imported into multi-sheet tabs automatically</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-3 right-3 z-50 flex items-center gap-2 px-3 py-2 rounded text-xs font-medium shadow-lg transition ${
          notification.type === 'error'
            ? 'bg-red-900 text-red-100 border border-red-700'
            : 'bg-slate-900 dark:bg-[#162031] text-white border border-slate-700 dark:border-[#2b3a52]'
        }`}>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Left Workspace Navigator Sidebar */}
      <WorkspaceSidebar
        currentWorkbook={safeWorkbook}
        activeTemplateKey={activeTemplateKey}
        onSelectTemplate={handleSelectTemplate}
        customImportName={customImportName}
        onUploadClick={() => fileInputRef.current?.click()}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        datasets={datasets}
        onDeleteDataset={handleDeleteDataset}
      />

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
        {/* 1. Top Studio Header Bar */}
        <header className="h-12 bg-white dark:bg-[#0c121e] border-b border-slate-200 dark:border-[#1e293b] px-4 flex items-center justify-between gap-4 shrink-0 text-xs transition-colors">
          {/* Document Identity & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate">
              {safeWorkbook.title}
            </span>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
              <span>Autosaved</span>
            </div>
          </div>

          {/* Model Synthesis Prompt Bar */}
          <form onSubmit={handleGenerate} className="flex-1 max-w-lg flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={promptInputRef}
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="AI Formula & Model Assistant (Ctrl+K)..."
                className="w-full bg-slate-50 dark:bg-[#131b2a] border border-slate-300 dark:border-[#223049] rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#162031] transition"
              />
              <span className="hidden md:block absolute right-2 top-2 text-[10px] text-slate-400 pointer-events-none">
                Ctrl+K
              </span>
            </div>
            <button
              type="submit"
              disabled={!promptText.trim() || isCompiling}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition disabled:opacity-40 shrink-0 shadow-xs"
            >
              {isCompiling ? 'Compiling...' : 'Compile'}
            </button>
          </form>

          {/* Right Header Utility Strip */}
          <div className="flex items-center gap-2">
            {/* Sync Local Files Button */}
            <button
              onClick={handleSyncLocalFiles}
              title="Scan and sync all real .csv and .xlsx files from device data/ folder"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-[#223049] hover:bg-slate-100 dark:hover:bg-[#162031] text-slate-700 dark:text-slate-300 font-medium transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Sync Local Files</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={handleToggleTheme}
              title={`Theme: ${theme.toUpperCase()} (Click to cycle Light/Dark/System)`}
              className="p-1.5 rounded border border-slate-200 dark:border-[#223049] hover:bg-slate-100 dark:hover:bg-[#162031] text-slate-600 dark:text-slate-300 transition"
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Laptop className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Keyboard Shortcuts Help */}
            <button
              onClick={() => setShowShortcutsModal(true)}
              title="Keyboard Shortcuts (?)"
              className="p-1.5 rounded border border-slate-200 dark:border-[#223049] hover:bg-slate-100 dark:hover:bg-[#162031] text-slate-600 dark:text-slate-300 transition"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Hidden CSV File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 dark:border-[#223049] hover:bg-slate-100 dark:hover:bg-[#162031] text-slate-700 dark:text-slate-300 font-medium transition"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Import</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(prev => !prev)}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-[#223049] rounded shadow-xl py-1 z-50 text-xs text-slate-800 dark:text-slate-200">
                  <button
                    onClick={handleExportXLSX}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] text-blue-600 dark:text-blue-400 font-medium transition"
                  >
                    Download as Excel (.xlsx)
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] transition"
                  >
                    Download as CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] transition"
                  >
                    Download Model JSON
                  </button>
                  <div className="border-t border-slate-200 dark:border-[#223049] my-1" />
                  <button
                    onClick={handleCopyTSV}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1a2538] text-blue-600 dark:text-blue-400 font-medium flex items-center justify-between transition"
                  >
                    <span>Copy for Excel / Sheets</span>
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 2. View Mode Switcher Strip */}
        <div className="h-10 bg-slate-200/70 dark:bg-[#090e18] border-b border-slate-200 dark:border-[#1e293b] px-4 flex items-center justify-between text-xs shrink-0 transition-colors">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveView('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-semibold transition ${
                activeView === 'grid'
                  ? 'bg-white dark:bg-[#090d16] text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-[#1e293b] border-b-white dark:border-b-[#090d16] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#121a29]'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Spreadsheet Grid</span>
            </button>

            <button
              onClick={() => setActiveView('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-semibold transition ${
                activeView === 'analytics'
                  ? 'bg-white dark:bg-[#090d16] text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-[#1e293b] border-b-white dark:border-b-[#090d16] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#121a29]'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Visual Analytics</span>
            </button>

            <button
              onClick={() => setActiveView('scenarios')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-semibold transition ${
                activeView === 'scenarios'
                  ? 'bg-white dark:bg-[#090d16] text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-[#1e293b] border-b-white dark:border-b-[#090d16] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#121a29]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Scenario Matrix</span>
            </button>

            <button
              onClick={() => setActiveView('report')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-semibold transition ${
                activeView === 'report'
                  ? 'bg-white dark:bg-[#090d16] text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-[#1e293b] border-b-white dark:border-b-[#090d16] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#121a29]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Executive Report</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {activeSheet?.rowCount ? activeSheet.rowCount - 1 : 0} rows · {activeSheet?.columns?.length || 0} columns · Auto-calc
          </div>
        </div>

        {/* 3. Active Workspace Canvas */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <StudioErrorBoundary fallbackTitle="Spreadsheet View Recovered" onReset={() => handleSelectTemplate(activeTemplateKey)}>
          {activeView === 'grid' && (
            <UniverSheetWrapper
              sheet={activeSheet}
              sheets={safeWorkbook?.sheets || [activeSheet]}
              activeSheetId={activeSheetId}
              onSelectSheet={(id) => setActiveSheetId(id)}
              onAddSheet={handleAddSheet}
              onDeleteSheet={handleDeleteSheet}
              onRenameSheet={handleRenameSheet}
              onCellChange={handleSheetUpdate}
            />
          )}

          {activeView === 'analytics' && (
            <VisualAnalyticsView
              sheet={activeSheet}
              chartConfig={safeWorkbook?.chartConfig || {
                type: 'line',
                title: safeWorkbook?.title || 'Visual Analytics',
                xAxisKey: activeSheet?.columns?.[0]?.key || 'A',
                series: [{ key: activeSheet?.columns?.[1]?.key || 'B', label: 'Value', color: '#2563eb' }]
              }}
            />
          )}

          {activeView === 'scenarios' && (
            <ScenarioMatrixView
              sheet={activeSheet}
              onSimulate={handleSimulateScenario}
              onReset={handleResetSimulation}
              onCommitBaseline={handleCommitBaseline}
              activeScenario={activeScenario}
              isSimulating={isSimulating}
            />
          )}

          {activeView === 'report' && (
            <ExecutiveReportView
              workbook={safeWorkbook}
              sheet={activeSheet}
            />
          )}
          </StudioErrorBoundary>
        </div>
      </div>

      {/* 4. Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0d1422] border border-slate-300 dark:border-[#1e293b] rounded-lg max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 text-xs text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-sm">Keyboard Shortcuts</span>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#1a2333] text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#162030]">
                <span className="text-slate-600 dark:text-slate-400">Navigate Data Grid</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#192438] text-[11px]">Arrow Keys</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#162030]">
                <span className="text-slate-600 dark:text-slate-400">Edit / Commit Cell</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#192438] text-[11px]">Enter / F2</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#162030]">
                <span className="text-slate-600 dark:text-slate-400">Next Cell / Cancel</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#192438] text-[11px]">Tab / Esc</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#162030]">
                <span className="text-slate-600 dark:text-slate-400">Focus AI Prompt Bar</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#192438] text-[11px]">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#162030]">
                <span className="text-slate-600 dark:text-slate-400">Toggle Dark / Light Theme</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#192438] text-[11px]">Alt + T</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600 dark:text-slate-400">Toggle Bold Styling</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#192438] text-[11px]">Ctrl + B</kbd>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-[#1e293b] flex justify-end">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-3 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
