# ⚡ SheetBrain AI — Autonomous Multi-Agent Spreadsheet Workspace

> **Transform Natural Language into Living, Formula-Driven Spreadsheets & Visual Dashboards in Seconds.**

[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock%20Claude%203.5-orange.svg)](https://aws.amazon.com/bedrock/)
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

SheetBrain uses a 4-agent collaborative architecture powered by **Amazon Bedrock (Claude 3.5 Sonnet)** and a local deterministic engine:

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                 User Prompt: "12-Month SaaS Financial Runway"          │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 🏛️ AGENT 1: Schema Architect                                           │
  │ Plans column structure, headers, data types (Currency, %), & seed rows │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 🧮 AGENT 2: Formula Compiler                                           │
  │ Injects standard Excel formulas (=SUM, =IF) & guards against #REF!     │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 📊 AGENT 3: Visual Analytics Engine                                    │
  │ Auto-selects & binds dynamic charts (Bar / Line / Waterfall) to cells  │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 🖥️ UNIVER SPREADSHEET CANVAS (Browser Client)                           │
  │ Living, editable, reactive spreadsheet ready to use & export           │
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
| **Generative AI** | **Amazon Bedrock (Claude 3.5 Sonnet)** | Semantic reasoning, ontology mapping & multi-agent intent |
| **Formula Engine** | **Custom TypeScript Deterministic Engine** | Instant (<100ms) formula evaluation & syntax validation |
| **Hosting & CI/CD** | **AWS Amplify** | Serverless hosting with global edge CDN |

---

## 👥 Who Is This For? (Target Users)

* **🚀 Startup Founders**: Build 12-month runway models, hiring plans, and cash burn projections in 3 seconds.
* **📈 Sales & Growth Teams**: Track CAC & LTV cohorts, marketing ROAS, and commission calculators.
* **💼 Financial Analysts**: Generate P&L forecasts, DCF valuation models, and sensitivity tables.
* **📋 Product Managers**: Create sprint velocity trackers, capacity planners, and feature prioritization matrices.

---

## 📂 Project Documentation Quick Links

For complete technical and architectural specifications, see:
* [`AGENTS.md`](./AGENTS.md) — Master Operating Guidelines & Agent Constitution
* [`PRD.md`](./PRD.md) — Full Product Requirements Document
* [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System Architecture & AWS Integration Specs
* [`AGENT_PROMPTS.md`](./AGENT_PROMPTS.md) — Multi-Agent System Prompts & JSON Contracts
* [`TASK_BOARD.md`](./TASK_BOARD.md) — Live Development Progress Tracker
* [`HACKATHON_RULES.md`](./HACKATHON_RULES.md) — Scoring Rubrics & Demo Video Formula

---

## 📄 License

This project is open-source and licensed under the [MIT License](./LICENSE).
