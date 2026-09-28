# 03 — Requirements Specification (Traceable REQ Register)

> **Document Status**: Baseline Approved  
> **Convention**: All requirements carry unique identifiers for downstream traceability.

---

## 1. Functional Requirements (FR)

| REQ ID | Title | Description | Priority |
|:---|:---|:---|:---:|
| **REQ-F-001** | Prompt to Workbook Generation | System must accept natural language text input and generate a structured multi-column spreadsheet with headers, data types, and seed data. | P0 |
| **REQ-F-002** | Living Formula Engine | System must generate valid, uppercase spreadsheet formulas (`=SUM()`, `=AVERAGE()`, `=IF()`, `=GROWTH()`) instead of static numbers for calculated cells. | P0 |
| **REQ-F-003** | Reactive Recalculation | Modifying an input cell in the grid must trigger automatic recalculation of all dependent formula cells. | P0 |
| **REQ-F-004** | Univer Canvas Integration | The UI must embed the Univer spreadsheet canvas supporting cell selection, keyboard navigation, cell styling, and tab switching. | P0 |
| **REQ-F-005** | Guest Access (Zero Friction) | System must allow instant guest usage without mandatory login barriers. | P0 |
| **REQ-F-006** | 1-Click Workbook Export | System must allow users to export the active workbook to native `.xlsx` and `.csv` formats. | P1 |
| **REQ-F-007** | What-If Scenario Simulation | Users can submit hypotheses (e.g. *"Increase costs by 15%"*); the system calculates deltas and highlights modified cells. | P1 |
| **REQ-F-008** | Dynamic Chart Generation | System must automatically select and render visual charts (Bar, Line, Waterfall) bound to designated cell ranges. | P1 |
| **REQ-F-009** | Pre-Warmed Template Showcase | System must provide 5 pre-built business templates accessible in 1 click. | P1 |
| **REQ-F-010** | Execution Status Feedback | System must display a visual multi-agent status indicator showing progress through generation phases. | P1 |

---

## 2. Non-Functional Requirements (NFR)

| REQ ID | Category | Metric / Specification | Priority |
|:---|:---|:---|:---:|
| **REQ-NF-001** | Performance | Pre-warmed templates must load in `< 500ms`. Full AI generation must complete in `< 4.0s`. | P0 |
| **REQ-NF-002** | Formula Safety | Zero circular dependencies (`#REF!`) or unhandled divide-by-zero errors (`#DIV/0!`) in generated formulas. | P0 |
| **REQ-NF-003** | Security | Zero hardcoded API keys or cloud credentials in source code. Client must not hold AWS credentials. | P0 |
| **REQ-NF-004** | SSR Safety | Univer canvas must be imported dynamically on client side to prevent `window is not defined` build failures. | P0 |
| **REQ-NF-005** | Reliability | System must have a local deterministic fallback engine to guarantee response if cloud LLM encounters rate limits. | P0 |
| **REQ-NF-006** | Responsiveness | Studio layout must support desktop and tablet viewports without breaking UI controls. | P1 |
| **REQ-NF-007** | Observability | System must log generation latency, token metrics, and error rates to CloudWatch. | P1 |
