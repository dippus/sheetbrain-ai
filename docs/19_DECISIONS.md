# 19 — Architectural Decisions (ADRs)

> **Document Status**: Active  
> **Primary Objective**: Log all major architectural, tooling, and infrastructure decisions.

## Pending Decisions (Needs Human Approval)
1. **Error Handling & Fallbacks**: Exact fallback behavior of the local deterministic engine when AWS Bedrock times out.
2. **AWS Step Functions States**: Exact states for the multi-agent orchestration (e.g., Schema Planner -> Formula Compiler -> UX Validator).
3. **DynamoDB Schema (PK/SK)**: Exact Partition Key and Sort Key design for the application database.

## Approved Decisions
* **ADR-001: Amazon S3 Cloud Persistence Layer**: Adopt `@aws-sdk/client-s3` for server-side persistence of generated workbooks and export snapshots (`.json`, `.xlsx`) in the assigned region `ap-southeast-2` with zero-crash in-memory fallback. (Fulfills REQ-F-006, REQ-NF-003).
* **ADR-002: Amazon CloudWatch Observability (EMF)**: Adopt AWS Embedded Metric Format (EMF) for structured stdout logging of model latencies, token consumption, and fallback rates, enabling high-resolution custom metrics without additional runtime overhead. (Fulfills REQ-NF-007).

