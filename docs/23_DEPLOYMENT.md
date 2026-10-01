# 18 — AWS Deployment & Production Hosting Plan

> **Critical Compliance**: Ship Gate Pass/Fail Requirement  
> **Rule**: Application MUST be deployed live on AWS infrastructure with public HTTPS access.

---

## 1. Hosting & Cloud Environment

| Component | Selection | Specification |
|:---|:---|:---|
| **Hosting Platform** | AWS Amplify Hosting (SSR) | Managed Next.js 14 serverless hosting with global CloudFront edge distribution. |
| **Region** | `ap-southeast-2` (Sydney) | Mandatory project region. All regional services (Amazon Bedrock Mantle, CloudWatch, S3) execute strictly within `ap-southeast-2` to eliminate cross-region latency and enforce policy compliance. |
| **SSL / HTTPS** | AWS Amplify Managed SSL | Automatic TLS certificate provisioning on `*.amplifyapp.com` domain. |
| **Domain** | Public Amplify Live URL | [https://main.d36a9s34xgy54i.amplifyapp.com](https://main.d36a9s34xgy54i.amplifyapp.com) (Live production deployment, publicly accessible without login or VPN). |

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

The following variables are configured in the AWS Amplify Console under **App Settings > Environment Variables**:

| Variable Name | Environment | Purpose | Sensitivity |
|:---|:---|:---|:---:|
| `BEDROCK_REGION` | Production | `ap-southeast-2` (Sydney) | Low |
| `BEDROCK_MODEL_ID` | Production | `deepseek.v3.2` (Amazon Bedrock Mantle endpoint) | Low |
| `AWS_BEARER_TOKEN_BEDROCK` | Production | AWS Bedrock API authentication key for Mantle | HIGH (Configured via Amplify Console) |
| `AWS_ACCESS_KEY_ID` | Build / Runtime | Scoped IAM user / role for S3 and CloudWatch (optional) | HIGH (Never commit) |
| `AWS_SECRET_ACCESS_KEY` | Build / Runtime | Scoped IAM secret (optional) | HIGH (Never commit) |

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
