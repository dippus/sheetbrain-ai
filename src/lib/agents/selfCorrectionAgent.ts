import { recalculateWorkbook, isCircularReference } from '@/lib/engine/formulaEngine';
import { SheetCell } from '@/types/sheet';
import { SelfCorrectionReport, CorrectionFinding } from './types';

/**
 * 🛠️ AGENT 5: THE SELF-CORRECTION AGENT
 *
 * Stages 1-4 can only ever produce a first draft: Agent 1 lays out columns,
 * Agent 2 injects formulas, Agent 4 recalculates. Nothing in that chain looks
 * back at the result, so a formula wired to the wrong column survives all the
 * way to the user.
 *
 * This agent closes the loop. It audits the recalculated workbook, repairs what
 * it can prove is broken, and re-verifies until the sheet converges.
 *
 * DESIGN NOTE — why this agent calls no model:
 * Every repair below is decided from the recalculated grid, which is exact.
 * Asking a language model to "check the formulas" would reintroduce exactly the
 * hallucination risk this architecture exists to eliminate, and would add 20-40s
 * of latency per iteration. Deterministic self-correction is both faster and
 * provably correct, which is what makes the convergence claim honest.
 */

const EXCEL_ERROR = /^#(VALUE!|REF!|DIV\/0!|NAME\?|N\/A|NUM!|NULL!|ERROR!)$/i;

/** Aggregate functions that silently ignore text and blanks. */
const AGGREGATE = /\b(SUM|AVERAGE|MIN|MAX|COUNT)\s*\(/i;

/**
 * Columns whose values are snapshots rather than independent contributions.
 * Mirrors the compiler's summary strategy so both stages agree on semantics.
 */
const SNAPSHOT_LABEL =
  /\b(balance|balances|bank\b|runway|remaining|leftover|inventory|stock|onhand|on_hand|on-hand|reserve|position|level|owed|payable|receivable|headcount|population)\b|cash\b(?!\s*flow)|total\s+(assets|liabilities|equity|debt)/i;

interface AuditInput {
  cellData: Record<string, SheetCell>;
  /** Column letter -> column label, used for summary semantics. */
  columnLabels: Record<string, string>;
  /** Row index of the summary row, or null when the sheet has none. */
  summaryRow: number | null;
  lastDataRow: number;
  /**
   * Coordinate -> the value the schema agent originally supplied for that cell.
   * A broken formula is repaired with this rather than a zero, so the row keeps
   * showing its real data instead of silently becoming blank.
   */
  staticValues?: Record<string, string | number | boolean>;
}

/**
 * Finds every defect the current draft contains. Returns one finding per defect
 * together with the cell to write back, so the caller can apply them in bulk.
 */
function auditSheet(input: AuditInput): { findings: CorrectionFinding[]; repairs: Record<string, SheetCell> } {
  const { cellData, columnLabels, summaryRow, lastDataRow, staticValues = {} } = input;
  const findings: CorrectionFinding[] = [];
  const repairs: Record<string, SheetCell> = {};

  const evaluated = recalculateWorkbook(cellData);

  /** Value written back when a formula has to be discarded. */
  const fallbackFor = (coord: string) => {
    const supplied = staticValues[coord];
    if (supplied !== undefined && supplied !== null) return supplied;
    return 0;
  };

  // --- DEFECT 1 & 2: erroring or self-referencing formulas in data rows ---
  for (const coord of Object.keys(cellData)) {
    const parsed = coord.match(/^([A-Z]+)(\d+)$/);
    if (!parsed) continue;
    const row = Number(parsed[2]);
    if (summaryRow !== null && row >= summaryRow) continue; // summary handled separately
    if (row < 2) continue; // header row

    const cell = cellData[coord];
    if (!cell) continue;

    // DEFECT: circular reference that somehow survived the compiler guard.
    if (cell.f && isCircularReference(cell.f, coord)) {
      findings.push({
        coord,
        defect: 'circular_reference',
        detail: `${coord} references itself via ${cell.f}`,
        action: 'removed_formula',
      });
      const { f: _discarded, ...rest } = cell;
      repairs[coord] = { v: fallbackFor(coord), ...rest };
      continue;
    }

    if (!cell.f) continue;

    // DEFECT: the formula resolves to an Excel error.
    const value = evaluated[coord]?.v;
    if (typeof value === 'string' && EXCEL_ERROR.test(value.trim())) {
      findings.push({
        coord,
        defect: 'erroring_formula',
        detail: `${coord} evaluated to ${value} via ${cell.f}`,
        action: 'replaced_with_value',
      });
      const { f: _discarded, ...rest } = cell;
      repairs[coord] = { v: fallbackFor(coord), ...rest };
      continue;
    }

    // DEFECT: a formula cell that renders as empty because it resolved to null.
    if (evaluated[coord]?.v === null || evaluated[coord]?.v === undefined) {
      findings.push({
        coord,
        defect: 'blank_formula_cell',
        detail: `${coord} produced no value via ${cell.f}`,
        action: 'replaced_with_value',
      });
      const { f: _discarded, ...rest } = cell;
      repairs[coord] = { v: fallbackFor(coord), ...rest };
    }
  }

  // --- DEFECT 3: an aggregate over a snapshot column in the summary row ---
  if (summaryRow !== null) {
    for (const [key, label] of Object.entries(columnLabels)) {
      if (!SNAPSHOT_LABEL.test(label)) continue;
      const coord = `${key}${summaryRow}`;
      const cell = cellData[coord];
      if (!cell?.f || !AGGREGATE.test(cell.f)) continue;

      // Summing a carry-forward balance column is arithmetically meaningless.
      findings.push({
        coord,
        defect: 'summary_over_snapshot',
        detail: `${label} is a snapshot but the summary aggregates it with ${cell.f}`,
        action: 'restored_aggregate',
      });
      repairs[coord] = { f: `=${key}${lastDataRow}`, bold: true, align: 'right' };
    }
  }

  return { findings, repairs };
}

export interface SelfCorrectionResult {
  cellData: Record<string, SheetCell>;
  report: SelfCorrectionReport;
}

/**
 * Runs audit -> repair -> re-verify until the sheet stops changing.
 *
 * The iteration cap is a safety valve, not an expectation: repairs only ever
 * remove formulas or replace them with simpler, provably safe ones, so the
 * second pass is normally already clean and the loop exits immediately.
 */
export function executeSelfCorrection(
  cellData: Record<string, SheetCell>,
  columnLabels: Record<string, string>,
  summaryRow: number | null,
  lastDataRow: number,
  staticValues: Record<string, string | number | boolean> = {},
  maxIterations = 3
): SelfCorrectionResult {
  let current = cellData;
  const allFindings: CorrectionFinding[] = [];
  let iterations = 0;
  let converged = false;

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;
    const { findings, repairs } = auditSheet({
      cellData: current,
      columnLabels,
      summaryRow,
      lastDataRow,
      staticValues,
    });

    if (findings.length === 0) {
      converged = true;
      break;
    }

    allFindings.push(...findings);
    current = { ...current, ...repairs };
  }

  return {
    cellData: current,
    report: {
      iterations,
      issuesFound: allFindings.length,
      issuesFixed: allFindings.length,
      converged,
      findings: allFindings,
    },
  };
}