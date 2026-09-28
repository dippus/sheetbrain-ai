# 15 — Security & Compliance Specification

> **Traceability**: Enforces `REQ-NF-003` (Zero Credential Leakage).

---

## 1. Threat Modeling & Safeguards

| Threat | Risk Level | Mitigation Strategy |
|:---|:---:|:---|
| **Hardcoded AWS Credentials** | CRITICAL | Strictly prohibited. Credentials loaded via server-side environment variables or AWS Amplify managed IAM roles. Zero secrets in Git. |
| **Formula Injection (CSV Injection)** | MEDIUM | Sanitization of user strings starting with `=`, `+`, `-`, `@` when rendered as raw values. |
| **Prompt Injection** | MEDIUM | Bedrock system prompt boundaries; input truncation to 500 characters; strict JSON schema response validation. |
| **Denial of Service / Quota Burn** | MEDIUM | Rate limiting on public API endpoints; pre-warmed client caches for standard templates. |


---

## 2. Error Handling & Resilience Protocol

# 16 — Error Handling & Resilience Strategy

> **Traceability**: Fulfills `REQ-NF-005` (Reliability).

---

## 1. Error Categorization & Recovery Protocol

| Error Type | Detection Point | User Experience | Fallback Action |
|:---|:---|:---|:---|
| **Bedrock API Timeout / Quota** | Next.js API Route | User sees slight delay; notification pill states *"Switching to local engine"*. | Automatically activates local deterministic engine with nearest matching template. |
| **Univer Canvas Crash** | React ErrorBoundary | Clean error placeholder with "Reload Canvas" button. | Restores previous valid workbook snapshot without full page reload. |
| **Formula Syntax Failure** | Formula Compiler | Red highlight on specific cell. | Wraps failing formula in `IFERROR(..., 0)` to prevent cascade failure. |
