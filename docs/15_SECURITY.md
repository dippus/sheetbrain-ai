# 15 — Security & Compliance Specification

> **Traceability**: Enforces `REQ-NF-003` (Zero Credential Leakage).
> **Document Status**: Verified against implementation on 2026-10-01. Every control below is implemented in source.

---

## 1. Threat Modeling & Safeguards

| Threat | Risk Level | Mitigation Strategy | Implementation |
|:---|:---:|:---|:---|
| **Hardcoded AWS Credentials** | CRITICAL | Credentials loaded exclusively via server-side environment variables or AWS Amplify managed IAM roles. Zero secrets committed to Git. | `.env.example` ships fully commented-out placeholders; all Bedrock/S3 calls live in server-only route handlers under `src/lib/aws/` and `src/app/api/`. |
| **Path Traversal** | HIGH | Whitelist filename validation plus resolved-path containment before any filesystem read. | `isSafeFileName()` and `safeResolveWithin()` in `src/app/api/local-data/route.ts` reject directory separators, `..` sequences, absolute paths, and null bytes. |
| **Credential / Infrastructure Metadata Leakage** | HIGH | Unauthenticated public endpoints must not disclose credential state, bucket names, or account identifiers. | `/api/health` returns liveness only. `/api/observability` redacts `bedrock` auth state (`redacted: true`) and the S3 bucket (`bucketNameRedacted: true`). |
| **Formula Injection (CSV Injection)** | MEDIUM | Dangerous shell-prefix strings are stripped from raw text cell values before evaluation. | `sanitizeCellValue()` in `src/lib/engine/formulaEngine.ts` strips `=`/`@`/`+`/`-` prefixes preceding OS command interpreters (`cmd`, `powershell`, `curl`, `mshta`, etc.). |
| **Adversarial Prompt Injection & Jailbreak** | HIGH | Multi-pattern regex heuristic blocks instruction overrides, system prompt extractions, DAN/jailbreak personas, and null bytes before model invocation. | `detectPromptInjection()` in `src/lib/security/securityGuard.ts` guards `/api/generate`, `/api/edit`, and `/api/simulate` with automatic HTTP 400 rejection and CloudWatch logging. |
| **Denial of Service / Quota Burn (Rate Limiting)** | HIGH | In-memory sliding window rate limiter throttles burst requests per client IP with automatic TTL garbage collection. | `checkRateLimit()` in `src/lib/security/securityGuard.ts` enforces 30 req/min for AI operations and 60 req/min for storage with standardized HTTP 429 and `Retry-After` headers. |
| **Cross-Origin Exploitation (CSRF)** | MEDIUM | State-changing API endpoints validate Origin and Referer headers against trusted origins. | `isAllowedOrigin()` in `src/lib/security/securityGuard.ts` strictly permits localhost and `*.amplifyapp.com` while rejecting unauthorized cross-origin POST requests. |
| **Autonomous Agent Sandboxing (Plan vs Execute)** | HIGH | LLMs are strictly forbidden from writing directly to cells or grid state; models produce only typed operation plans validated by deterministic engines. | `planEditDeterministically()` and `applyEditPlan()` in `src/lib/engine/editApplier.ts` validate coordinate bounds, datatypes, and formula syntax trees before writing. |

---

## 2. Third-Party Licensing Note

The deterministic calculation engine uses [HyperFormula](https://handsontable.github.io/hyperformula/) under its **GPLv3** license (`licenseKey: 'gpl-v3'` in `src/lib/engine/formulaEngine.ts`), while the SheetBrain AI project source is released under the **MIT License** (see [`LICENSE`](../LICENSE)).

These are compatible for this hackathon submission: HyperFormula is consumed as an unmodified external npm dependency, and the project itself is original work.

---

## 3. Error Handling & Resilience

Error categorization, detection points, and fallback behaviour are specified in [`16_ERROR_HANDLING.md`](./16_ERROR_HANDLING.md).
