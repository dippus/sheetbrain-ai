# 16 — Error Handling Strategy & Resilience Architecture

> **Document Status**: Approved & Implemented ✅  
> **Traceability**: Fulfills `REQ-NF-003` (Graceful Degradation), `REQ-NF-004` (SSR Protection), and `REQ-NF-007` (Observability).

---

## 1. Client-Side Error Handling
* **React Error Boundary**: The workspace is wrapped in a dedicated `StudioErrorBoundary` preventing white-screen freezes if third-party Canvas or SVG rendering encounters an exception.
* **Non-Blocking Toasts**: Handled errors surface via snappy 3-second animated UI toast alerts (`showToast`), preventing modal deadlocks.
* **State Recovery**: 1-click Undo preserves previous workbook states in LocalStorage (`sheetbrain_wb_*`), preventing user data loss on accidental sheet deletion.

## 2. Server-Side Error Handling
* **Next.js API Route Guardians**: All server route handlers (`/api/generate`, `/api/simulate`, `/api/storage`) are wrapped in asynchronous `try/catch` handlers with normalized JSON error responses `{ success: false, error: string, source: 'error' }` returning proper HTTP 400/500 status codes.
* **Input Sanitization**: Pre-flight validation rejects nonsense prompts, greetings, and OWASP formula injection prefixes (`=cmd|`, `@`, `+`, `-`).

## 3. AI Agent Error Handling
* **Bedrock Timeout Trapping**: Cloud model calls to Bedrock (`anthropic.claude-3-5-sonnet`) feature a 5000ms timeout trap.
* **Autonomous Fallback Execution**: When network timeouts, quota limits, or credential errors occur, the orchestrator seamlessly routes execution to the local deterministic multi-agent synthesizer with zero UI interruption.

## 4. Fallback Mechanisms (Neuro-Symbolic Hybrid Engine)
* **HyperFormula Deterministic Safety Net**: In all operational modes, formula recalculation is delegated to the local HyperFormula v3.4.0 engine.
* **CloudWatch EMF Alerting**: Every fallback event emits an Embedded Metric Format (EMF) log with `FallbackCount: 1`, providing instant observability in the AWS CloudWatch console.
