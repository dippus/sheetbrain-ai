# 09 — AWS Cloud Architecture & Infrastructure Plan

> **Traceability**: Fulfills `REQ-NF-003`, `REQ-NF-007`, and Hackathon Ship Gate.

---

## 1. AWS Services Inventory

| # | AWS Service | Purpose in SheetBrain AI |
|:---|:---|:---|
| 1 | **AWS Amplify Hosting** | Hosts the Next.js 14 web application with automatic CI/CD and edge CDN. |
| 2 | **Amazon Bedrock** | Multi-agent reasoning brain utilizing Claude 3.5 Sonnet (`anthropic.claude-3-5-sonnet-20240620-v1:0`). |
| 3 | **Amazon CloudWatch** | Application metrics, generation latency tracking, and error observability. |
| 4 | **Amazon S3** | Storage for exported workbook files (`.xlsx`, `.csv`) and pre-generated static templates. |
| 5 | **AWS IAM** | Execution roles following least-privilege principles without embedded API keys. |

---

## 2. Infrastructure Flow Diagram

```mermaid
flowchart LR
    User["End User / Judge"] -->|HTTPS| CDN["AWS Amplify CDN Edge"]
    CDN --> NextApp["Next.js Serverless Runtime"]
    
    subgraph "Backend Execution"
        NextApp -->|InvokeModel| Bedrock["Amazon Bedrock (Claude 3.5 Sonnet)"]
        NextApp -->|PutMetricData| CloudWatch["Amazon CloudWatch"]
        NextApp -->|PutObject / GetObject| S3["Amazon S3 Storage"]
    end
```

---

## 3. Items Pending Decision [NEEDS DECISION]

* **[NEEDS DECISION] AWS Region Selection**: Region `us-east-1` (N. Virginia) vs `us-west-2` (Oregon).
  * *Recommendation*: `us-east-1` has the highest quota availability for Claude 3.5 Sonnet.
* **[NEEDS DECISION] Persistence Layer (DynamoDB vs S3 JSON Snapshots)**:
  * For MVP, workbooks can be maintained in client session memory with S3 exports. Adding DynamoDB single-table design is an optional architectural enhancement.
