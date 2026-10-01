# 08 — Technology Stack & Decision Rationale

> **Traceability**: Fulfills `REQ-NF-001`, `REQ-NF-004`, `REQ-NF-005`.

---

## 1. Core Stack Matrix

| Technology | Selection | Version / Scope | Justification & Rationale |
|:---|:---|:---|:---|
| **Framework** | Next.js | `^14.2.x` (App Router) | Industry standard, fast serverless route handlers, seamless AWS Amplify CI/CD compatibility. |
| **Language** | TypeScript | `^5.x` (Strict Mode) | Strong typing prevents runtime bugs in complex formula manipulation and JSON schema mapping. |
| **Spreadsheet Engine** | Univer Office SDK | `@univerjs/core`, `@univerjs/sheets` | High-performance HTML5 Canvas rendering, built-in formula parser, Facade API for programmatic cell manipulation. |
| **Styling** | Tailwind CSS | `^3.4.x` | Rapid utility styling, zero runtime overhead, responsive layout control. |
| **Visualization** | Recharts | `^2.12.x` | React-native SVG chart library with declarative data bindings and fluid animations. |
| **Cloud AI** | Amazon Bedrock | `@aws-sdk/client-bedrock-runtime` | Enterprise GenAI runtime; flagship Claude 3.5 Sonnet model for complex mathematical and structural reasoning. |
| **Hosting & CI/CD** | AWS Amplify | Gen 2 / Hosting | Native AWS deployment, automatic SSL/HTTPS, instant GitHub repository builds. |
| **Observability** | Amazon CloudWatch | Embedded Metric Format (EMF) | Production observability for latency, agent invocation tracking, and cost monitoring. |

---

## 2. Approved Technical Confirmations [DECIDED & IMPLEMENTED]

* **[APPROVED] Univer Modular Architecture**: Adopted modular core packages (`@univerjs/core`, `@univerjs/sheets`, `@univerjs/sheets-ui`, `@univerjs/ui`, `@univerjs/sheets-formula`) loaded exclusively via dynamic client imports (`ssr: false`) to safeguard against Next.js SSR Canvas crashes while minimizing bundle size.
* **[APPROVED] Client State Architecture**: React Hooks (`useState`, `useCallback`, `useMemo`) with zero external state overhead, combined with deterministic HyperFormula engine recalculations.
