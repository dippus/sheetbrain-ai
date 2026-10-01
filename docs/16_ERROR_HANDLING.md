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
* **Bedrock Timeout Trapping**: Every cloud model call to Amazon Bedrock (`deepseek.v3.2` on Bedrock Mantle / Sydney `ap-southeast-2`, configurable via `BEDROCK_MODEL_ID`) is wrapped in an `AbortSignal.timeout` trap. On timeout, quota exhaustion, or malformed response, the call resolves to a safe fallback rather than throwing.
* **Autonomous Fallback Execution**: When network timeouts, quota limits, or credential errors occur, the orchestrator seamlessly routes execution to the local deterministic multi-agent synthesizer with zero UI interruption.

## 4. Formula Error Reporting
* **Explicit Error Surface**: Formula failures are surfaced to the user as standard spreadsheet error literals (`#VALUE!`, `#REF!`, `#DIV/0!`) rendered directly in the affected cell rather than being silently coerced to zero. A wrong zero is more dangerous to a financial model than a visible error.
* **Circular Reference Guard**: `isCircularReference()` in `src/lib/engine/formulaEngine.ts` tokenizes formulas and parses each referenced coordinate, rejecting genuine self-references while correctly permitting legitimate near-matches (e.g. `=SUM(B20:B29)` inside cell `B2`).

## 5. Fallback Mechanisms (Neuro-Symbolic Hybrid Engine)
* **HyperFormula Deterministic Safety Net**: In all operational modes, formula recalculation is delegated to the local HyperFormula v3.4.0 engine, which resolves multi-level dependency chains via topological sorting.
* **CloudWatch EMF Alerting**: Every fallback event emits an Embedded Metric Format (EMF) log with `FallbackCount: 1`, providing instant observability in the AWS CloudWatch console under the `SheetBrainAI/Metrics` namespace.
* **Real Telemetry**: `getLatencyPercentiles()` in `src/lib/aws/cloudwatch.ts` samples actual observed latencies, so `/api/observability` reports measured p50/p95/p99 values rather than static placeholders.
