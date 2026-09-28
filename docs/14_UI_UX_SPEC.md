# 14 — UI / UX Design Specification

> **Theme**: Industrial-Grade Dark & Light Studio  
> **Traceability**: Fulfills `REQ-F-004`, `REQ-F-005`, `REQ-F-010`.

---

## 1. Visual Hierarchy & Studio Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo] SheetBrain AI     [ Command Bar: "Describe sheet..." ]  [Export]│
├────────────────────────────────────────────────────────────────────────┤
│ Pipeline Pill: (● Schema Architect ──▶ ● Formula Engine ──▶ ● Chart)   │
├─────────────────────────────────────────┬──────────────────────────────┤
│                                         │                              │
│                                         │      DYNAMIC CHART CARD      │
│                                         │   [ Bar / Line / Waterfall ] │
│        UNIVER SPREADSHEET CANVAS        │                              │
│        (70% Viewport Width)             ├──────────────────────────────┤
│                                         │                              │
│  • Formula Bar: [ fx ] [ =SUM(B2:B9) ]  │   WHAT-IF SCENARIO PANEL     │
│  • Interactive Grid                     │  [ Input Hypothesis... ]     │
│  • Tabs: [ Sheet 1 ] [ + ]              │  [ Delta Impact Card ]       │
│                                         │                              │
└─────────────────────────────────────────┴──────────────────────────────┘
```

---

## 2. Color Palette & Typography

* **Dark Mode Canvas**: Deep Slate `#090D16`, Cards `#111827`, Borders `#1F2937`.
* **Accent Colors**: Emerald Green `#10B981` (Positive / Formulas), Amber `#F59E0B` (Warnings), Torii Red `#EF4444` (Critical / Burn).
* **Typography**: Inter / System Sans for interface chrome; Monospace for formula bar and numerical cell alignment.
