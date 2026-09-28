# 13 — API Specifications & Endpoint Contracts

> **Traceability**: Connects Client to Agent Pipeline.

---

## 1. Endpoints Overview

| Route | Method | Purpose | Auth |
|:---|:---:|:---|:---:|
| `/api/generate-sheet` | POST | Executes Agent 1 + Agent 2 + Agent 3 pipeline | Public Guest |
| `/api/simulate-scenario` | POST | Executes Agent 4 What-If sensitivity analysis | Public Guest |
| `/api/export` | POST | Converts workbook JSON into downloadable `.xlsx` | Public Guest |
| `/api/health` | GET | Health check & service readiness | Public |

---

## 2. `POST /api/generate-sheet`

### Request Body:
```json
{
  "prompt": "Build a 12-month startup runway forecast with $40k MRR and 6 engineers",
  "templateId": null
}
```

### Response (200 OK):
```json
{
  "success": true,
  "workbook": {
    "id": "wb_98234",
    "title": "SaaS Financial Runway & Burn Model",
    "sheets": [
      {
        "id": "sheet_1",
        "name": "Runway Model",
        "rowCount": 20,
        "columnCount": 6,
        "columns": [
          { "key": "A", "label": "Month", "type": "string" },
          { "key": "B", "label": "MRR", "type": "currency" }
        ],
        "cellData": {
          "A1": { "v": "Month", "s": { "bold": true } },
          "B1": { "v": "MRR", "s": { "bold": true } }
        }
      }
    ],
    "chartConfig": {
      "type": "line",
      "title": "Cash Runway vs Net Burn"
    }
  },
  "executionMetrics": {
    "latencyMs": 1820,
    "model": "anthropic.claude-3-5-sonnet"
  }
}
```
