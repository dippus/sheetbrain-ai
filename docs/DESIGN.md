# SheetBrain AI — Design Contract (DESIGN.md)

> Standardized design specification based on `avoid-ai-design` and `ui-ux-pro-max-skill`.

---

## 1. Intentional Direction: Precision Financial Data Terminal
* **Subject**: Autonomous Multi-Agent Spreadsheet & Business Intelligence Workspace.
* **Vernacular**: Wall Street financial models, Bloomberg Terminals, Excel/Google Sheets grids, Linear engineering precision.
* **Anti-Slop Invariants**:
  - ZERO purple or indigo gradients.
  - ZERO floating generic rounded cards.
  - ZERO emoji inside interface buttons.
  - ZERO generic `Sparkles` glyphs.

---

## 2. Typography Contract
* **UI Controls & Labels**: `Inter` (`font-sans`), weights: 400 (regular), 500 (medium), 600 (semibold).
* **Data Cells, Formulas & References**: `JetBrains Mono` (`font-mono`) with `tabular-nums` (`font-variant-numeric: tabular-nums`).
* **Strict Alignment Rules**:
  - String Text / Labels: `text-left`
  - Numbers / Currency / Percentages: `text-right` with `tabular-nums font-mono`
  - Badges / Delta tags / Row indices: `text-center`

---

## 3. Surface & Color Palette
* **Canvas Ground (L0)**: `#070A12` (Deep Charcoal Slate)
* **Surface Containers (L1)**: `#0C1220` with 1px border `#1E293B`
* **Interactive Elements (L2)**: `#1B2438` on hover `#26334D`
* **Text Hierarchy**:
  - Primary text: `#F8FAFC`
  - Secondary text: `#94A3B8`
  - Muted / Chromatic labels: `#64748B`
* **Semantic Signals**:
  - Positive Variance / Margins: `#10B981` (Emerald), Tint: `rgba(16, 185, 129, 0.12)`
  - Negative Variance / Costs: `#F43F5E` (Rose), Tint: `rgba(244, 63, 94, 0.12)`
  - Active Simulation / Hypothesis: `#F59E0B` (Amber), Tint: `rgba(245, 158, 11, 0.12)`
  - Telemetry / AWS Cloud: `#38BDF8` (Sky)

---

## 4. Spacing & Density
* Table row height: Dense 28px–32px.
* Formula bar height: 36px.
* Header toolbar: 44px compact height.
