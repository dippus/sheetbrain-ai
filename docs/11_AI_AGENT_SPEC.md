# 11 — Multi-Agent System Specification

> **Traceability**: Implements `REQ-F-001`, `REQ-F-002`, `REQ-F-007`, `REQ-F-008`.

---

## 1. Agent Topology & Responsibilities

SheetBrain AI employs 4 specialized autonomous agent roles:

```
                ┌───────────────────────────────────┐
                │          USER PROMPT              │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                ┌───────────────────────────────────┐
                │ 🏛️ AGENT 1: Schema Architect       │
                │ Parses domain, headers & datatypes │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                ┌───────────────────────────────────┐
                │ 🧮 AGENT 2: Formula Compiler       │
                │ Injects math & formulas (=SUM, IF) │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                ┌───────────────────────────────────┐
                │ 📊 AGENT 3: Visual Analytics      │
                │ Binds charts to numerical ranges  │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                ┌───────────────────────────────────┐
                │ 🔮 AGENT 4: What-If Simulator     │
                │ (Invoked on scenario hypothesis)  │
                └───────────────────────────────────┘
```

---

## 2. Agent Specifications

### Agent 1: The Schema Architect
* **Purpose**: Deconstructs ambiguous user intent into structured column definitions and seed benchmark rows.
* **Input**: User natural language prompt string.
* **Output**: JSON containing column metadata and raw data rows.

### Agent 2: The Formula Compiler
* **Purpose**: Determines mathematical relationships and writes uppercase Excel formulas.
* **Input**: Column definitions and row structures from Agent 1.
* **Output**: Coordinate-to-formula mappings (e.g. `{"D10": "=SUM(D2:D9)"}`).

### Agent 3: The Visual Analytics Engine
* **Purpose**: Identifies the primary narrative of the data and selects the optimal chart configuration.
* **Input**: Complete populated workbook metadata.
* **Output**: Chart specification JSON.

### Agent 4: The What-If Simulator
* **Purpose**: Analyzes sensitivity hypotheses, modifies driver cells, recalculates models, and produces variance deltas.
* **Input**: Active workbook snapshot + user scenario hypothesis string.
* **Output**: Scenario delta summary with color-coded severity tags.
