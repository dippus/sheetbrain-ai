# 04 — User Stories & Acceptance Criteria

> **Traceability**: Mapped directly to `REQ-F-xxx` requirements.

---

### US-001: Natural Language Model Creation
* **As a** startup founder,  
* **I want to** type a prompt like *"Build a 12-month runway projection with $50k MRR and 5 headcount"*,  
* **So that** I get an editable, formula-driven spreadsheet immediately.  
* **Traceability**: `REQ-F-001`, `REQ-F-002`, `REQ-F-004`
* **Acceptance Criteria**:
  * *Given* an empty prompt bar, *When* I submit a business prompt, *Then* the Univer canvas renders columns with correct formats (currency, string, date) and formulas in total rows within 4 seconds.

---

### US-002: Dynamic Cell Recalculation
* **As a** financial analyst,  
* **I want to** edit an expense number in cell C3,  
* **So that** total expense in C10 and net profit in C12 automatically recalculate.  
* **Traceability**: `REQ-F-002`, `REQ-F-003`
* **Acceptance Criteria**:
  * *Given* a generated spreadsheet with `=SUM(C2:C9)` in C10, *When* I change C2 from 1000 to 2000, *Then* C10 updates immediately without page refresh.

---

### US-003: What-If Sensitivity Testing
* **As an** operator,  
* **I want to** run a simulation: *"What if engineering salaries increase by 20% in Q3?"*,  
* **So that** I can see which budget lines break without manually recalculating every row.  
* **Traceability**: `REQ-F-007`
* **Acceptance Criteria**:
  * *Given* an active budget sheet, *When* I submit a scenario hypothesis, *Then* impacted cells are updated, previous vs new values are displayed in a summary panel, and cells are visually tagged.

---

### US-004: Native Excel Export
* **As an** executive,  
* **I want to** click "Export to Excel",  
* **So that** I can download an `.xlsx` file that opens in Microsoft Excel with all formulas intact.  
* **Traceability**: `REQ-F-006`
* **Acceptance Criteria**:
  * *Given* a populated sheet in the canvas, *When* I click Export, *Then* an `.xlsx` file downloads containing identical cell data and formulas.
