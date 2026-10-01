# 19 — Architectural Decision Records (ADRs)

> **Document Status**: All Decisions Approved & Implemented ✅  
> **Primary Objective**: Log all major architectural, tooling, and infrastructure decisions with full traceability.

---

## Approved Architectural Decisions

* **ADR-001: Amazon S3 Cloud Persistence Layer**: Adopt `@aws-sdk/client-s3` for server-side persistence of generated workbooks and export snapshots (`.json`, `.xlsx`) in the assigned region `ap-southeast-2` with zero-crash in-memory fallback. *(Fulfills REQ-F-006, REQ-NF-003)*.

* **ADR-002: Amazon CloudWatch Observability (EMF)**: Adopt AWS Embedded Metric Format (EMF) for structured stdout logging of model latencies, token consumption, and fallback rates, enabling high-resolution custom metrics without additional runtime overhead. *(Fulfills REQ-NF-007)*.

* **ADR-003: Deterministic Hybrid Fallback Architecture**: When cloud AI calls to Amazon Bedrock encounter network timeouts (5000ms threshold) or API quota saturation, execution routes autonomously to the local HyperFormula v3.4.0 deterministic math engine, guaranteeing 100% uptime with zero UI freeze. *(Fulfills REQ-NF-003)*.

* **ADR-004: 4-Stage Autonomous Multi-Agent Topology**: Pipeline architecture is decomposed into 4 discrete, specialized agent stages:
  1. Agent 1: Schema Architect (`schemaArchitectAgent.ts`) — Domain intent & column architecture.
  2. Agent 2: Formula Compiler (`formulaCompilerAgent.ts`) — Reactive Excel formula injection & anti-circular guards.
  3. Agent 3: Visual Analytics (`visualAnalyticsAgent.ts`) — Chart specification & telemetry mapping.
  4. Agent 4: Deterministic Engine (`orchestrator.ts`) — HyperFormula recalculation & dependency resolution.
  *(Fulfills REQ-F-008, REQ-NF-007)*.

* **ADR-005: AWS Assigned Regional Compliance (`ap-southeast-2`)**: All regional AWS services (Bedrock Foundation Models, CloudWatch EMF Namespace `SheetBrainAI/Metrics`, S3 Buckets) are strictly deployed and evaluated within `ap-southeast-2` (Sydney) in full compliance with AWS Hackathon Project constraints. *(Fulfills REQ-NF-003)*.
