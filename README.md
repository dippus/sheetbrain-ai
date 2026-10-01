# ⚡ SheetBrain AI — Autonomous Multi-Agent Spreadsheet Workspace

> **Transform Natural Language into Living, Formula-Driven Spreadsheets & Visual Dashboards in Seconds.**

🚀 **Live Deployment**: [https://main.ddro9iqx1ajmw.amplifyapp.com](https://main.ddro9iqx1ajmw.amplifyapp.com)

[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock%20deepseek.v3.2-orange.svg)](https://aws.amazon.com/bedrock/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-AWS%20Amplify-success.svg)](https://main.ddro9iqx1ajmw.amplifyapp.com)
[![Univer Office SDK](https://img.shields.io/badge/Univer-Office%20SDK-blue.svg)](https://univer.ai/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 💡 What is SheetBrain AI? (Hum Kya Bana Rahe Hain?)

Most AI tools (like ChatGPT or Claude) only output **dead text or static markdown tables** in a chat box. You cannot click cells, edit numbers, calculate dynamic formulas, or generate interactive charts.

**SheetBrain AI** changes this completely. It is an **autonomous spreadsheet intelligence platform** that takes a plain English prompt (e.g. *"Build a 12-month startup runway forecast with hiring costs and burn rate chart"*) and instantly compiles an **interactive, Excel-grade living spreadsheet with real reactive formulas (`=SUM`, `=GROWTH`, `=IF`) and dynamic charts**.

---

## 🔥 Key Features (Core Highlights)

### 1. 🗣️ Natural Language to Living Spreadsheet
* Describe your financial model, sales tracker, or budget in plain words.
* In under 3 seconds, SheetBrain generates a fully structured spreadsheet populated with industry-accurate benchmark data.

### 2. 🧮 Reactive Formula Engine (Not Hardcoded Numbers)
* Formulas are real mathematical expressions: `=SUM(C2:C10)`, `=AVERAGE(D2:D10)`, `=(B5-B4)/B4`.
* When you change any number in a cell, **all related totals, formulas, and charts dynamically recalculate in real time**.

### 3. 🖥️ Excel-Grade Univer Canvas
* Built on **Univer** ("The Office Harness for AI Agents").
* Full spreadsheet functionality: cell editing, formulas, sorting, formatting, keyboard navigation, and multi-sheet tabs.

### 4. 🔮 "What-If" Scenario Simulation (The Winning Edge)
* Test business hypotheses instantly: *"What if customer acquisition cost increases by 25%?"*
* SheetBrain dynamically stress-tests the spreadsheet, re-evaluates formulas, and highlights affected cells in color-coded Red/Green indicators.

### 5. 📊 Automatic Chart & Analytics Engine
* Automatically selects and renders the most relevant visualization (Bar, Line, Waterfall, or Donut) bound directly to cell ranges.

### 6. 💾 1-Click Export to Microsoft Excel & Google Sheets
* Export generated workbooks directly into native `.xlsx` or `.csv` files with formulas preserved.

---

## 🧠 How It Works (Autonomous Multi-Agent Pipeline)

SheetBrain uses a 4-agent collaborative architecture powered by **Amazon Bedrock (`deepseek.v3.2` on Bedrock Mantle / Sydney `ap-southeast-2`)** and a local deterministic engine:

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                 User Prompt: "BCA Semester 5 Student Gradebook"        │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 🏛️ AGENT 1: Schema Architect                                           │
  │ Models domain taxonomy, column metadata, datatypes, & benchmark rows   │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 🧮 AGENT 2: Formula Compiler                                           │
  │ Synthesizes reactive Excel formulas (=SUM, =IF, =ROUND) & guards       │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 📊 AGENT 3: Visual Analytics Engine                                    │
  │ Auto-selects & binds dynamic charts (Bar / Line / Area) to coordinates │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ ⚡ AGENT 4: Deterministic Math Engine (HyperFormula v3)                 │
  │ Zero-hallucination DAG recalculation & mathematical dependency resolve │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 🖥️ UNIVER SPREADSHEET CANVAS (Browser Client)                           │
  │ Living, editable, reactive spreadsheet ready to use & export to Excel  │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend Framework** | **Next.js 14+ (App Router) + TypeScript** | High-performance React framework with strict typing |
| **Spreadsheet Engine** | **Univer Office SDK** (`@univerjs/core`, `@univerjs/sheets`) | Canvas-based Excel-grade spreadsheet runtime |
| **Styling & UI** | **Tailwind CSS + Lucide Icons** | Modern dark/light mode, sleek glassmorphism studio UI |
| **Charts** | **Recharts + Univer Charts** | Responsive, dynamic business visualizations |
| **Generative AI** | **Amazon Bedrock (deepseek.v3.2 on Bedrock Mantle, ap-southeast-2)** | Semantic reasoning, ontology mapping & multi-agent intent |
| **Formula Engine** | **HyperFormula v3.4.0 (Open-Source DAG Engine)** | Instant (<50ms) reactive dependency graph, IF(), VLOOKUP(), aggregations |
| **Hosting & CI/CD** | **AWS Amplify Hosting (ap-southeast-2)** | Serverless hosting with CloudFront edge distribution |

---

## 👥 Who Is This For? (Target Users)

* **🚀 Startup Founders**: Build 12-month runway models, hiring plans, and cash burn projections in 3 seconds.
* **📈 Sales & Growth Teams**: Track CAC & LTV cohorts, marketing ROAS, and commission calculators.
* **💼 Financial Analysts**: Generate P&L forecasts, DCF valuation models, and sensitivity tables.
* **📋 Product Managers & Educators**: Create sprint velocity boards, student gradebooks, and inventory matrices.

---

## 📂 Project Documentation Quick Links

For complete technical and architectural specifications, see:
* [`AGENTS.md`](./AGENTS.md) — Master Operating Guidelines & Agent Constitution
* [`docs/03_REQUIREMENTS.md`](./docs/03_REQUIREMENTS.md) — Full Requirements Specification
* [`docs/06_ARCHITECTURE.md`](./docs/06_ARCHITECTURE.md) — System Architecture & AWS Integration
* [`docs/07_DATA_MODEL.md`](./docs/07_DATA_MODEL.md) — Data Model & WorkbookJSON Schema
* [`docs/18_TASKS.md`](./docs/18_TASKS.md) — Live Development Task Board
* [`docs/22_AI_DEVELOPMENT_LOG.md`](./docs/22_AI_DEVELOPMENT_LOG.md) — AI Development Milestones Log

---

## 📄 License

This project is open-source and licensed under the [MIT License](./LICENSE).
