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
| **Prompt Injection / Oversized Payload** | MEDIUM | Strict input bounding before any model invocation, plus strict JSON schema validation of model responses. | `MAX_PROMPT_LENGTH` (500 chars) in `/api/generate` and `MAX_HYPOTHESIS_LENGTH` (500 chars) in `/api/simulate`; greetings/garbage rejection; every agent validates response shape before use. |
| **Denial of Service / Quota Burn** | MEDIUM | Model calls are bounded by hard `AbortSignal.timeout(5000)` traps, and pre-warmed golden templates serve instant results without any model invocation. | `invokeBedrockAgent()` in `src/lib/aws/bedrock.ts` applies a 5000ms timeout to every transport path. 5 pre-warmed templates in `src/lib/templates/goldenTemplates.ts`. |

---

## 2. Third-Party Licensing Note

The deterministic calculation engine uses [HyperFormula](https://handsontable.github.io/hyperformula/) under its **GPLv3** license (`licenseKey: 'gpl-v3'` in `src/lib/engine/formulaEngine.ts`), while the SheetBrain AI project source is released under the **MIT License** (see [`LICENSE`](../LICENSE)).

These are compatible for this hackathon submission: HyperFormula is consumed as an unmodified external npm dependency, and the project itself is original work.

---

## 3. Error Handling & Resilience

Error categorization, detection points, and fallback behaviour are specified in [`16_ERROR_HANDLING.md`](./16_ERROR_HANDLING.md).
