'use client';

import React, { useState, useRef } from 'react';
import { WorkbookModel, SheetData } from '@/types/sheet';
import { GOLDEN_TEMPLATES } from '@/lib/templates/goldenTemplates';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';
import { parseCSVToWorkbook } from '@/lib/engine/csvHelper';
import AgentPipelineBar, { PipelineStage } from '@/components/pipeline/AgentPipelineBar';
import UniverSheetWrapper from '@/components/spreadsheet/UniverSheetWrapper';
import DynamicChartCard from '@/components/charts/DynamicChartCard';
import WhatIfPanel from '@/components/simulation/WhatIfPanel';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Play,
  Cloud,
  Check,
  AlertCircle,
  Table,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function SheetBrainStudio() {
  const [currentWorkbook, setCurrentWorkbook] = useState<WorkbookModel>(GOLDEN_TEMPLATES['saas_runway']);
  const [activeTemplateKey, setActiveTemplateKey] = useState<string>('saas_runway');
  const [customImportName, setCustomImportName] = useState<string | null>(null);
  const [promptText, setPromptText] = useState<string>('');
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSheet = currentWorkbook.sheets[0];

  // Auto-dismiss notification after 4 seconds
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle cell edit in the spreadsheet
  const handleSheetUpdate = (updatedSheet: SheetData) => {
    setCurrentWorkbook(prev => ({
      ...prev,
      sheets: [updatedSheet, ...prev.sheets.slice(1)],
    }));
  };

  // 1-Click Template Switcher
  const handleSelectTemplate = (templateKey: string) => {
    if (GOLDEN_TEMPLATES[templateKey]) {
      setActiveTemplateKey(templateKey);
      setCurrentWorkbook(GOLDEN_TEMPLATES[templateKey]);
      setActiveScenario(undefined);
    }
  };

  // CSV File Upload & Parsing Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      showToast('Please upload a valid .csv file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text || !text.trim()) {
        showToast('Uploaded CSV file is empty.', 'error');
        return;
      }

      try {
        const imported = parseCSVToWorkbook(file.name, text);
        // Recompute all mathematical formulas if any were loaded
        const recomputed = recalculateWorkbook(imported.sheets[0].cellData);
        imported.sheets[0].cellData = recomputed;

        setCurrentWorkbook(imported);
        setActiveTemplateKey('imported');
        setCustomImportName(file.name);
        setActiveScenario(undefined);

        showToast(`Imported ${file.name} (${imported.sheets[0].columns.length} columns, ${imported.sheets[0].rowCount} rows)`);
      } catch (err: any) {
        console.error('CSV import error:', err);
        showToast(`CSV Import Error: ${err.message || 'Invalid format'}`, 'error');
      }
    };

    reader.onerror = () => {
      showToast('Failed to read the uploaded CSV file.', 'error');
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset input so same file can be re-imported
  };

  // Generate Sheet via Serverless Multi-Agent API
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    const userPrompt = promptText.trim();
    setPipelineStage('planning_schema');

    try {
      setTimeout(() => setPipelineStage('compiling_formulas'), 500);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      setPipelineStage('binding_charts');

      if (res.ok) {
        const data = await res.json();
        if (data.workbook) {
          setCurrentWorkbook(data.workbook);
          setActiveTemplateKey('custom');
          setActiveScenario(undefined);
          showToast(`Compiled custom model: ${userPrompt.slice(0, 35)}...`);
        }
      } else {
        if (/marketing|cac|ad|spend/i.test(userPrompt)) {
          handleSelectTemplate('cac_cohort');
        } else {
          handleSelectTemplate('saas_runway');
        }
      }
    } catch (err) {
      console.warn('API call error, falling back locally:', err);
      handleSelectTemplate('saas_runway');
    } finally {
      setPipelineStage('complete');
      setTimeout(() => setPipelineStage('idle'), 2500);
    }
  };

  // What-If Scenario Sensitivity Simulation via Serverless API
  const handleSimulateScenario = async (scenarioPrompt: string) => {
    setIsSimulating(true);
    setActiveScenario(scenarioPrompt);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hypothesis: scenarioPrompt, sheet: activeSheet }),
      });

      const updatedCells = { ...activeSheet.cellData };

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
      showToast(`Simulated: ${scenarioPrompt}`);
    } catch (err) {
      console.warn('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetSimulation = () => {
    setActiveScenario(undefined);
    if (activeTemplateKey === 'imported' && currentWorkbook) {
      const cleanCells = { ...activeSheet.cellData };
      Object.keys(cleanCells).forEach(k => {
        if (cleanCells[k].isModified) {
          delete cleanCells[k].isModified;
          delete cleanCells[k].deltaPercent;
        }
      });
      handleSheetUpdate({ ...activeSheet, cellData: cleanCells });
    } else {
      handleSelectTemplate(activeTemplateKey === 'custom' ? 'saas_runway' : activeTemplateKey);
    }
    showToast('Reset scenario to baseline');
  };

  // 1-Click CSV Export
  const handleExportCSV = () => {
    const rows: string[] = [];
    const colKeys = activeSheet.columns.map(c => c.key);
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
    link.setAttribute('download', `${currentWorkbook.id || 'sheetbrain'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported workbook to CSV');
  };

  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium shadow-lg ${
          notification.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-800'
            : 'bg-slate-900 text-slate-100 border-emerald-500/40'
        }`}>
          {notification.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header & Navigation */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">SheetBrain AI</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                AWS Studio
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Autonomous Multi-Agent Spreadsheet & BI Engine</p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-850 border border-slate-800 text-[11px] text-slate-400">
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span>AWS Amplify Edge</span>
          </div>

          <button
            onClick={() => handleSelectTemplate('saas_runway')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            <Play className="w-3 h-3 text-emerald-400" />
            <span>Live Demo</span>
          </button>

          {/* Hidden File Input for CSV Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,text/csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-xs font-medium text-slate-200 border border-slate-700 transition"
            title="Import an existing CSV spreadsheet"
          >
            <Upload className="w-3 h-3 text-sky-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium text-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Natural Language Command Bar */}
      <div className="px-5 py-3 bg-slate-950 border-b border-slate-800/80">
        <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Describe your model, e.g. 12-month SaaS runway model with 3 hiring tiers and burn rate..."
              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <button
            type="submit"
            disabled={!promptText.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs tracking-wide transition flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <span>Compile Model</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Model Selectors (Clean typography without emoji noise) */}
        <div className="flex items-center gap-2 mt-2.5 overflow-x-auto text-xs text-slate-400 scrollbar-none pb-0.5">
          <span className="text-[11px] text-slate-500 font-medium shrink-0">Models:</span>

          {customImportName && (
            <button
              onClick={() => setActiveTemplateKey('imported')}
              className={`px-2.5 py-1 rounded text-[11px] transition shrink-0 flex items-center gap-1.5 ${
                activeTemplateKey === 'imported'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/40 font-semibold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3 h-3 text-sky-400" />
              <span>{customImportName}</span>
            </button>
          )}

          {[
            { key: 'saas_runway', label: 'SaaS Runway' },
            { key: 'cac_cohort', label: 'CAC & Cohort' },
            { key: 'cap_table', label: 'Cap Table' },
            { key: 'dept_budget', label: 'Budget Variance' },
            { key: 'sprint_velocity', label: 'Sprint Velocity' },
          ].map(tpl => (
            <button
              key={tpl.key}
              onClick={() => handleSelectTemplate(tpl.key)}
              className={`px-2.5 py-1 rounded text-[11px] transition shrink-0 ${
                activeTemplateKey === tpl.key
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 font-medium'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Agent Pipeline Status Bar */}
      <AgentPipelineBar stage={pipelineStage} currentPrompt={promptText} />

      {/* Main Studio Canvas Workspace */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (70% on desktop): Living Univer Spreadsheet Canvas */}
        <div className="lg:col-span-8 flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{currentWorkbook.title}</span>
              </h2>
              <p className="text-xs text-slate-400">{currentWorkbook.description}</p>
            </div>
            <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              Reactive Math: <strong className="text-emerald-400 font-medium">Active</strong>
            </div>
          </div>

          <div className="flex-1">
            <UniverSheetWrapper
              sheet={activeSheet}
              onCellChange={handleSheetUpdate}
            />
          </div>
        </div>

        {/* Right Column (30% on desktop): Analytics & What-If Simulator */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Dynamic Recharts Visualization */}
          <div className="flex-1 min-h-[280px]">
            <DynamicChartCard
              config={currentWorkbook.chartConfig}
              sheet={activeSheet}
            />
          </div>

          {/* What-If Scenario Simulation Panel */}
          <div>
            <WhatIfPanel
              onSimulate={handleSimulateScenario}
              onReset={handleResetSimulation}
              activeScenario={activeScenario}
              isSimulating={isSimulating}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
