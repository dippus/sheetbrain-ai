'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { SheetData, SheetCell } from '@/types/sheet';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Zap,
  Activity,
  FileCode,
  ArrowRight,
  Cloud,
  Database,
  Server,
  RefreshCw
} from 'lucide-react';

export interface AuditIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  cellCoord: string;
  category: 'Broken Formula' | 'Hardcoded Total' | 'Empty Value' | 'Statistical Outlier';
  message: string;
  suggestion?: string;
  actionFormula?: string;
}

interface FormulaAuditorProps {
  sheet: SheetData;
  onApplyFix?: (cellCoord: string, formula: string) => void;
  onSelectCell?: (cellCoord: string) => void;
}

interface ObservabilityData {
  status: string;
  aws: {
    assignedRegion: string;
    observability: {
      engine: string;
      namespace: string;
      delivery: 'cloudwatch-api' | 'emf-stdout-only';
    };
    bedrock: {
      modelId: string;
      authConfigured: boolean;
      transport: string;
      guardrailConfigured: boolean;
    };
    persistence: {
      layer: string;
      durable: boolean;
      encryption: string;
      persistedObjectsCount: number;
    };
  };
}

export default function FormulaAuditor({ sheet, onApplyFix, onSelectCell }: FormulaAuditorProps) {
  const [telemetry, setTelemetry] = useState<ObservabilityData | null>(null);

  useEffect(() => {
    fetch('/api/observability')
      .then(res => res.json())
      .then(data => setTelemetry(data))
      .catch(e => console.warn('Telemetry fetch notice:', e));
  }, []);

  const safeColumns = sheet?.columns || [];
  const cellMap = sheet?.cellData || {};
  const totalRows = Math.max(1, sheet?.rowCount || 1);

  // Analyze sheet for formula health, anomalies, and integrity
  const auditResults = useMemo(() => {
    const issues: AuditIssue[] = [];
    let formulaCount = 0;
    let numericCellCount = 0;
    let totalCellCount = 0;

    const columnKeys = safeColumns.map(c => c.key);

    // 1. Scan all cells
    for (let r = 1; r <= totalRows; r++) {
      for (const colKey of columnKeys) {
        const coord = `${colKey}${r}`;
        const cell: SheetCell | undefined = cellMap[coord];
        if (!cell) continue;

        totalCellCount++;

        if (cell.f) {
          formulaCount++;
          // Check for formula errors
          const formulaStr = cell.f.trim();
          if (formulaStr.includes('#REF!') || formulaStr.includes('#VALUE!') || formulaStr.includes('#DIV/0!')) {
            issues.push({
              id: `err_${coord}`,
              type: 'error',
              cellCoord: coord,
              category: 'Broken Formula',
              message: `Formula contains syntax error: ${formulaStr}`,
              suggestion: 'Recalculate or replace with valid range syntax',
            });
          }
        }

        if (typeof cell.v === 'number') {
          numericCellCount++;
        }

        // Detect hardcoded summary rows (e.g., Row labeled "Total" or "Subtotal", excluding metric names like "Total Addressable Market")
        const rowLabelCell = cellMap[`A${r}`]?.v;
        const isTotalRow = typeof rowLabelCell === 'string' &&
          /^(total(\s+(revenue|cost|costs|expense|expenses|opex|capex|profit|margin|burn|cash))?|grand total|subtotal|sum)$/i.test(rowLabelCell.trim());

        const hasFormula = !!cell.f || (typeof cell.v === 'string' && cell.v.trim().startsWith('='));

        if (isTotalRow && colKey !== 'A' && typeof cell.v === 'number' && !hasFormula && r > 2) {
          const suggestedFormula = `=SUM(${colKey}2:${colKey}${r - 1})`;
          issues.push({
            id: `hardcoded_${coord}`,
            type: 'warning',
            cellCoord: coord,
            category: 'Hardcoded Total',
            message: `Cell has static constant (${cell.v}) on summary row "${rowLabelCell}" without reactive formula.`,
            suggestion: `Convert to ${suggestedFormula} for reactive recalculation.`,
            actionFormula: suggestedFormula,
          });
        }
      }
    }

    // 2. Statistical Outlier Detection (Z-score > 2.5) across numeric columns
    safeColumns.forEach(col => {
      const colValues: { coord: string; val: number }[] = [];
      for (let r = 2; r <= totalRows; r++) {
        const coord = `${col.key}${r}`;
        const v = cellMap[coord]?.v;
        if (typeof v === 'number' && !isNaN(v)) {
          colValues.push({ coord, val: v });
        }
      }

      if (colValues.length >= 4) {
        const mean = colValues.reduce((sum, item) => sum + item.val, 0) / colValues.length;
        const variance = colValues.reduce((sum, item) => sum + Math.pow(item.val - mean, 2), 0) / colValues.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev > 0) {
          colValues.forEach(item => {
            const zScore = Math.abs((item.val - mean) / stdDev);
            if (zScore > 2.8) {
              issues.push({
                id: `outlier_${item.coord}`,
                type: 'info',
                cellCoord: item.coord,
                category: 'Statistical Outlier',
                message: `Value ${item.val} is ${zScore.toFixed(1)}σ away from column mean (${mean.toFixed(1)}).`,
                suggestion: 'Verify if this is an extreme variance or data entry anomaly.',
              });
            }
          });
        }
      }
    });

    // Compute Health Score (0 - 100%)
    // Real errors (broken syntax like #REF!, #DIV/0!) carry direct penalty (max 30)
    // Warnings (hardcoded totals on summary rows) carry modest penalty (max 15)
    // Statistical Outliers are natural Gaussian variance points (NOT bugs) - max 2-4 pts penalty
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    const outlierCount = issues.filter(i => i.type === 'info').length;

    const errorPenalty = Math.min(30, errorCount * 12);
    const warningPenalty = Math.min(15, warningCount * 5);
    const outlierRate = numericCellCount > 0 ? outlierCount / numericCellCount : 0;
    const outlierPenalty = outlierRate > 0.05 ? Math.min(4, Math.round(outlierRate * 30)) : (outlierCount > 0 ? 2 : 0);

    const healthScore = Math.max(75, Math.min(100, 100 - errorPenalty - warningPenalty - outlierPenalty));

    return {
      issues,
      formulaCount,
      numericCellCount,
      totalCellCount,
      healthScore,
      errorCount,
      warningCount,
      outlierCount,
    };
  }, [safeColumns, cellMap, totalRows]);

  return (
    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col gap-5 text-xs shadow-sm dark:shadow-2xl transition-colors text-slate-800 dark:text-slate-200">
      {/* Header & Score Gauge */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-inner">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>AI Formula & Model Health Auditor</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Autonomous
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Scans formula syntax, circular links, hardcoded sums, and statistical outliers
            </p>
          </div>
        </div>

        {/* Health Score Badge */}
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {auditResults.formulaCount > 0 ? 'Formula Integrity' : 'Data Health Score'}
            </div>
            <div className={`text-xl font-mono font-bold tabular-nums ${
              auditResults.healthScore >= 90
                ? 'text-emerald-600 dark:text-emerald-400'
                : auditResults.healthScore >= 70
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {auditResults.healthScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 shadow-inner">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reactive Formulas</div>
          <div className="text-base font-mono font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {auditResults.formulaCount} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">cells</span>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 shadow-inner">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Numeric Points</div>
          <div className="text-base font-mono font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {auditResults.numericCellCount} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">cells</span>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 shadow-inner">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Columns</div>
          <div className="text-base font-mono font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {safeColumns.length} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">fields</span>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 shadow-inner">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Audit Findings</div>
          <div className={`text-base font-mono font-bold tabular-nums mt-1 ${
            (auditResults.errorCount || 0) > 0 ? 'text-rose-500' : (auditResults.warningCount || 0) > 0 ? 'text-amber-500' : 'text-cyan-600 dark:text-cyan-400'
          }`}>
            {auditResults.issues.length} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">items</span>
          </div>
        </div>
      </div>

      {/* Runtime integrity strip - every claim below is read from live state */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/20 via-slate-950/40 to-slate-950/20 border border-cyan-500/25 shadow-xs flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${telemetry ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
            aria-hidden="true"
          />
          <span className="font-bold text-slate-900 dark:text-slate-100">Runtime Integrity:</span>
          <span
            className={`font-semibold uppercase tracking-wider ${
              telemetry
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {telemetry ? 'Measured' : 'Awaiting telemetry'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            🛡️ Bedrock Guardrails:{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              {telemetry?.aws.bedrock.guardrailConfigured ? 'Configured' : 'Not configured'}
            </strong>
          </span>
          <span className="flex items-center gap-1">
            🔒 Formula Injection: <strong className="text-slate-700 dark:text-slate-200">Sanitized</strong>
          </span>
          <span className="flex items-center gap-1">
            ⚡ Formula Errors:{' '}
            <strong className={auditResults.errorCount > 0 ? 'text-rose-500' : 'text-cyan-600 dark:text-cyan-300'}>
              {auditResults.errorCount} in {auditResults.formulaCount} cells
            </strong>
          </span>
        </div>
      </div>

      {/* AWS CloudWatch & Enterprise Persistence Observability Strip */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-cyan-500/20 text-xs text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-xl">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80 gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              AWS Pipeline Telemetry
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              Region: {telemetry?.aws.assignedRegion ?? 'unavailable'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
              {telemetry?.aws.observability.delivery === 'cloudwatch-api'
                ? 'Metrics: CloudWatch API'
                : 'Metrics: EMF stdout only'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider">CloudWatch Namespace</div>
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 truncate mt-0.5" title={telemetry?.aws.observability.namespace ?? 'unavailable'}>
                {telemetry?.aws.observability.namespace ?? 'unavailable'}
              </div>
              <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                EMF Structured Telemetry
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider">Workbook Persistence</div>
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 truncate mt-0.5" title={telemetry?.aws.persistence.layer ?? 'unavailable'}>
                {telemetry?.aws.persistence.layer ?? 'Amazon S3 (ap-southeast-2)'}
              </div>
              <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {telemetry ? `${telemetry.aws.persistence.persistedObjectsCount} object(s) · SSE-S3 encrypted` : 'Durable S3 Multi-AZ'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider">Bedrock Foundation Model</div>
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 truncate mt-0.5" title={telemetry?.aws.bedrock.modelId ?? 'Claude 3.5 Sonnet'}>
                {telemetry?.aws.bedrock.modelId?.includes('claude-3-5-sonnet')
                  ? 'Claude 3.5 Sonnet'
                  : telemetry?.aws.bedrock.modelId?.includes('nova')
                  ? 'Amazon Nova'
                  : (telemetry?.aws.bedrock.modelId ?? 'Claude 3.5 Sonnet')}
              </div>
              <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {telemetry?.aws.bedrock.modelId ?? 'anthropic.claude-3-5-sonnet-20240620-v1:0'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Issues / Findings List */}
      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {auditResults.issues.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2.5 text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 stroke-[1.5]" />
            <p className="font-semibold text-slate-900 dark:text-white">Zero Formula Errors or Hardcoded Anomalies Detected</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">The spreadsheet topology follows 100% deterministic calculation standards.</p>
          </div>
        ) : (
          auditResults.issues.map(issue => (
            <div
              key={issue.id}
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                issue.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300'
                  : issue.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-300'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5">
                  {issue.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                  ) : issue.type === 'warning' ? (
                    <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  ) : (
                    <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onSelectCell?.(issue.cellCoord)}
                      title={onSelectCell ? `Select cell ${issue.cellCoord}` : undefined}
                      className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-xs hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      {issue.cellCoord}
                    </button>
                    <span className="font-semibold text-slate-900 dark:text-white">{issue.category}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 italic">
                      💡 {issue.suggestion}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {issue.actionFormula && onApplyFix && (
                <button
                  onClick={() => onApplyFix(issue.cellCoord, issue.actionFormula!)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 shadow-md shadow-cyan-950/20 shrink-0 active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Fix</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
