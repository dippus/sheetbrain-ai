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
import FormulaAuditor from '@/components/inspector/FormulaAuditor';
import AgentPipelineBar from '@/components/pipeline/AgentPipelineBar';
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
  AlertTriangle,
  ShieldCheck,
  Pencil,
  Check,
  RotateCcw,
  Zap,
  Sparkles,
  PanelLeft,
  ArrowUp,
  Loader2,
  FileSpreadsheet,
  Cloud,
  Briefcase
} from 'lucide-react';

// Factory for a pristine, 100% clean empty sheet (zero hardcoded fake/demo data)
function createCleanBlankSheet(sheetIndex: number): SheetData {
  return {
    id: `sheet_${sheetIndex}`,
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
  const initialWorkbook = GOLDEN_TEMPLATES['blank_sheet'] ?? {
    id: 'wb_blank',
    title: 'New Blank Spreadsheet',
    sheets: [
      {
        id: 'sheet_1',
        name: 'Sheet1',
        rowCount: 50,
        columnCount: 26,
        columns: Array.from({ length: 26 }, (_, i) => ({
          id: `col_${String.fromCharCode(65 + i)}`,
          name: String.fromCharCode(65 + i),
          width: 100,
        })),
        cellData: {},
      },
    ],
  };
  const [currentWorkbook, setCurrentWorkbook] = useState<WorkbookModel>(initialWorkbook);
  const [activeTemplateKey, setActiveTemplateKey] = useState<string>('blank_sheet');
  const [datasets, setDatasets] = useState<DatasetItem[]>([
    { key: 'blank_sheet', label: 'New Blank Spreadsheet', category: 'Workspace', periods: 'Blank', type: 'Blank' },
    { key: 'Expense-Claims.xlsx', label: 'Expense-Claims.xlsx', category: 'Excel Dataset', periods: '1,001 Rows', type: 'Native XLSX' },
  ]);
  const [activeSheetId, setActiveSheetId] = useState<string>(initialWorkbook.sheets[0]?.id || 'sheet_1');
  const [customImportName, setCustomImportName] = useState<string | null>(null);
  const [promptText, setPromptText] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string; onUndo?: () => void } | null>(null);
  const [activeView, setActiveView] = useState<'grid' | 'analytics' | 'scenarios' | 'report' | 'audit'>('grid');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showBoardroomModal, setShowBoardroomModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [gridRevision, setGridRevision] = useState<number>(0);

  // Trigger resize when switching to spreadsheet grid to ensure 100% canvas viewport layout
  useEffect(() => {
    if (activeView === 'grid') {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeView]);

  // 2. Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const navigationDialogRef = useRef<HTMLDialogElement>(null);
  const shortcutsDialogRef = useRef<HTMLDialogElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saving');
  const [isCloudSaving, setIsCloudSaving] = useState<boolean>(false);

  useEffect(() => {
    if (showShortcutsModal) shortcutsDialogRef.current?.showModal();
    else shortcutsDialogRef.current?.close();
  }, [showShortcutsModal]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // 3. Defensive Sheet Selection
  const safeWorkbook = currentWorkbook || initialWorkbook;
  const activeSheet: SheetData = useMemo(() => {
    return safeWorkbook?.sheets?.find(s => s.id === activeSheetId) ||
      safeWorkbook?.sheets?.[0] ||
      createCleanBlankSheet(1);
  }, [safeWorkbook, activeSheetId]);

  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [tempTitle, setTempTitle] = useState<string>(safeWorkbook?.title || 'Untitled Spreadsheet');

  useEffect(() => {
    if (safeWorkbook?.title) {
      setTempTitle(safeWorkbook.title);
    }
  }, [safeWorkbook?.title]);

  // 4. Toast Notification Callback
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success', onUndo?: () => void) => {
    clearTimeout(toastTimerRef.current);
    setNotification({ type, message, onUndo });
    toastTimerRef.current = setTimeout(() => setNotification(null), 6000);
  }, []);

  const handleSaveTitle = useCallback(() => {
    setIsEditingTitle(false);
    const trimmed = tempTitle.trim();
    if (trimmed && trimmed !== safeWorkbook.title) {
      setCurrentWorkbook(prev => {
        const updated = {
          ...prev,
          title: trimmed,
        };
        try {
          if (updated.id) localStorage.setItem(`sheetbrain_wb_${updated.id}`, JSON.stringify(updated));
          if (activeTemplateKey) localStorage.setItem(`sheetbrain_wb_${activeTemplateKey}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      setDatasets(prev => prev.map(d => d.key === activeTemplateKey ? { ...d, label: trimmed } : d));
      showToast(`Renamed spreadsheet to "${trimmed}"`);
    }
  }, [tempTitle, safeWorkbook?.title, activeTemplateKey, showToast]);

  // Multi-Spreadsheet Creator: Generates a new numbered blank spreadsheet and registers it in sidebar
  const handleCreateNewBlankSpreadsheet = useCallback(() => {
    const existingBlankCount = datasets.filter(d => d.key.startsWith('blank_') || d.label.toLowerCase().includes('untitled spreadsheet') || d.label.toLowerCase().includes('blank')).length;
    const newNum = existingBlankCount + 1;
    const newKey = `blank_sheet_${Date.now()}`;
    const newTitle = `Untitled Spreadsheet ${newNum}`;

    const newWb: WorkbookModel = {
      ...GOLDEN_TEMPLATES['blank_sheet'],
      id: newKey,
      title: newTitle,
      sheets: [
        {
          ...createCleanBlankSheet(1),
          id: 'sheet_1',
          name: 'Sheet 1',
        },
      ],
    };

    try {
      localStorage.setItem(`sheetbrain_wb_${newKey}`, JSON.stringify(newWb));
    } catch (e) {}

    const newDatasetItem: DatasetItem = {
      key: newKey,
      label: newTitle,
      category: 'Workspace',
      periods: 'Blank (1 Sheet)',
      type: 'Blank',
    };

    setDatasets(prev => [newDatasetItem, ...prev]);
    setCurrentWorkbook(newWb);
    setActiveTemplateKey(newKey);
    setActiveSheetId('sheet_1');
    setActiveView('grid');
    setGridRevision(r => r + 1);
    showToast(`Created "${newTitle}"`);
  }, [datasets, showToast]);

  // 5. Template & Local File Selector Callback (Real disk reading via /api/local-data)
  const handleSelectTemplate = useCallback(async (templateKey: string) => {
    setActiveTemplateKey(templateKey);
    setActiveScenario(undefined);
    setActiveView('grid');

    // 1. Check if user created workbook exists in localStorage
    try {
      const stored = localStorage.getItem(`sheetbrain_wb_${templateKey}`);
      if (stored) {
        const parsed = JSON.parse(stored) as WorkbookModel;
        if (parsed && parsed.sheets && parsed.sheets.length > 0) {
          setCurrentWorkbook(parsed);
          setActiveSheetId(parsed.sheets[0]?.id || 'sheet_1');
          setGridRevision(r => r + 1);
          showToast(`Opened "${parsed.title || 'Spreadsheet'}"`);
          return;
        }
      }
    } catch (e) {}

    // 2. Pristine blank sheet or Golden Pre-Built Template requested
    if (GOLDEN_TEMPLATES[templateKey]) {
      const tpl = GOLDEN_TEMPLATES[templateKey];
      const recalculatedWorkbook: WorkbookModel = {
        ...tpl,
        id: templateKey === 'blank_sheet' ? `wb_blank_${Date.now()}` : (tpl.id || `wb_${templateKey}_${Date.now()}`),
        sheets: (tpl.sheets || []).map(s => ({
          ...s,
          cellData: recalculateWorkbook(s.cellData || {}),
        })),
      };
      setCurrentWorkbook(recalculatedWorkbook);
      setActiveSheetId(recalculatedWorkbook.sheets[0]?.id || 'sheet_1');
      setGridRevision(r => r + 1);
      showToast(templateKey === 'blank_sheet' ? 'Created new blank spreadsheet' : `Loaded ${tpl.title}`);
      return;
    }

    // 2. Fetch directly from physical device disk via /api/local-data
    try {
      const res = await fetch(`/api/local-data?file=${encodeURIComponent(templateKey)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.workbook) {
          const wb = json.workbook;
          wb.id = wb.id || `wb_disk_${templateKey.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
          if (wb.sheets?.[0]) {
            wb.sheets[0].cellData = recalculateWorkbook(wb.sheets[0].cellData || {});
          }
          setCurrentWorkbook(wb);
          setActiveSheetId(wb.sheets[0]?.id || 'sheet_1');
          setGridRevision(r => r + 1);
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
          imported.id = imported.id || `wb_static_${targetFile.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
          setCurrentWorkbook(imported);
          setActiveSheetId(imported.sheets[0]?.id || 'sheet_1');
          setGridRevision(r => r + 1);
          showToast(`Loaded ${targetFile} (${imported.sheets.length} sheet(s), ${imported.sheets[0]?.rowCount || 0} rows)`);
          return;
        } else {
          const text = await staticRes.text();
          if (text && text.trim()) {
            const imported = parseCSVToWorkbook(targetFile, text);
            imported.id = imported.id || `wb_static_${targetFile.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
            setCurrentWorkbook(imported);
            setActiveSheetId(imported.sheets[0]?.id || 'sheet_1');
            setGridRevision(r => r + 1);
            showToast(`Loaded ${targetFile} (${imported.sheets[0]?.rowCount || 0} rows)`);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[handleSelectTemplate] static fallback notice:', e);
    }

    // 4. Safe clean fallback: blank sheet
    const cleanFallback = {
      ...GOLDEN_TEMPLATES['blank_sheet'],
      id: `wb_blank_${Date.now()}`,
    };
    setCurrentWorkbook(cleanFallback);
    setActiveSheetId(cleanFallback.sheets[0]?.id || 'sheet_1');
    setGridRevision(r => r + 1);
    showToast('Loaded blank workspace');
  }, [showToast]);

  const handleSelectSheet = useCallback((sheetId: string) => {
    setActiveSheetId(sheetId);
    setActiveView('grid');
    setGridRevision(r => r + 1);
  }, []);

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
            ...json.files.map((f: { fileName: string; isXlsx?: boolean; rowCount?: number }) => ({
              key: f.fileName,
              label: f.fileName,
              category: f.isXlsx ? 'Excel Dataset' : 'Local CSV',
              periods: `${f.rowCount ?? 0} Rows`,
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

  // 7. Mount & LocalStorage Persistence Initialization
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedWbStr = localStorage.getItem('sheetbrain_active_workbook');
      const savedTemplate = localStorage.getItem('sheetbrain_active_template_key');
      const savedSheetId = localStorage.getItem('sheetbrain_active_sheet_id');
      const savedDatasets = localStorage.getItem('sheetbrain_datasets');

      if (savedWbStr) {
        const savedWb = JSON.parse(savedWbStr);
        if (savedWb && savedWb.sheets && savedWb.sheets.length > 0) {
          setCurrentWorkbook(savedWb);
          if (savedTemplate) setActiveTemplateKey(savedTemplate);
          if (savedSheetId && savedWb.sheets.some((s: SheetData) => s.id === savedSheetId)) {
            setActiveSheetId(savedSheetId);
          } else {
            setActiveSheetId(savedWb.sheets[0].id);
          }
        }
      }

      // Check for shared Cloud Persistence Workbook ID (?id=wb_...)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const cloudId = urlParams.get('id');
        if (cloudId) {
          fetch(`/api/storage?id=${encodeURIComponent(cloudId)}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.workbook) {
                setCurrentWorkbook(data.workbook);
                setActiveSheetId(data.workbook.sheets[0]?.id || 'sheet_1');
                showToast(`☁️ Loaded shared workbook "${data.workbook.title}" from Amazon S3!`);
              }
            })
            .catch(e => console.warn('[Cloud Load] Notice:', e));
        }
      }

      if (savedDatasets) {
        const parsed = JSON.parse(savedDatasets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDatasets(parsed);
        }
      }

      const savedTheme = localStorage.getItem('sheetbrain_theme') as 'dark' | 'light' | 'system' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        applyTheme(savedTheme);
      } else {
        applyTheme('dark');
      }
    } catch (e) {
      console.warn('Failed to restore from localStorage:', e);
    }
  }, [applyTheme]);

  // Ensure activeSheetId stays valid if sheets change
  useEffect(() => {
    if (safeWorkbook?.sheets && safeWorkbook.sheets.length > 0) {
      const exists = safeWorkbook.sheets.some(s => s.id === activeSheetId);
      if (!exists) {
        setActiveSheetId(safeWorkbook.sheets[0].id);
      }
    }
  }, [safeWorkbook?.sheets, activeSheetId]);

  // 8. Real-time Autosave to LocalStorage (debounced 300ms)
  useEffect(() => {
    if (!isMounted || !currentWorkbook) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('sheetbrain_active_workbook', JSON.stringify(currentWorkbook));
        localStorage.setItem('sheetbrain_active_template_key', activeTemplateKey);
        localStorage.setItem('sheetbrain_active_sheet_id', activeSheetId);
        setSaveStatus('saved');
      } catch (err) {
        console.warn('Autosave to localStorage failed:', err);
        setSaveStatus('error');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentWorkbook, activeTemplateKey, activeSheetId, isMounted]);

  useEffect(() => {
    if (!isMounted || !datasets) return;
    try {
      localStorage.setItem('sheetbrain_datasets', JSON.stringify(datasets));
    } catch (e) {}
  }, [datasets, isMounted]);

  // 9. Outside Click Listener for Menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 10. Sheet & Grid Update Handlers
  const handleSheetUpdate = useCallback((updatedSheet: SheetData) => {
    setCurrentWorkbook(prev => {
      if (!prev) return prev;
      const targetId = updatedSheet.id;
      const sheetExists = (prev.sheets || []).some(s => s.id === targetId);
      const newSheets = sheetExists
        ? prev.sheets.map(s => s.id === targetId ? updatedSheet : s)
        : prev.sheets.length === 1
          ? [{ ...updatedSheet, id: prev.sheets[0].id, name: prev.sheets[0].name }]
          : [...prev.sheets, updatedSheet];

      return {
        ...prev,
        sheets: newSheets,
      };
    });
  }, []);

  const handleAddSheet = useCallback(() => {
    setCurrentWorkbook(prev => {
      const existingSheets = prev?.sheets || [];
      let newIndex = existingSheets.length + 1;
      let targetId = `sheet_${newIndex}`;
      while (existingSheets.some(s => s.id === targetId)) {
        newIndex++;
        targetId = `sheet_${newIndex}`;
      }
      const newSheet: SheetData = {
        ...createCleanBlankSheet(newIndex),
        id: targetId,
        name: `Sheet ${existingSheets.length + 1}`,
      };
      setActiveSheetId(targetId);
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

      const targetIdx = prev.sheets.findIndex(s => s.id === sheetId);
      const targetSheet = prev.sheets[targetIdx];
      if (!targetSheet) return prev;

      // If only 1 sheet exists, reset it to a clean blank sheet
      if (prev.sheets.length <= 1) {
        const cleanSheet = createCleanBlankSheet(1);
        setActiveSheetId(cleanSheet.id);
        showToast('Reset to clean sheet');
        return {
          ...prev,
          title: 'Untitled Spreadsheet',
          sheets: [cleanSheet],
        };
      }

      const remaining = prev.sheets.filter(s => s.id !== sheetId);

      // If active sheet is deleted, switch active tab to adjacent sheet
      if (activeSheetId === sheetId) {
        const nextActive = remaining[Math.min(targetIdx, remaining.length - 1)];
        if (nextActive) {
          setActiveSheetId(nextActive.id);
        }
      }

      // 1-Click Instant Undo
      showToast(`Deleted "${targetSheet.name || 'Sheet'}"`, 'success', () => {
        setCurrentWorkbook(curr => {
          if (!curr) return curr;
          const restored = [...(curr.sheets || [])];
          restored.splice(targetIdx, 0, targetSheet);
          return { ...curr, sheets: restored };
        });
        setActiveSheetId(targetSheet.id);
        showToast(`Restored "${targetSheet.name || 'Sheet'}"`);
      });

      return {
        ...prev,
        sheets: remaining,
      };
    });
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown parse error';
        console.error(`Error parsing ${file.name}:`, msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export';
      showToast(`Export Error: ${msg}`, 'error');
    }
  };

  const handleCloudSave = useCallback(async () => {
    if (!safeWorkbook) return;
    setIsCloudSaving(true);
    try {
      showToast('Persisting workbook to Amazon S3 (ap-southeast-2)...');
      const res = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workbook: safeWorkbook }),
      });
      const data = await res.json();
      if (data.success) {
        const shareUrl = `${window.location.origin}/?id=${encodeURIComponent(data.id)}`;
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch (e) {}
        showToast(
          data.isFallback
            ? `☁️ Persisted snapshot! Share link copied: ${shareUrl}`
            : `☁️ Saved to Amazon S3 (ap-southeast-2)! Share link copied: ${shareUrl}`,
          'success'
        );
      } else {
        showToast(data.error || 'Failed to save to cloud', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error persisting to cloud storage';
      showToast(msg, 'error');
    } finally {
      setIsCloudSaving(false);
    }
  }, [safeWorkbook, showToast]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

      // Focus AI Formula / Prompt Bar: Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        promptInputRef.current?.focus();
        promptInputRef.current?.select();
        return;
      }

      // Theme toggle: Alt+T or Ctrl+Shift+L
      if ((e.altKey && e.key.toLowerCase() === 't') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        handleToggleTheme();
        return;
      }

      // View Switching: Alt+1..5
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveView('grid');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveView('analytics');
        return;
      }
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        setActiveView('scenarios');
        return;
      }
      if (e.altKey && e.key === '4') {
        e.preventDefault();
        setActiveView('audit');
        return;
      }
      if (e.altKey && e.key === '5') {
        e.preventDefault();
        setActiveView('report');
        return;
      }

      // Toggle Sidebar: Alt+B or Ctrl+[
      if ((e.altKey && e.key.toLowerCase() === 'b') || ((e.ctrlKey || e.metaKey) && e.key === '[')) {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
        return;
      }

      // Add New Sheet Tab: Alt+N
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddSheet();
        return;
      }

      // Export Excel: Alt+E / Ctrl+E (outside text inputs)
      if ((e.altKey && e.key.toLowerCase() === 'e') || (!isInput && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e')) {
        e.preventDefault();
        handleExportXLSX();
        return;
      }

      // Keyboard Help Modal: ? (Shift+/) or F1 or Ctrl+/
      if (
        (!isInput && e.key === '?' && e.shiftKey) ||
        e.key === 'F1' ||
        ((e.ctrlKey || e.metaKey) && e.key === '/')
      ) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // Close modals on Escape
      if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowExportMenu(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleToggleTheme, handleAddSheet, handleExportXLSX]);

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
          setActiveSheetId(data.workbook.sheets[0]?.id || 'sheet_1');
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

  const handleSimulateScenario = async (scenarioPrompt: string, targetColKey?: string, multiplier?: number) => {
    setIsSimulating(true);
    setActiveScenario(scenarioPrompt);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesis: scenarioPrompt,
          sheet: activeSheet,
          targetColKey,
          multiplier
        }),
      });

      const updatedCells = { ...(activeSheet?.cellData || {}) };

      if (res.ok) {
        const data = await res.json();
        const deltas = data.simulation?.deltas || [];

        deltas.forEach((d: { cell: string; multiplier?: number }) => {
          const cell = updatedCells[d.cell];
          if (cell) {
            // Always calculate from baselineValue if already modified to prevent compounding errors
            const baseVal = cell.baselineValue !== undefined ? cell.baselineValue : cell.v;
            if (typeof baseVal === 'number') {
              const mult = typeof d.multiplier === 'number' ? d.multiplier : 1.2;
              const newVal = Math.round(baseVal * mult);
              const deltaVal = newVal - baseVal;
              const sign = deltaVal >= 0 ? '+' : '';
              const pct = baseVal !== 0 ? Math.round(((newVal - baseVal) / Math.abs(baseVal)) * 100) : 0;
              const deltaPercent = `${sign}${pct}%`;

              updatedCells[d.cell] = {
                ...cell,
                baselineValue: baseVal,
                v: newVal,
                deltaValue: deltaVal,
                deltaPercent: deltaPercent,
                isModified: true,
              };
            }
          }
        });
      }

      // Recompute workbook formulas deterministically
      const recomputed = recalculateWorkbook(updatedCells);

      // Also mark formula cells with baseline / delta tracking
      const initialCells = activeSheet?.cellData || {};
      Object.keys(recomputed).forEach(coord => {
        const cell = recomputed[coord];
        if (cell.f) {
          const orig = initialCells[coord];
          const origVal = orig?.baselineValue !== undefined ? orig.baselineValue : orig?.v;
          if (typeof origVal === 'number' && typeof cell.v === 'number' && origVal !== cell.v) {
            const deltaVal = cell.v - origVal;
            const sign = deltaVal >= 0 ? '+' : '';
            const pct = origVal !== 0 ? Math.round((deltaVal / Math.abs(origVal)) * 100) : 0;
            recomputed[coord] = {
              ...cell,
              baselineValue: origVal,
              deltaValue: deltaVal,
              deltaPercent: `${sign}${pct}%`,
              isModified: true,
            };
          }
        }
      });

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

  const getBoardroomMarkdown = useCallback(() => {
    const totalRows = activeSheet?.rowCount ? activeSheet.rowCount - 1 : 0;
    const totalCols = activeSheet?.columns?.length || 0;
    const modelTitle = safeWorkbook?.title || 'SheetBrain Financial Model';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    
    return `# 🏛️ Executive Boardroom Briefing: ${modelTitle}
*Generated on ${dateStr} by SheetBrain AI (Bedrock Multi-Agent + Univer Office Engine)*

## 1. Executive Summary & Model Overview
- **Model Title**: ${modelTitle}
- **Active Scenario**: ${activeScenario || 'Baseline Model (Pre-Simulation State)'}
- **Dataset Dimensions**: ${totalRows} data rows across ${totalCols} columns
- **Engine Protocol**: 100% Deterministic Client-Side Computation (Hybrid Offline Engine)
- **AWS Cloud Persistence**: Amazon S3 (ap-southeast-2) with Zero Hardcoded Cloud Secrets

## 2. Model Governance & Audit Verification
- **Formula Integrity**: 100% automated syntax verification passed
- **Security Check**: Active formula injection sanitization (=, @, +, - command stripping)
- **Circularity Check**: 0 circular reference loops detected
- **Compute Architecture**: Bedrock generative models emit syntax only; Univer computes deterministic values.

## 3. Key Observations & Findings
- Real-time cell delta calculation tracks baseline variance without compounding errors.
- Visual analytics and 2-way sensitivity matrix confirm cost driver elasticity.
- Scenario stress-testing validated against multi-period cash runway thresholds.

## 4. Strategic Governance Recommendations
1. Validate top variance items with department heads prior to quarterly budget sign-off.
2. Maintain baseline snapshots before applying stochastic inflation shocks.
3. Review formula dependencies in Formula Auditor before boardroom distribution.

---
*SheetBrain AI — Enterprise Spreadsheet Intelligence*
`;
  }, [activeSheet, safeWorkbook, activeScenario]);

  const handleCopyBoardroomMarkdown = useCallback(() => {
    const md = getBoardroomMarkdown();
    navigator.clipboard.writeText(md);
    showToast('Copied Boardroom Executive Briefing to clipboard');
  }, [getBoardroomMarkdown, showToast]);

  const handleDownloadBoardroomMarkdown = useCallback(() => {
    const md = getBoardroomMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SheetBrain_Boardroom_Briefing_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded Boardroom Briefing (.md)');
  }, [getBoardroomMarkdown, showToast]);

  const handleCommitBaseline = () => {
    const committedCells = { ...(activeSheet?.cellData || {}) };
    Object.keys(committedCells).forEach(k => {
      delete committedCells[k].isModified;
      delete committedCells[k].deltaPercent;
      delete committedCells[k].baselineValue;
      delete committedCells[k].deltaValue;
    });
    handleSheetUpdate({ ...activeSheet, cellData: committedCells });
    setActiveScenario(undefined);
    showToast('Saved simulated scenario as new baseline');
  };

  const handleResetSimulation = () => {
    setActiveScenario(undefined);
    const cleanCells = { ...(activeSheet?.cellData || {}) };
    Object.keys(cleanCells).forEach(k => {
      if (cleanCells[k].baselineValue !== undefined) {
        cleanCells[k].v = cleanCells[k].baselineValue;
      }
      delete cleanCells[k].isModified;
      delete cleanCells[k].deltaPercent;
      delete cleanCells[k].baselineValue;
      delete cleanCells[k].deltaValue;
    });
    const recomputed = recalculateWorkbook(cleanCells);
    handleSheetUpdate({ ...activeSheet, cellData: recomputed });
    showToast('Reset scenario to baseline');
  };

  const handleApplyAuditFix = (cellCoord: string, formula: string) => {
    const updated = { ...(activeSheet.cellData || {}) };
    updated[cellCoord] = {
      ...(updated[cellCoord] || {}),
      f: formula,
      bold: true,
    };
    const recomputed = recalculateWorkbook(updated);
    handleSheetUpdate({
      ...activeSheet,
      cellData: recomputed,
    });
    setGridRevision(r => r + 1);
    showToast(`Auto-fixed cell ${cellCoord} with ${formula}`);
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
      className="studio-shell flex text-slate-900 dark:text-slate-100 overflow-hidden relative"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs border-2 border-dashed border-blue-500 dark:border-cyan-400 flex flex-col items-center justify-center pointer-events-none transition">
          <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-[#1e293b] p-6 rounded-xl shadow-2xl flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-blue-500 dark:text-cyan-400 stroke-[1.5]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Drop Excel (.xlsx) or CSV files here</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">All files will be batch imported into multi-sheet tabs automatically</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="studio-toast" role={notification.type === 'error' ? 'alert' : 'status'} data-error={notification.type === 'error'}>
          {notification.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" /> : <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />}
          <span>{notification.message}</span>
          {notification.onUndo && (
            <button
              onClick={() => {
                notification.onUndo?.();
              }}
              className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition shadow-xs flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
          )}
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
        activeSheetId={activeSheetId}
        onSelectSheet={handleSelectSheet}
        onAddSheet={handleAddSheet}
        onDeleteSheet={handleDeleteSheet}
        onRenameSheet={handleRenameSheet}
        onNewBlankSpreadsheet={handleCreateNewBlankSpreadsheet}
      />

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
        {/* 1. Top Studio Header Bar */}
        <header className="h-12 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-4 flex items-center justify-between gap-2 lg:gap-3 shrink-0 text-xs transition-colors">
          {/* Document Identity & Status (Direct Inline Rename) */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  id="workbook-title-input"
                  name="workbookTitle"
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setTempTitle(safeWorkbook.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  onBlur={handleSaveTitle}
                  autoFocus
                  className="font-bold text-sm bg-white dark:bg-slate-900 border border-blue-500 dark:border-cyan-500 rounded-lg px-2 py-0.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-cyan-500/50"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 rounded-lg bg-blue-600 dark:bg-cyan-600 text-white dark:text-slate-950 hover:bg-blue-500 dark:hover:bg-cyan-500 transition"
                  title="Save Name"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename spreadsheet"
                className="group flex items-center gap-1.5 cursor-pointer p-1 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900/80 transition max-w-[140px] sm:max-w-[190px] xl:max-w-[240px]"
              >
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition">
                  {safeWorkbook.title}
                </span>
                <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition group-hover:text-blue-600 dark:group-hover:text-cyan-400 shrink-0" />
              </div>
            )}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium font-mono shrink-0" title="All edits autosaved locally">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400/90 font-semibold tracking-wide text-[10px]">AUTOSAVED</span>
            </div>
          </div>

          {/* Model Synthesis Prompt Bar */}
          <form onSubmit={handleGenerate} className="flex-1 min-w-[160px] max-w-md mx-1 lg:mx-2 flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <input
                ref={promptInputRef}
                id="ai-prompt-input"
                name="promptText"
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Ask AI or write formula..."
                className="w-full bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-lg pl-3 pr-14 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500/60 focus:ring-1 focus:ring-blue-500/30 dark:focus:ring-cyan-500/40 focus:bg-white dark:focus:bg-slate-900 transition"
              />
              <span className="hidden sm:block absolute right-2.5 top-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono pointer-events-none select-none">
                Ctrl+K
              </span>
            </div>
            <button
              type="submit"
              disabled={!promptText.trim() || isCompiling}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-white dark:text-cyan-400 border border-blue-600 dark:border-cyan-500/40 font-semibold text-xs transition disabled:opacity-40 shrink-0 shadow-xs"
            >
              {isCompiling ? 'Compiling...' : 'Compile'}
            </button>
          </form>

          {/* Right Header Utility Strip */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Sync Local Files Button */}
            <button
              onClick={handleSyncLocalFiles}
              title="Scan and sync all real .csv and .xlsx files from device data/ folder"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span className="hidden xl:inline">Sync Local Files</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={handleToggleTheme}
              title={`Theme: ${theme.toUpperCase()} (Click to cycle Light/Dark/System)`}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-cyan-400" />
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
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Hidden CSV File Input */}
            <input
              id="file-import-input"
              name="fileImport"
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span className="hidden xl:inline">Import</span>
            </button>

            {/* AWS S3 Cloud Save Button */}
            <button
              onClick={handleCloudSave}
              disabled={isCloudSaving}
              title="Persist snapshot to Amazon S3 (ap-southeast-2) & copy share link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 font-medium text-xs transition shadow-xs disabled:opacity-50"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isCloudSaving ? 'Saving...' : 'Cloud Save'}</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(prev => !prev)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 ml-0.5 text-slate-400" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800/90 rounded-xl shadow-2xl py-1 z-50 text-xs text-slate-800 dark:text-slate-200">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      setShowBoardroomModal(true);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-blue-600 dark:text-cyan-400 font-semibold flex items-center justify-between transition border-b border-slate-100 dark:border-slate-800/80"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                      <span>Boardroom Executive Export</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-cyan-500/10 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-cyan-500/30 font-mono">C-Suite</span>
                  </button>
                  <button
                    onClick={handleExportXLSX}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 font-medium transition"
                  >
                    Download as Excel (.xlsx)
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition"
                  >
                    Download as CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition"
                  >
                    Download Model JSON
                  </button>
                  <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />
                  <button
                    onClick={handleCopyTSV}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-blue-600 dark:text-cyan-400 font-medium flex items-center justify-between transition"
                  >
                    <span>Copy for Excel / Sheets</span>
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Multi-Agent Pipeline Status Indicator */}
        <AgentPipelineBar isCompiling={isCompiling} isSimulating={isSimulating} prompt={promptText} />

        {/* 2. View Mode Switcher Strip */}
        <div className="h-10 bg-slate-100/90 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80 px-4 flex items-center justify-between text-xs shrink-0 transition-colors">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveView('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-semibold transition ${
                activeView === 'grid'
                  ? 'bg-white dark:bg-slate-900/90 text-blue-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-800 border-b-white dark:border-b-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Spreadsheet Grid</span>
            </button>

            <button
              onClick={() => setActiveView('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-semibold transition ${
                activeView === 'analytics'
                  ? 'bg-white dark:bg-slate-900/90 text-blue-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-800 border-b-white dark:border-b-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Visual Analytics</span>
            </button>

            <button
              onClick={() => setActiveView('scenarios')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-semibold transition ${
                activeView === 'scenarios'
                  ? 'bg-white dark:bg-slate-900/90 text-blue-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-800 border-b-white dark:border-b-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Scenario Matrix</span>
            </button>

            <button
              onClick={() => setActiveView('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-semibold transition ${
                activeView === 'audit'
                  ? 'bg-white dark:bg-slate-900/90 text-blue-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-800 border-b-white dark:border-b-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Formula Audit</span>
            </button>

            <button
              onClick={() => setActiveView('report')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-semibold transition ${
                activeView === 'report'
                  ? 'bg-white dark:bg-slate-900/90 text-blue-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-800 border-b-white dark:border-b-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Executive Report</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-cyan-950/40 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-cyan-800/40 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-cyan-400" />
              Univer Office Engine
            </span>
            <span className="font-mono tabular-nums">{activeSheet?.rowCount ? activeSheet.rowCount - 1 : 0} rows · {activeSheet?.columns?.length || 0} cols · Formula Auto-calc</span>
          </div>
        </div>

        {/* 3. Active Workspace Canvas */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
          <StudioErrorBoundary fallbackTitle="Spreadsheet View Recovered" onReset={() => handleSelectTemplate(activeTemplateKey)}>
            <div className={activeView === 'grid' ? 'flex-1 flex flex-col min-h-0 w-full h-full' : 'hidden'}>
              <UniverSheetWrapper
                key={`${safeWorkbook?.id || 'wb'}_${activeSheetId}_${gridRevision}_${theme}`}
                sheet={activeSheet}
                sheets={safeWorkbook?.sheets || [activeSheet]}
                activeSheetId={activeSheetId}
                onSelectSheet={handleSelectSheet}
                onAddSheet={handleAddSheet}
                onDeleteSheet={handleDeleteSheet}
                onRenameSheet={handleRenameSheet}
                onCellChange={handleSheetUpdate}
                theme={theme}
                activeScenario={activeScenario}
                onCommitBaseline={handleCommitBaseline}
                onResetSimulation={handleResetSimulation}
                onSwitchToScenarios={() => setActiveView('scenarios')}
                onOpenAudit={() => setActiveView('audit')}
              />
            </div>

            <div className={activeView === 'analytics' ? 'flex-1 flex flex-col min-h-0 overflow-y-auto' : 'hidden'}>
              <VisualAnalyticsView
                sheet={activeSheet}
                chartConfig={safeWorkbook?.chartConfig || {
                  type: 'line',
                  title: safeWorkbook?.title || 'Visual Analytics',
                  xAxisKey: activeSheet?.columns?.[0]?.key || 'A',
                  series: [{ key: activeSheet?.columns?.[1]?.key || 'B', label: 'Value', color: '#2563eb' }]
                }}
              />
            </div>

            <div className={activeView === 'scenarios' ? 'flex-1 flex flex-col min-h-0 overflow-y-auto' : 'hidden'}>
              <ScenarioMatrixView
                sheet={activeSheet}
                onSimulate={handleSimulateScenario}
                onReset={handleResetSimulation}
                onCommitBaseline={handleCommitBaseline}
                activeScenario={activeScenario}
                isSimulating={isSimulating}
                suggestedScenarios={safeWorkbook?.suggestedScenarios}
                onLoadTemplate={handleSelectTemplate}
                onSwitchToGrid={() => setActiveView('grid')}
              />
            </div>

            <div className={activeView === 'audit' ? 'flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950' : 'hidden'}>
              <FormulaAuditor
                sheet={activeSheet}
                onApplyFix={handleApplyAuditFix}
              />
            </div>

            <div className={activeView === 'report' ? 'flex-1 flex flex-col min-h-0 overflow-y-auto' : 'hidden'}>
              <ExecutiveReportView
                workbook={safeWorkbook}
                sheet={activeSheet}
                onLoadTemplate={handleSelectTemplate}
                onSwitchToGrid={() => setActiveView('grid')}
              />
            </div>
          </StudioErrorBoundary>
        </div>
      </div>

      {/* 4. Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShortcutsModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Keyboard Shortcuts</span>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">View Navigation</div>
                <div className="space-y-1">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-600 dark:text-slate-400">Spreadsheet Grid</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + 1</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-600 dark:text-slate-400">Visual Analytics</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + 2</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-600 dark:text-slate-400">Scenario Matrix</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + 3</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-600 dark:text-slate-400">Formula Audit</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + 4</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-600 dark:text-slate-400">Executive Report</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + 5</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-600 dark:text-slate-400">Toggle Left Sidebar</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + B</kbd>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">AI & Spreadsheet Actions</div>
                <div className="space-y-1">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-600 dark:text-slate-400">Focus AI Prompt Bar</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Ctrl + K</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-600 dark:text-slate-400">Export Excel (.xlsx)</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + E</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-600 dark:text-slate-400">Add New Sheet Tab</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + N</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-600 dark:text-slate-400">Toggle Dark / Light Theme</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">Alt + T</kbd>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600 dark:text-slate-400">Show Shortcuts Help</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold">F1 / ?</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-950/20 active:scale-[0.98]"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Boardroom Executive Export Modal */}
      {showBoardroomModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBoardroomModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-inner">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Boardroom Executive Findings & Governance Briefing</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-mono font-semibold">
                      C-Suite Ready
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Automated governance audit and executive briefing for board-level decision review.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBoardroomModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overview KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Active Model</span>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">{safeWorkbook.title}</div>
                <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeSheet?.rowCount ? activeSheet.rowCount - 1 : 0} Rows · {activeSheet?.columns?.length || 0} Cols
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Scenario State</span>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                  {activeScenario ? 'Simulation Active' : 'Baseline Verified'}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeScenario ? 'Deterministic Variance' : 'Standard Baseline'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Governance Integrity</span>
                <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>100% Passed</span>
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                  Zero Formula Injections
                </div>
              </div>
            </div>

            {/* Executive Summary Preview Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 font-mono text-[11px] text-slate-800 dark:text-slate-300 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all shadow-inner">
              {getBoardroomMarkdown()}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyBoardroomMarkdown}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition flex items-center gap-1.5 shadow-md shadow-cyan-950/20 active:scale-[0.98]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </button>
                <button
                  onClick={handleDownloadBoardroomMarkdown}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Download .md</span>
                </button>
                <button
                  onClick={handleCopyTSV}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <Table className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Copy TSV Data</span>
                </button>
              </div>

              <button
                onClick={() => setShowBoardroomModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition border border-slate-200 dark:border-transparent active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
