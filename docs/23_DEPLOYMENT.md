# 18 — AWS Deployment & Production Hosting Plan

> **Critical Compliance**: Ship Gate Pass/Fail Requirement  
> **Rule**: Application MUST be deployed live on AWS infrastructure with public HTTPS access.

---

## 1. Hosting & Cloud Environment

| Component | Selection | Specification |
|:---|:---|:---|
| **Hosting Platform** | AWS Amplify Hosting (Gen 2 / SSR) | Managed Next.js 14 serverless hosting with global CloudFront edge distribution. |
| **Region** | `us-east-1` (N. Virginia) | Primary region for Bedrock Claude 3.5 Sonnet quota and low-latency API execution. |
| **SSL / HTTPS** | AWS Amplify Managed SSL | Automatic TLS certificate provisioning on `*.amplifyapp.com` domain. |
| **Domain** | Public Amplify URL | `https://main.<app-id>.amplifyapp.com` (Publicly accessible without VPN or basic auth). |

---

## 2. Build & Deployment Pipeline (CI/CD)

### Build Configuration (`amplify.yml`):
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

---

## 3. Environment Variables Configuration

The following variables must be configured in the AWS Amplify Console under **App Settings > Environment Variables**:

| Variable Name | Environment | Purpose | Sensitivity |
|:---|:---|:---|:---:|
| `BEDROCK_REGION` | Production | `us-east-1` | Low |
| `BEDROCK_MODEL_ID` | Production | `anthropic.claude-3-5-sonnet-20240620-v1:0` | Low |
| `AWS_ACCESS_KEY_ID` | Build / Runtime | Scoped IAM user / role for Bedrock invocation | HIGH (Never commit) |
| `AWS_SECRET_ACCESS_KEY` | Build / Runtime | Scoped IAM secret | HIGH (Never commit) |

---

## 4. Production Verification Gate (Ship Gate Verification)

Immediately post-deployment, execute these 5 checks:
1. **DNS & HTTPS**: Verify live URL loads with valid green SSL padlock in an incognito window.
2. **Guest Access**: Confirm homepage and workspace load without any login or authentication prompt.
3. **Canvas Ingestion**: Verify Univer spreadsheet grid initializes with zero `window is not defined` console errors.
4. **Formula Calculation**: Verify modifying cell `B2` updates dependent formula cells (`=SUM`) in real time.
5. **Mobile Viewport**: Verify layout scales cleanly on tablet and mobile viewports.

---

## 5. Rollback & Basic Recovery Protocol

* In AWS Amplify Console, every Git commit generates an immutable build artifact.
* If a new deployment fails or introduces regressions:
  1. Open **AWS Amplify > Deployments**.
  2. Select the previous stable build.
  3. Click **Redeploy this version**. Rollback completes in `< 60 seconds`.
