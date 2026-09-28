# 12 — AI Prompts, Guardrails & Anti-Hallucination Rules

> **Traceability**: Enforces `REQ-NF-002` (Formula Safety).

---

## 1. System Prompt Guardrails (Mandatory Invariants)

1. **Strict JSON Output**: All agent calls MUST return raw JSON adhering to explicit schema contracts. Prose, conversational preambles, and markdown commentary are strictly prohibited.
2. **Formula Syntax Validation**:
   * Every formula MUST start with `=`.
   * Standard uppercase formula names only (`SUM`, `AVERAGE`, `IF`, `MAX`, `MIN`, `COUNT`, `GROWTH`).
3. **Anti-Circular Reference Guard**:
   * A formula in cell `X` must NEVER reference cell `X` directly or through an immediate chain.
4. **Anti-Divide-By-Zero Guard**:
   * Division operations must be wrapped in conditional checks:  
     `=IF(B2=0, 0, (C2-B2)/B2)`.
5. **No Static Arithmetic in Total Rows**:
   * Summary/total rows must NEVER contain hardcoded numeric sums. They must always use `=SUM(...)` ranges.
