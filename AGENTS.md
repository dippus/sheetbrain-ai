# 🧠 SheetBrain AI — Agent Operating Constitution (AGENTS.md)

> **MANDATORY NOTICE FOR ALL AI CODING AGENTS (Gemini, Claude, GPT, Cursor, Antigravity):**
> This file is your HIGHEST-PRIORITY instruction set. You MUST read this file in full before proposing, generating, or modifying any code in this repository. No exceptions.

---

## 1. How to Read Project Documentation

Before writing any code or modifying existing files:
1. Review [`docs/21_TASKS.md`](./docs/21_TASKS.md) to identify the currently active task.
2. Cross-reference the task with the relevant specifications in [`docs/03_REQUIREMENTS.md`](./docs/03_REQUIREMENTS.md) and [`docs/06_ARCHITECTURE.md`](./docs/06_ARCHITECTURE.md).
3. Check [`docs/18_DECISIONS.md`](./docs/18_DECISIONS.md) to ensure your implementation aligns with approved Architectural Decision Records (ADRs).
4. If a requirement is marked `TBD` or `NEEDS DECISION`, DO NOT assume or invent functionality. Ask the human user for clarification first.

---

## 2. Planning Before Implementation

* **No Blind Coding**: Always outline your intended plan, files to touch, and potential failure modes before making multi-file modifications.
* **Strict Scope Control**: Implement ONLY the task specified in `docs/21_TASKS.md`. Do NOT refactor unrelated code or perform unsolicited redesigns.
* **Preserve Traceability**: In your implementation descriptions and commits, explicitly reference requirement IDs (e.g. *"Implements REQ-F-002"*).

---

## 3. Existing-Code Inspection Protocol

* **Inspect Before Editing**: Always view the file contents first to understand existing imports, styles, and patterns. Never replace entire files when a surgical edit suffices.
* **Respect Existing Architecture**: Do not rename exported types, services, or component props without explicit prior approval.

---

## 4. Architecture Protection & Invariants

1. **Univer Next.js SSR Protection (STRICT INVARIANT)**:
   * Univer utilizes browser Canvas and DOM APIs. It MUST ALWAYS be imported dynamically with `ssr: false` in Next.js App Router:
     ```tsx
     import dynamic from 'next/dynamic';
     const UniverSheet = dynamic(() => import('./UniverSheetCore'), { ssr: false });
     ```
   * Never import Univer packages directly inside Server Components or root layout files.
2. **Deterministic Formula Separation**:
   * Generative models (Bedrock) emit formula syntax (e.g. `=SUM(B2:B9)`). The client-side Univer engine computes numeric results. Never hardcode numeric sums into calculated cells.
3. **Hybrid Engine Fallback**:
   * Every server-side AI route must include a fallback to the local deterministic TypeScript engine to prevent UI freezes if cloud quotas or network timeouts occur.

---

## 5. Dependency Rules

* Do NOT install new external npm packages without documented justification in `docs/18_DECISIONS.md`.
* Maintain exact package compatibility with Next.js 14 and React 18/19.

---

## 6. Code Quality & Standards

* **Language**: TypeScript with `strict: true`.
* **Zero 'any' Types**: Always define explicit interfaces or use schemas from `docs/07_DATA_MODEL.md`.
* **Typecheck Verification**: Run `tsc --noEmit` before declaring any coding step complete.

---

## 7. Security Rules (Zero-Tolerance)

* **No Hardcoded Credentials**: NEVER commit AWS Access Keys, Secret Keys, or API tokens into source code, configs, or commit logs.
* **Server-Side AI Calls**: All Bedrock SDK invocations must execute exclusively within server-side route handlers (`/src/app/api/*`). The client must never hold cloud credentials.
* **Input Sanitization**: Strip dangerous formula injection prefixes from raw text inputs.

---

## 8. Testing & Verification Requirements

* Verify that the Next.js production build compiles cleanly (`npm run build`).
* Ensure no hydration mismatch warnings appear in browser console.
* Test guest access flow to ensure zero login blockers exist.

---

## 9. File Modification & Git Discipline

* Make focused, atomic changes.
* Never delete documentation or history logs.
* Log all architectural and implementation milestones in `docs/22_AI_DEVELOPMENT_LOG.md`.

---

## 10. When the Agent Must Ask for Human Approval

The agent MUST pause and ask the human user for approval if:
1. A new external service or dependency is being introduced.
2. An architectural decision marked `NEEDS DECISION` is required.
3. A breaking change to `WorkbookJSON` or API schemas is proposed.
4. AWS credentials, billing, or region configurations are being altered.

---

## 11. How to Report Completed Work

Upon completing any task:
1. State the exact task ID completed from `docs/21_TASKS.md`.
2. List all modified and created files with clickable markdown links.
3. Provide verification results (e.g. `tsc --noEmit` passing, build status).
4. State the recommended next task for human approval.
