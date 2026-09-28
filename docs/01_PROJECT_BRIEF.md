# 01 — Project Brief: SheetBrain AI

> **Document Status**: Baseline Approved  
> **Primary Objective**: Define project scope, boundaries, and measurable success targets.

---

## 1. Executive Summary

**SheetBrain AI** is an autonomous multi-agent spreadsheet intelligence workspace. It bridges generative AI with deterministic spreadsheet computation, enabling users to generate, modify, and stress-test living financial models and business grids through natural language.

Unlike standard LLM chatbots that output static markdown tables, SheetBrain compiles interactive, Excel-compatible workbooks with reactive formulas (`=SUM`, `=AVERAGE`, `=IF`, `=GROWTH`), dynamic visualizations, and hypothesis scenario simulations.

---

## 2. Core Value Proposition

1. **Deterministic Accuracy**: LLMs do not calculate totals; they emit formulas. A local calculation engine and Univer canvas compute results mathematically.
2. **Instant Visual Feedback**: Cell edits immediately propagate to dependent formula cells and live charts.
3. **Hypothesis Stress-Testing**: "What-If" scenario simulation allows users to test assumptions (e.g. *"+20% CAC"*) with instant variance highlighting.
4. **Zero Vendor Lock-In**: 1-click export to native Microsoft Excel (`.xlsx`) and Google Sheets (`.csv`).

---

## 3. Scope Boundaries

### In Scope (MVP):
* Natural language prompt parsing into structured grid topologies.
* Excel-compatible formula generation and syntax validation.
* Univer canvas rendering with keyboard navigation, editing, and sorting.
* Automatic chart selection (Bar, Line, Waterfall) linked to cell ranges.
* What-If simulation engine with delta diff highlighting.
* 1-Click XLSX/CSV export.
* 5 pre-warmed business templates (SaaS Runway, CAC Cohort, Cap Table, Budget, Sprint Velocity).

### Out of Scope (Post-Hackathon):
* Real-time multi-user Google Docs-style collaborative cursor presence.
* Direct SQL database live sync.
* Support for custom VBA macros.
