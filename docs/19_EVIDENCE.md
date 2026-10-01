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
| **1. Coding Agent Connected** | Documented prompts, AI tool execution logs, and IDE session records. | `docs/18_TASKS.md`, prompt commit messages, and builder journey log. | Verified ✅ |
| **2. Live AWS Deployment (Ship Gate)** | Public, reachable HTTPS URL on AWS Amplify: [https://main.d36a9s34xgy54i.amplifyapp.com](https://main.d36a9s34xgy54i.amplifyapp.com) | AWS Amplify Hosting Console + Live Production Deployment URL: [https://main.d36a9s34xgy54i.amplifyapp.com](https://main.d36a9s34xgy54i.amplifyapp.com) | Verified & Live (Ship Gate Cleared ✅) |
| **3. AWS Services Used** | Server-side integration of Amazon Bedrock (`deepseek.v3.2` on Bedrock Mantle / `ap-southeast-2`), CloudWatch SDK & EMF, S3 resilient snapshot storage, and Amplify. | `docs/09_AWS_ARCHITECTURE.md`, `src/lib/aws/`, serverless route handlers. | Verified ✅ |
| **4. Development Process** | Chronological builder story recounting architecture decisions and AI-assisted iterations. | `docs/22_AI_DEVELOPMENT_LOG.md` and Builder Center project story. | Verified ✅ |
| **5. Original & Unpublished App** | Fresh GitHub repository with clean commit history starting from hackathon kickoff. | Public GitHub repository commit tree (`main` branch). | Verified ✅ |
| **6. Open Source Compliance** | OSI-approved open source license at project root. | `LICENSE` (MIT License) at root. | Verified ✅ |

---

## 2. Live Deployment Proof & Verification (Ship Gate Pass)

* **Live Production URL**: [https://main.d36a9s34xgy54i.amplifyapp.com](https://main.d36a9s34xgy54i.amplifyapp.com)
* **AWS Amplify App ID**: `d36a9s34xgy54i` (Branch: `main`)
* **Project Region**: `ap-southeast-2` (Sydney)
* **Model in Production**: `deepseek.v3.2` on Amazon Bedrock Mantle runtime
* **Guest Flow Check**: 100% verified — zero login walls, instantaneous guest canvas access
* **Spreadsheet Reactivity**: Verified — live `=SUM` formula recomputations and Dynamic Chart bindings run fully in-browser without crashes

---

## 3. Screenshot & Artifact Preservation Plan

Before submitting on builder.aws.com, capture and archive the following artifacts in `/docs/assets/evidence/`:
1. `evidence_01_amplify_live.png`: Full browser screenshot of the live app on `*.amplifyapp.com`.
2. `evidence_02_bedrock_cloudwatch.png`: CloudWatch metric graph showing Bedrock invocation latency and token counts.
3. `evidence_03_ai_agent_session.png`: Screenshot of the AI coding agent environment generating project architecture.
