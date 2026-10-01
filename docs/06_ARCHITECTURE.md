# 06 — System Architecture

> **Traceability**: Implements `REQ-NF-001`, `REQ-NF-003`, `REQ-NF-004`, `REQ-NF-005`.

---

## 1. Architectural Style

SheetBrain AI adopts a **Hybrid Serverless Architecture**:
* **Client Layer**: Next.js 14 App Router (React, Tailwind CSS, Univer Office SDK, Recharts).
* **API / Orchestration Layer**: Next.js Serverless Edge/Node Route Handlers orchestrating multi-agent tasks.
* **AI Cognitive Engine**: Amazon Bedrock running `deepseek.v3.2` on Bedrock Mantle (`ap-southeast-2`), with Bedrock SDK multi-model support.
* **Deterministic Execution Engine**: Custom TypeScript parser for formula syntax tree validation and local instant fallback.
* **Hosting**: AWS Amplify with global CDN.

---

## 2. Component Diagram

```mermaid
graph TD
    subgraph BrowserClient ["Browser Client (Next.js 14)"]
        UI["Studio Shell (Command Bar, Layout)"]
        Univer["Univer Canvas Wrapper (SSR: false)"]
        Chart["Recharts Dynamic Visualizer"]
        State["Client State Manager (Zustand / React Context)"]
    end

    subgraph ServerlessEdge ["Serverless API (AWS Amplify / Next.js)"]
        GenRoute["/api/generate-sheet"]
        SimRoute["/api/simulate-scenario"]
        ExportRoute["/api/export-sheet"]
    end

    subgraph AgentPipeline ["Multi-Agent Orchestrator"]
        Agent1["Agent 1: Schema Architect"]
        Agent2["Agent 2: Formula Compiler"]
        Agent3["Agent 3: Chart Engine"]
        Agent4["Agent 4: What-If Simulator"]
        LocalEng["Local Deterministic Engine (TS Fallback)"]
    end

    subgraph CloudServices ["AWS Cloud Services (ap-southeast-2)"]
        Bedrock["Amazon Bedrock (deepseek.v3.2 on Bedrock Mantle)"]
        CloudWatch["Amazon CloudWatch (SDK & EMF Telemetry)"]
        S3["Amazon S3 (with In-Memory Fallback)"]
    end

    UI --> State
    State --> Univer
    State --> Chart
    UI --> GenRoute
    UI --> SimRoute
    UI --> ExportRoute

    GenRoute --> AgentPipeline
    SimRoute --> AgentPipeline
    AgentPipeline --> Bedrock
    AgentPipeline -.-> LocalEng
    GenRoute --> CloudWatch
    ExportRoute --> S3
```

---

## 3. Key Architectural Decisions (ADR Summary)

* **Decision 1: Client-Side Only Univer Rendering** (Prevents Node.js SSR crash).
* **Decision 2: Formula Delegation Pattern** (LLM emits formula syntax, browser/canvas calculates numeric values).
* **Decision 3: Hybrid Fallback Protocol** (Guarantees zero-error state if Bedrock encounters rate limits).
