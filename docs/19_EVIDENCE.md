# 19 — Hackathon Requirements Evidence Register

> **Purpose**: Formal proof map verifying compliance with all official AWS "Zero to Shipped" Hackathon rules.  
> **Source of Truth**: builder.aws.com Hackathon Rules

---

## 1. Requirement-to-Evidence Matrix

```
Requirement
    ↓
What proves it?
    ↓
Where proof is stored?
```

| Official Requirement | What Proves It? | Where Proof is Stored? | Status |
|:---|:---|:---|:---:|
| **1. Coding Agent Connected** | Documented prompts, AI tool execution logs, and IDE session records. | `docs/21_TASKS.md`, prompt commit messages, and builder journey log. | Verified |
| **2. Live AWS Deployment (Ship Gate)** | Public, reachable HTTPS URL on AWS Amplify (`*.amplifyapp.com`). | AWS Amplify Console + Live URL in submission form. | Pending Deploy (Phase 2) |
| **3. AWS Services Used** | Server-side integration of Amazon Bedrock (Claude 3.5 Sonnet), CloudWatch logging, Amplify. | `docs/09_AWS_ARCHITECTURE.md`, package dependencies, codebase serverless routes. | Documented |
| **4. Development Process** | Chronological builder story recounting architecture decisions and AI-assisted iterations. | Written Builder Center project story on builder.aws.com. | Storyboard Ready |
| **5. Original & Unpublished App** | Fresh GitHub repository with clean commit history starting from hackathon kickoff. | Public GitHub repository commit tree. | Verified |
| **6. Open Source Compliance** | OSI-approved open source license at project root. | `LICENSE` (MIT License) at root. | Verified |

---

## 2. Screenshot & Artifact Preservation Plan

Before submitting on builder.aws.com, capture and archive the following artifacts in `/docs/assets/evidence/`:
1. `evidence_01_amplify_live.png`: Full browser screenshot of the live app on `*.amplifyapp.com`.
2. `evidence_02_bedrock_cloudwatch.png`: CloudWatch metric graph showing Bedrock invocation latency and token counts.
3. `evidence_03_ai_agent_session.png`: Screenshot of the AI coding agent environment generating project architecture.
