# 17 — Testing & Verification Strategy

> **Traceability**: Verifies all `REQ-F-xxx` and `REQ-NF-xxx` requirements.

---

## 1. Test Levels

1. **Unit Testing**:
   * Formula syntax validator (verifying no circular references or invalid names).
   * Data model adapter (verifying accurate mapping to Univer JSON format).
2. **Integration Testing**:
   * API endpoints (`/api/generate-sheet`, `/api/simulate-scenario`).
   * Bedrock SDK connection and response parsing.
3. **End-to-End Smoke Testing**:
   * Verification of live AWS Amplify deployment.
   * Testing 1-click template load and Excel export generation.
