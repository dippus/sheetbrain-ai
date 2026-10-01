# 18 — Phased Development Task Breakdown

> **Traceability**: All tasks link directly to requirement IDs, deployment specifications, and submission criteria.

---

## Phase 1: Planning & Documentation (Status: COMPLETED & SIGNED OFF ✅)
- [x] Create standardized documentation structure in `docs/`
- [x] Formulate traceable Functional & Non-Functional Requirements (`03_REQUIREMENTS.md`)
- [x] Formulate AWS Deployment & Production Hosting Plan (`23_DEPLOYMENT.md`)
- [x] Formulate Hackathon Evidence Register (`19_EVIDENCE.md`)
- [x] Formulate Final Pass/Fail Submission Checklist (`21_SUBMISSION_CHECKLIST.md`)
- [x] Create comprehensive `AGENTS.md` operating constitution
- [x] Human user review and sign-off on documentation phase (Approved Sep 28, 2026)

---

## Phase 2: Project Scaffold & Ship Gate Live Deployment (Day 1 — NEXT TO EXECUTE 🚀)
- [x] Scaffold Next.js 14 App Router project with TypeScript & Tailwind CSS (`REQ-NF-004`)
- [x] Configure modular Univer Office SDK packages (`REQ-F-004`)
- [x] Implement client-side dynamic `UniverSheet` wrapper with SSR protection (`REQ-NF-004`)
- [x] Configure `amplify.yml` build pipeline (`23_DEPLOYMENT.md`)
- [x] Verify live public HTTPS URL on AWS (PASS SHIP GATE — CLEARED ON AMPLIFY ✅)

---

## Phase 3: Hybrid Multi-Agent Pipeline & Bedrock Integration (Day 2 — COMPLETED ✅)
- [x] Implement AWS Bedrock client in serverless route handler (`REQ-NF-003`)
- [x] Implement Agent 1 (Schema Architect) JSON contract (`REQ-F-001`)
- [x] Implement Agent 2 (Formula Compiler) with circular-dependency guardrails (`REQ-F-002`)
- [x] Implement custom TypeScript deterministic local formula engine (`REQ-NF-005`)
- [x] Connect Studio command bar to generation pipeline with visual status pill (`REQ-F-010`)

---

## Phase 4: What-If Simulation, Charts & Polish (Day 3 — COMPLETED ✅)
- [x] Implement Agent 4 (What-If Simulation Engine) with delta highlighting (`REQ-F-007`)
- [x] Implement Agent 3 (Visual Analytics) with dynamic Recharts cards (`REQ-F-008`)
- [x] Implement native `.xlsx` & `.csv` export utility (`REQ-F-006`)
- [x] Integrate 5 pre-warmed golden templates (`REQ-F-009`)

---

## Phase 5: Submission Artifacts, Evidence & Verification (Day 4 — IN PROGRESS 🚀)
- [x] Capture visual evidence and populate register (`19_EVIDENCE.md`)
- [x] Execute complete end-to-end automated test suite (12/12 passing in `scripts/test-suite.mjs`)
- [x] Verify all gates in `21_SUBMISSION_CHECKLIST.md` (Gate 1 & Gate 2 Cleared ✅)
- [ ] Record 2-minute demo video following `20_DEMO_SCRIPT.md`
- [ ] Publish project submission story on builder.aws.com and submit before deadline

---

## Phase 6: Dark OLED Fintech Refactor, Zero Any & Governance Polish (COMPLETED ✅)
- [x] Zero-AI-Slop Dark OLED Fintech Design System across all views (`REQ-NF-001`)
- [x] Zero `any` strict TypeScript audit across all source files (`REQ-NF-004`)
- [x] Recharts hydration mismatch guards & Univer SSR protection (`REQ-NF-004`)
- [x] Formula injection prevention & deterministic local hybrid calculation (`REQ-F-002`, `REQ-NF-005`)
- [x] 1-Click Instant Demo Mode with 3 pre-warmed competition scenarios (`REQ-F-009`)
- [x] Boardroom Executive Summary & C-Suite Governance Findings export modal (`REQ-F-006`)
- [x] Build and typecheck verification cleanly passing with 0 errors (`npm run typecheck`)

---

## Phase 7: Full-App Dual-Theme Token Unification & Production Sweep (COMPLETED ✅)
- [x] Comprehensive Light Mode + Dark Mode Dual-Theme Contract unification across all pages and views (`REQ-NF-001`)
- [x] Canvas Base Background adaptation (`bg-slate-50` / `dark:bg-slate-950`)
- [x] L1 Card & Panel glassmorphism adaptation (`bg-white/80 border-slate-200/80` / `dark:bg-slate-900/60 dark:border-slate-800/80`)
- [x] L2 Interactive buttons and hover states adaptation (`hover:bg-slate-100 text-slate-800` / `dark:hover:bg-slate-800/90 dark:text-slate-100`)
- [x] Scenario Matrix View dual-theme refactor (`ScenarioMatrixView.tsx`)
- [x] Executive Report View dual-theme refactor (`ExecutiveReportView.tsx`)
- [x] Visual Analytics Recharts tooltips & axis dual-theme refactor (`VisualAnalyticsView.tsx`)
- [x] Formula Auditor telemetry & AWS CloudWatch logs dual-theme refactor (`FormulaAuditor.tsx`)
- [x] Plain-English AI Formula Explainer modal dual-theme refactor (`FormulaExplainerModal.tsx`)
- [x] Univer Floating Diff Banner & Audit Drawer dual-theme refactor (`UniverSheetWrapper.tsx`)
- [x] Univer Spreadsheet Canvas modified-cell dual-theme highlights (`UniverSheetCore.tsx`)
- [x] Top Studio Header, View Switcher, AI Prompt bar, and Shortcuts/Boardroom Modals dual-theme refactor (`page.tsx`)
- [x] Multi-Agent Pipeline Indicator bar dual-theme refactor (`AgentPipelineBar.tsx`)
- [x] TypeScript strict typecheck validation passing with 0 errors (`npx tsc --noEmit`)
