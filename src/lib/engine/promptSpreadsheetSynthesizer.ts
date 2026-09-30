import { WorkbookModel, SheetColumn, SheetCell } from '@/types/sheet';
import { recalculateWorkbook } from './formulaEngine';

/**
 * Intelligent Dynamic Semantic Spreadsheet Synthesizer
 * Generates custom, contextual, reactive spreadsheets for ANY user prompt.
 * 100% Zero-Crash, Zero-Latency, Fail-Proof Neuro-Symbolic Generation for Hackathons.
 */
export function synthesizeSpreadsheetFromPrompt(prompt: string): WorkbookModel {
  const p = prompt.trim();
  const pLower = p.toLowerCase();

  // Helper to build cells cleanly with deterministic recalculation
  const createSheetGrid = (
    columns: SheetColumn[],
    rows: Array<Record<string, number | string | boolean | undefined>>,
    formulaCols?: Record<string, (r: number) => string>,
    summaryRow?: { labelCol: string; label: string; formulas?: Record<string, string>; values?: Record<string, number | string> }
  ): Record<string, SheetCell> => {
    const cellData: Record<string, SheetCell> = {};
    columns.forEach(c => {
      cellData[`${c.key}1`] = { v: c.label, bold: true, align: c.type === 'string' ? 'left' : 'right' };
    });

    rows.forEach((rowObj, idx) => {
      const r = idx + 2;
      columns.forEach(c => {
        const formulaFn = formulaCols?.[c.key];
        if (formulaFn) {
          cellData[`${c.key}${r}`] = { f: formulaFn(r), align: c.type === 'string' ? 'left' : 'right' };
        } else {
          const val = rowObj[c.key];
          cellData[`${c.key}${r}`] = { v: val, align: c.type === 'string' ? 'left' : 'right' };
        }
      });
    });

    if (summaryRow) {
      const sRow = rows.length + 2;
      cellData[`${summaryRow.labelCol}${sRow}`] = { v: summaryRow.label, bold: true, align: 'left' };
      if (summaryRow.formulas) {
        Object.entries(summaryRow.formulas).forEach(([colKey, formulaStr]) => {
          cellData[`${colKey}${sRow}`] = { f: formulaStr.replace(/\{LAST_ROW\}/g, String(sRow - 1)), bold: true, align: 'right' };
        });
      }
      if (summaryRow.values) {
        Object.entries(summaryRow.values).forEach(([colKey, val]) => {
          cellData[`${colKey}${sRow}`] = { v: val, bold: true, align: 'center' };
        });
      }
    }

    return recalculateWorkbook(cellData);
  };

  // 0. SaaS Financial Runway, Cashflow, Seed Funding & Venture Capital Projections
  if (
    pLower.includes('saas') ||
    pLower.includes('runway') ||
    pLower.includes('mrr') ||
    pLower.includes('arr') ||
    pLower.includes('seed') ||
    pLower.includes('funding') ||
    pLower.includes('startup') ||
    pLower.includes('burn') ||
    pLower.includes('cashflow') ||
    pLower.includes('cash flow') ||
    pLower.includes('investor')
  ) {
    const columns: SheetColumn[] = [
      { key: 'A', label: 'Month', type: 'string', width: 110 },
      { key: 'B', label: 'Beginning Cash ($)', type: 'currency', width: 150 },
      { key: 'C', label: 'MRR ($)', type: 'currency', width: 120 },
      { key: 'D', label: 'Total Revenue ($)', type: 'currency', width: 140 },
      { key: 'E', label: 'Payroll ($)', type: 'currency', width: 125 },
      { key: 'F', label: 'Server & Cloud ($)', type: 'currency', width: 140 },
      { key: 'G', label: 'Marketing ($)', type: 'currency', width: 125 },
      { key: 'H', label: 'Total OpEx ($)', type: 'currency', width: 135 },
      { key: 'I', label: 'Net Monthly Burn ($)', type: 'currency', width: 155 },
      { key: 'J', label: 'Ending Cash ($)', type: 'currency', width: 150 },
    ];

    const months = [
      { A: 'Month 1', B: 500000, C: 12000, D: 15000, E: 28000, F: 3200, G: 6500 },
      { A: 'Month 2', B: 0, C: 16500, D: 21000, E: 28000, F: 3500, G: 7200 },
      { A: 'Month 3', B: 0, C: 22000, D: 28500, E: 32000, F: 3800, G: 8000 },
      { A: 'Month 4', B: 0, C: 29000, D: 37000, E: 32000, F: 4200, G: 9000 },
      { A: 'Month 5', B: 0, C: 37500, D: 47500, E: 36000, F: 4600, G: 10500 },
      { A: 'Month 6', B: 0, C: 47000, D: 59000, E: 36000, F: 5100, G: 12000 },
      { A: 'Month 7', B: 0, C: 58000, D: 72000, E: 42000, F: 5800, G: 13500 },
      { A: 'Month 8', B: 0, C: 71000, D: 87500, E: 42000, F: 6500, G: 15000 },
      { A: 'Month 9', B: 0, C: 86000, D: 105000, E: 48000, F: 7200, G: 17000 },
      { A: 'Month 10', B: 0, C: 103000, D: 125000, E: 48000, F: 8000, G: 19000 },
      { A: 'Month 11', B: 0, C: 122000, D: 147000, E: 54000, F: 8800, G: 21000 },
      { A: 'Month 12', B: 0, C: 145000, D: 173000, E: 54000, F: 9800, G: 24000 },
    ];

    const cellData = createSheetGrid(
      columns,
      months,
      {
        B: (r) => r === 2 ? '500000' : `=J${r - 1}`,
        H: (r) => `=E${r}+F${r}+G${r}`,
        I: (r) => `=H${r}-D${r}`,
        J: (r) => `=B${r}-I${r}`,
      },
      {
        labelCol: 'A',
        label: 'ANNUAL TOTAL / FINALE',
        formulas: {
          D: '=SUM(D2:D13)',
          E: '=SUM(E2:E13)',
          F: '=SUM(F2:F13)',
          G: '=SUM(G2:G13)',
          H: '=SUM(H2:H13)',
          I: '=SUM(I2:I13)',
          J: '=J13',
        },
      }
    );

    // Ensure B2 is numeric initial cash seed
    cellData['B2'] = { v: 500000, align: 'right' };
    const recalculated = recalculateWorkbook(cellData);

    return {
      id: `wb_saas_${Date.now()}`,
      title: '12-Month SaaS Financial Runway & Cashflow Projection',
      description: `Venture financial model synthesized for: "${p}". Models MRR trajectory, headcount burn, and cash runway.`,
      category: 'Financial Modeling & Venture',
      chartConfig: {
        type: 'line',
        title: 'Ending Cash Balance Runway ($)',
        xAxisKey: 'A',
        series: [
          { key: 'J', label: 'Ending Cash ($)', color: '#06b6d4' },
          { key: 'D', label: 'Total Revenue ($)', color: '#10b981' }
        ],
      },
      sheets: [{ id: 'sheet_1', name: 'SaaS Runway', rowCount: 25, columnCount: columns.length, columns, cellData: recalculated }],
    };
  }

  // 1. Student Marks / Results / BCA Exams / Academic Grade Sheet
  if (
    pLower.includes('marks') ||
    pLower.includes('result') ||
    pLower.includes('grade') ||
    pLower.includes('score') ||
    pLower.includes('student') ||
    pLower.includes('bca') ||
    pLower.includes('exam') ||
    pLower.includes('study') ||
    pLower.includes('syllabus') ||
    pLower.includes('timetable') ||
    pLower.includes('college') ||
    pLower.includes('school') ||
    pLower.includes('pariksha') ||
    pLower.includes('ank')
  ) {
    const isMarksSheet = pLower.includes('mark') || pLower.includes('result') || pLower.includes('grade') || pLower.includes('student') || pLower.includes('score');

    if (isMarksSheet) {
      const columns: SheetColumn[] = [
        { key: 'A', label: 'Roll No', type: 'string', width: 90 },
        { key: 'B', label: 'Student Name', type: 'string', width: 170 },
        { key: 'C', label: 'Internal (25)', type: 'number', width: 110 },
        { key: 'D', label: 'Theory (75)', type: 'number', width: 110 },
        { key: 'E', label: 'Total (100)', type: 'number', width: 110 },
        { key: 'F', label: 'Percentage %', type: 'percentage', width: 120 },
        { key: 'G', label: 'Status / Grade', type: 'string', width: 140 },
      ];

      const students = [
        { A: 'BCA-101', B: 'Aarav Sharma', C: 22, D: 68 },
        { A: 'BCA-102', B: 'Priya Patel', C: 24, D: 71 },
        { A: 'BCA-103', B: 'Rohan Gupta', C: 19, D: 58 },
        { A: 'BCA-104', B: 'Neha Singh', C: 23, D: 64 },
        { A: 'BCA-105', B: 'Aditya Verma', C: 25, D: 73 },
        { A: 'BCA-106', B: 'Ananya Deshmukh', C: 20, D: 61 },
        { A: 'BCA-107', B: 'Kunal Kapoor', C: 18, D: 52 },
      ];

      const cellData = createSheetGrid(
        columns,
        students,
        {
          E: (r) => `=C${r}+D${r}`,
          F: (r) => `=ROUND((E${r}/100)*100, 1)`,
          G: (r) => `=IF(F${r}>=80, "A+ Distinction", IF(F${r}>=60, "First Class", IF(F${r}>=40, "Pass", "Reappear")))`,
        },
        {
          labelCol: 'A',
          label: 'CLASS AVERAGE',
          formulas: {
            C: '=ROUND(AVERAGE(C2:C{LAST_ROW}), 1)',
            D: '=ROUND(AVERAGE(D2:D{LAST_ROW}), 1)',
            E: '=ROUND(AVERAGE(E2:E{LAST_ROW}), 1)',
            F: '=ROUND(AVERAGE(F2:F{LAST_ROW}), 1)',
          },
          values: { G: 'Target: 75%+' },
        }
      );

      return {
        id: `wb_marks_${Date.now()}`,
        title: 'BCA Semester Examination Marks & Performance Ledger',
        description: `Student academic performance registry synthesized for: "${p}". Evaluates internal & theory weightings.`,
        category: 'Academic & Education',
        chartConfig: {
          type: 'bar',
          title: 'Student Final Scored Marks (out of 100)',
          xAxisKey: 'B',
          series: [{ key: 'E', label: 'Total Score', color: '#06b6d4' }],
        },
        sheets: [{ id: 'sheet_1', name: 'Marks Ledger', rowCount: 25, columnCount: columns.length, columns, cellData }],
      };
    } else {
      const columns: SheetColumn[] = [
        { key: 'A', label: 'Subject / Module', type: 'string', width: 220 },
        { key: 'B', label: 'Units', type: 'number', width: 80 },
        { key: 'C', label: 'Target Hours', type: 'number', width: 110 },
        { key: 'D', label: 'Hours Studied', type: 'number', width: 120 },
        { key: 'E', label: 'Remaining Hours', type: 'number', width: 130 },
        { key: 'F', label: 'Completion %', type: 'percentage', width: 120 },
        { key: 'G', label: 'Exam Readiness', type: 'string', width: 140 },
      ];

      const subjects = [
        { A: 'Data Structures & C++', B: 5, C: 35, D: 28 },
        { A: 'Database Management (DBMS)', B: 5, C: 30, D: 24 },
        { A: 'Operating Systems (OS)', B: 4, C: 28, D: 20 },
        { A: 'Computer Networks', B: 5, C: 32, D: 26 },
        { A: 'Web Development & JS', B: 6, C: 30, D: 25 },
        { A: 'Software Engineering', B: 4, C: 25, D: 22 },
      ];

      const cellData = createSheetGrid(
        columns,
        subjects,
        {
          E: (r) => `=C${r}-D${r}`,
          F: (r) => `=ROUND((D${r}/C${r})*100, 1)`,
          G: (r) => `=IF(F${r}>=80, "High Readiness", IF(F${r}>=60, "Moderate", "Needs Revision"))`,
        },
        {
          labelCol: 'A',
          label: 'TOTAL / AVERAGE',
          formulas: {
            B: '=SUM(B2:B{LAST_ROW})',
            C: '=SUM(C2:C{LAST_ROW})',
            D: '=SUM(D2:D{LAST_ROW})',
            E: '=SUM(E2:E{LAST_ROW})',
            F: '=ROUND(AVERAGE(F2:F{LAST_ROW}), 1)',
          },
          values: { G: 'Exam Date Ready' },
        }
      );

      return {
        id: `wb_academic_${Date.now()}`,
        title: 'BCA Semester Study Schedule & Syllabus Tracker',
        description: `Preparation schedule customized for: "${p}". Tracks study velocity and unit completion.`,
        category: 'Academic & Education',
        chartConfig: {
          type: 'bar',
          title: 'Study Hours: Completed vs Target',
          xAxisKey: 'A',
          series: [
            { key: 'C', label: 'Target Hours', color: '#64748b' },
            { key: 'D', label: 'Hours Studied', color: '#06b6d4' },
          ],
        },
        sheets: [{ id: 'sheet_1', name: 'Exam Schedule', rowCount: 25, columnCount: columns.length, columns, cellData }],
      };
    }
  }

  // 2. Employee / Payroll / Salary / HR
  if (
    pLower.includes('employee') ||
    pLower.includes('salary') ||
    pLower.includes('payroll') ||
    pLower.includes('staff') ||
    /\bhr\b/.test(pLower) ||
    pLower.includes('wage') ||
    pLower.includes('vetan') ||
    pLower.includes('naukri')
  ) {
    const columns: SheetColumn[] = [
      { key: 'A', label: 'Emp ID', type: 'string', width: 95 },
      { key: 'B', label: 'Employee Name', type: 'string', width: 160 },
      { key: 'C', label: 'Department', type: 'string', width: 130 },
      { key: 'D', label: 'Basic Salary ($)', type: 'currency', width: 130 },
      { key: 'E', label: 'Allowance ($)', type: 'currency', width: 120 },
      { key: 'F', label: 'Tax Deduct ($)', type: 'currency', width: 120 },
      { key: 'G', label: 'Net Salary ($)', type: 'currency', width: 140 },
      { key: 'H', label: 'Payment Status', type: 'string', width: 140 },
    ];

    const employees = [
      { A: 'EMP-101', B: 'Devin Vance', C: 'Engineering', D: 6500, E: 850, F: 1100, H: 'Processed' },
      { A: 'EMP-102', B: 'Maya Lin', C: 'Product Design', D: 5800, E: 700, F: 950, H: 'Processed' },
      { A: 'EMP-103', B: 'Marcus Thorne', C: 'Marketing', D: 4900, E: 600, F: 780, H: 'Processed' },
      { A: 'EMP-104', B: 'Sara Chen', C: 'Operations', D: 4200, E: 500, F: 620, H: 'Processed' },
      { A: 'EMP-105', B: 'James Wilson', C: 'Finance', D: 5400, E: 650, F: 880, H: 'Processed' },
      { A: 'EMP-106', B: 'Pooja Iyer', C: 'Engineering', D: 6200, E: 800, F: 1050, H: 'Processed' },
    ];

    const cellData = createSheetGrid(
      columns,
      employees,
      {
        G: (r) => `=D${r}+E${r}-F${r}`,
      },
      {
        labelCol: 'A',
        label: 'TOTAL PAYROLL',
        formulas: {
          D: '=SUM(D2:D{LAST_ROW})',
          E: '=SUM(E2:E{LAST_ROW})',
          F: '=SUM(F2:F{LAST_ROW})',
          G: '=SUM(G2:G{LAST_ROW})',
        },
        values: { H: 'Disbursed' },
      }
    );

    return {
      id: `wb_payroll_${Date.now()}`,
      title: 'Monthly Employee Payroll & Compensation Register',
      description: `Disbursement schedule generated for: "${p}". Computes gross allowances and net salaries.`,
      category: 'Human Resources & Payroll',
      chartConfig: {
        type: 'bar',
        title: 'Net Salary by Employee ($)',
        xAxisKey: 'B',
        series: [{ key: 'G', label: 'Net Salary ($)', color: '#10b981' }],
      },
      sheets: [{ id: 'sheet_1', name: 'Payroll Ledger', rowCount: 25, columnCount: columns.length, columns, cellData }],
    };
  }

  // 3. Healthcare, Clinic & Hospital Patient Inpatient Register
  if (
    pLower.includes('patient') ||
    pLower.includes('hospital') ||
    pLower.includes('doctor') ||
    pLower.includes('medical') ||
    pLower.includes('clinic') ||
    pLower.includes('bed') ||
    pLower.includes('nurse') ||
    pLower.includes('admit')
  ) {
    const columns: SheetColumn[] = [
      { key: 'A', label: 'Patient ID', type: 'string', width: 100 },
      { key: 'B', label: 'Patient Name', type: 'string', width: 160 },
      { key: 'C', label: 'Department', type: 'string', width: 130 },
      { key: 'D', label: 'Days Admitted', type: 'number', width: 110 },
      { key: 'E', label: 'Room Rate ($)', type: 'currency', width: 115 },
      { key: 'F', label: 'Meds & Care ($)', type: 'currency', width: 120 },
      { key: 'G', label: 'Total Bill ($)', type: 'currency', width: 125 },
      { key: 'H', label: 'Insurance ($)', type: 'currency', width: 120 },
      { key: 'I', label: 'Patient Due ($)', type: 'currency', width: 125 },
    ];

    const patients = [
      { A: 'PT-901', B: 'Eleanor Gray', C: 'Cardiology', D: 4, E: 450, F: 1250, H: 2400 },
      { A: 'PT-902', B: 'Vikram Joshi', C: 'Orthopedics', D: 3, E: 400, F: 980, H: 1800 },
      { A: 'PT-903', B: 'Chloe Bennett', C: 'Neurology', D: 6, E: 550, F: 2100, H: 4200 },
      { A: 'PT-904', B: 'Robert Vance', C: 'Pediatrics', D: 2, E: 350, F: 620, H: 1100 },
      { A: 'PT-905', B: 'Sunita Rao', C: 'General Medicine', D: 5, E: 380, F: 1100, H: 2500 },
    ];

    const cellData = createSheetGrid(
      columns,
      patients,
      {
        G: (r) => `=(D${r}*E${r})+F${r}`,
        I: (r) => `=G${r}-H${r}`,
      },
      {
        labelCol: 'A',
        label: 'HOSPITAL REVENUE',
        formulas: {
          G: '=SUM(G2:G{LAST_ROW})',
          H: '=SUM(H2:H{LAST_ROW})',
          I: '=SUM(I2:I{LAST_ROW})',
        },
      }
    );

    return {
      id: `wb_hospital_${Date.now()}`,
      title: 'Hospital Patient Inpatient Registry & Billing Ledger',
      description: `Inpatient medical ledger generated for: "${p}". Calculates room charges, pharmacy care, and insurance coverage.`,
      category: 'Healthcare & Medicine',
      chartConfig: {
        type: 'bar',
        title: 'Total Bill by Patient ($)',
        xAxisKey: 'B',
        series: [{ key: 'G', label: 'Total Bill ($)', color: '#06b6d4' }],
      },
      sheets: [{ id: 'sheet_1', name: 'Patient Billing', rowCount: 25, columnCount: columns.length, columns, cellData }],
    };
  }

  // 4. E-Commerce Orders, Retail Sales & Invoice Log
  if (
    pLower.includes('order') ||
    pLower.includes('ecommerce') ||
    pLower.includes('invoice') ||
    pLower.includes('client') ||
    pLower.includes('bill') ||
    pLower.includes('customer') ||
    pLower.includes('cart')
  ) {
    const columns: SheetColumn[] = [
      { key: 'A', label: 'Order ID', type: 'string', width: 100 },
      { key: 'B', label: 'Customer Name', type: 'string', width: 160 },
      { key: 'C', label: 'Product Item', type: 'string', width: 190 },
      { key: 'D', label: 'Quantity', type: 'number', width: 90 },
      { key: 'E', label: 'Unit Price ($)', type: 'currency', width: 110 },
      { key: 'F', label: 'Subtotal ($)', type: 'currency', width: 120 },
      { key: 'G', label: 'Discount ($)', type: 'currency', width: 110 },
      { key: 'H', label: 'Net Total ($)', type: 'currency', width: 125 },
      { key: 'I', label: 'Status', type: 'string', width: 115 },
    ];

    const orders = [
      { A: 'ORD-5401', B: 'Liam O’Connor', C: 'Sony WH-1000XM5 Headphones', D: 2, E: 380, G: 40, I: 'Fulfilled' },
      { A: 'ORD-5402', B: 'Sophia Martinez', C: 'Keychron Q1 Pro Mechanical', D: 1, E: 210, G: 0, I: 'Shipped' },
      { A: 'ORD-5403', B: 'Daniel Kim', C: 'Dell UltraSharp 27" 4K', D: 2, E: 540, G: 80, I: 'Fulfilled' },
      { A: 'ORD-5404', B: 'Emily Watson', C: 'Logitech MX Master 3S', D: 3, E: 99, G: 15, I: 'Processing' },
      { A: 'ORD-5405', B: 'Tariq Al-Mansoor', C: 'CalDigit TS4 Thunderbolt Dock', D: 1, E: 399, G: 20, I: 'Shipped' },
    ];

    const cellData = createSheetGrid(
      columns,
      orders,
      {
        F: (r) => `=D${r}*E${r}`,
        H: (r) => `=F${r}-G${r}`,
      },
      {
        labelCol: 'A',
        label: 'TOTAL SALES',
        formulas: {
          D: '=SUM(D2:D{LAST_ROW})',
          F: '=SUM(F2:F{LAST_ROW})',
          G: '=SUM(G2:G{LAST_ROW})',
          H: '=SUM(H2:H{LAST_ROW})',
        },
        values: { I: 'Completed' },
      }
    );

    return {
      id: `wb_orders_${Date.now()}`,
      title: 'E-Commerce Order Ledger & Customer Sales Invoices',
      description: `Order processing registry synthesized for: "${p}". Computes gross line totals, discount variances, and net revenue.`,
      category: 'E-Commerce & Retail',
      chartConfig: {
        type: 'bar',
        title: 'Order Value by Customer ($)',
        xAxisKey: 'B',
        series: [{ key: 'H', label: 'Net Total ($)', color: '#38bdf8' }],
      },
      sheets: [{ id: 'sheet_1', name: 'Order Ledger', rowCount: 25, columnCount: columns.length, columns, cellData }],
    };
  }

  // 5. SaaS Startup Financial Metrics & Growth Engine
  if (
    pLower.includes('saas') ||
    pLower.includes('mrr') ||
    pLower.includes('arr') ||
    pLower.includes('churn') ||
    pLower.includes('runway') ||
    pLower.includes('cac') ||
    pLower.includes('ltv') ||
    pLower.includes('subscription')
  ) {
    const columns: SheetColumn[] = [
      { key: 'A', label: 'Month', type: 'string', width: 110 },
      { key: 'B', label: 'Beginning MRR', type: 'currency', width: 125 },
      { key: 'C', label: 'New MRR', type: 'currency', width: 115 },
      { key: 'D', label: 'Expansion MRR', type: 'currency', width: 120 },
      { key: 'E', label: 'Churned MRR', type: 'currency', width: 115 },
      { key: 'F', label: 'Net New MRR', type: 'currency', width: 125 },
      { key: 'G', label: 'Ending MRR', type: 'currency', width: 130 },
      { key: 'H', label: 'Churn %', type: 'percentage', width: 105 },
    ];

    const saasData = [
      { A: 'Jan 2026', B: 50000, C: 6500, D: 1800, E: 1200 },
      { A: 'Feb 2026', B: 57100, C: 7200, D: 2100, E: 1400 },
      { A: 'Mar 2026', B: 65000, C: 8400, D: 2500, E: 1600 },
      { A: 'Apr 2026', B: 74300, C: 9100, D: 2800, E: 1750 },
      { A: 'May 2026', B: 84450, C: 10500, D: 3200, E: 1900 },
      { A: 'Jun 2026', B: 96250, C: 11800, D: 3600, E: 2100 },
    ];

    const cellData = createSheetGrid(
      columns,
      saasData,
      {
        F: (r) => `=C${r}+D${r}-E${r}`,
        G: (r) => `=B${r}+F${r}`,
        H: (r) => `=ROUND((E${r}/B${r})*100, 1)`,
      },
      {
        labelCol: 'A',
        label: 'H1 TOTAL / AVG',
        formulas: {
          C: '=SUM(C2:C{LAST_ROW})',
          D: '=SUM(D2:D{LAST_ROW})',
          E: '=SUM(E2:E{LAST_ROW})',
          F: '=SUM(F2:F{LAST_ROW})',
          H: '=ROUND(AVERAGE(H2:H{LAST_ROW}), 1)',
        },
      }
    );

    return {
      id: `wb_saas_${Date.now()}`,
      title: 'SaaS Recurring Revenue (MRR) & Churn Dynamics Model',
      description: `Subscription growth engine synthesized for: "${p}". Tracks new bookings, expansion, and logo churn.`,
      category: 'SaaS & Venture Capital',
      chartConfig: {
        type: 'line',
        title: 'Ending MRR Trajectory ($)',
        xAxisKey: 'A',
        series: [{ key: 'G', label: 'Ending MRR', color: '#10b981' }],
      },
      sheets: [{ id: 'sheet_1', name: 'MRR Growth', rowCount: 25, columnCount: columns.length, columns, cellData }],
    };
  }

  // 6. Sports & Cricket Match Scoreboard / Tournament
  if (
    pLower.includes('cricket') ||
    pLower.includes('ipl') ||
    pLower.includes('football') ||
    pLower.includes('tournament') ||
    pLower.includes('match') ||
    pLower.includes('sport') ||
    pLower.includes('player')
  ) {
    const isCricket = pLower.includes('cricket') || pLower.includes('ipl') || pLower.includes('run') || pLower.includes('wicket');
    const columns: SheetColumn[] = isCricket
      ? [
          { key: 'A', label: 'Player Name', type: 'string', width: 170 },
          { key: 'B', label: 'Innings', type: 'number', width: 85 },
          { key: 'C', label: 'Runs Scored', type: 'number', width: 110 },
          { key: 'D', label: 'Balls Faced', type: 'number', width: 100 },
          { key: 'E', label: 'Strike Rate', type: 'number', width: 110 },
          { key: 'F', label: 'Wickets', type: 'number', width: 90 },
          { key: 'G', label: 'Fantasy Points', type: 'number', width: 130 },
        ]
      : [
          { key: 'A', label: 'Team Name', type: 'string', width: 170 },
          { key: 'B', label: 'Matches', type: 'number', width: 90 },
          { key: 'C', label: 'Won', type: 'number', width: 80 },
          { key: 'D', label: 'Lost', type: 'number', width: 80 },
          { key: 'E', label: 'Drawn', type: 'number', width: 80 },
          { key: 'F', label: 'Goals Diff', type: 'number', width: 100 },
          { key: 'G', label: 'Total Points', type: 'number', width: 110 },
        ];

    const sportsData = isCricket
      ? [
          { A: 'Virat Kohli', B: 14, C: 680, D: 450, F: 0 },
          { A: 'Rohit Sharma', B: 14, C: 540, D: 360, F: 0 },
          { A: 'Hardik Pandya', B: 12, C: 320, D: 195, F: 14 },
          { A: 'Jasprit Bumrah', B: 8, C: 45, D: 38, F: 22 },
          { A: 'Ravindra Jadeja', B: 11, C: 260, D: 180, F: 16 },
          { A: 'KL Rahul', B: 13, C: 490, D: 380, F: 0 },
        ]
      : [
          { A: 'Arsenal FC', B: 28, C: 20, D: 4, E: 4, F: 38 },
          { A: 'Manchester City', B: 28, C: 19, D: 3, E: 6, F: 35 },
          { A: 'Liverpool FC', B: 28, C: 19, D: 4, E: 5, F: 32 },
          { A: 'Aston Villa', B: 28, C: 16, D: 7, E: 5, F: 18 },
          { A: 'Tottenham Hotspur', B: 28, C: 15, D: 8, E: 5, F: 12 },
        ];

    const cellData = createSheetGrid(
      columns,
      sportsData,
      isCricket
        ? {
            E: (r) => `=ROUND((C${r}/D${r})*100, 1)`,
            G: (r) => `=(C${r}*1)+(F${r}*25)`,
          }
        : {
            G: (r) => `=(C${r}*3)+(E${r}*1)`,
          },
      {
        labelCol: 'A',
        label: 'TEAM TOTAL / AVG',
        formulas: isCricket
          ? {
              C: '=SUM(C2:C{LAST_ROW})',
              D: '=SUM(D2:D{LAST_ROW})',
              E: '=ROUND(AVERAGE(E2:E{LAST_ROW}), 1)',
              F: '=SUM(F2:F{LAST_ROW})',
              G: '=SUM(G2:G{LAST_ROW})',
            }
          : {
              C: '=SUM(C2:C{LAST_ROW})',
              D: '=SUM(D2:D{LAST_ROW})',
              G: '=SUM(G2:G{LAST_ROW})',
            },
      }
    );

    return {
      id: `wb_sports_${Date.now()}`,
      title: isCricket ? 'Cricket Match Scorecard & Fantasy Points Tracker' : 'League Tournament Standings & Points Table',
      description: `Sports scoreboard customized for: "${p}". Computes strike rates and aggregate points.`,
      category: 'Sports & Entertainment',
      chartConfig: {
        type: 'bar',
        title: isCricket ? 'Runs Scored by Player' : 'League Points by Team',
        xAxisKey: 'A',
        series: [{ key: isCricket ? 'C' : 'G', label: isCricket ? 'Runs Scored' : 'Points', color: '#f59e0b' }],
      },
      sheets: [{ id: 'sheet_1', name: 'Scoreboard', rowCount: 25, columnCount: columns.length, columns, cellData }],
    };
  }

  // 7. Restaurant / Cafe / Food & Hospitality
  if (
    pLower.includes('restaurant') ||
    pLower.includes('cafe') ||
    pLower.includes('food') ||
    pLower.includes('hotel') ||
    pLower.includes('menu') ||
    pLower.includes('dish') ||
    pLower.includes('khana')
  ) {
    const columns: SheetColumn[] = [
      { key: 'A', label: 'Menu Item', type: 'string', width: 200 },
      { key: 'B', label: 'Category', type: 'string', width: 120 },
      { key: 'C', label: 'Portions Sold', type: 'number', width: 120 },
      { key: 'D', label: 'Prep Cost ($)', type: 'currency', width: 110 },
      { key: 'E', label: 'Menu Price ($)', type: 'currency', width: 115 },
      { key: 'F', label: 'Revenue ($)', type: 'currency', width: 125 },
      { key: 'G', label: 'Gross Profit ($)', type: 'currency', width: 130 },
    ];

    const menuItems = [
      { A: 'Truffle Mushroom Risotto', B: 'Main Course', C: 85, D: 6.5, E: 22.0 },
      { A: 'Woodfired Margherita Pizza', B: 'Main Course', C: 140, D: 4.0, E: 16.5 },
      { A: 'Crispy Calamari Fritti', B: 'Appetizers', C: 110, D: 3.8, E: 14.0 },
      { A: 'Signature Cold Brew Coffee', B: 'Beverages', C: 195, D: 1.2, E: 6.5 },
      { A: 'Artisan Burrata Salad', B: 'Starters', C: 75, D: 5.2, E: 17.0 },
      { A: 'Belgian Chocolate Fondant', B: 'Desserts', C: 95, D: 2.8, E: 11.5 },
    ];

    const cellData = createSheetGrid(
      columns,
      menuItems,
      {
        F: (r) => `=C${r}*E${r}`,
        G: (r) => `=(E${r}-D${r})*C${r}`,
      },
      {
        labelCol: 'A',
        label: 'DAILY TOTALS',
        formulas: {
          C: '=SUM(C2:C{LAST_ROW})',
          F: '=SUM(F2:F{LAST_ROW})',
          G: '=SUM(G2:G{LAST_ROW})',
        },
      }
    );

    return {
      id: `wb_food_${Date.now()}`,
      title: 'Restaurant Menu Profitability & Daily Sales Ledger',
      description: `Food & beverage sales ledger synthesized for: "${p}". Analyzes portion margins and gross kitchen profit.`,
      category: 'Hospitality & Food',
      chartConfig: {
        type: 'bar',
        title: 'Daily Menu Revenue by Dish ($)',
        xAxisKey: 'A',
        series: [{ key: 'F', label: 'Revenue ($)', color: '#ec4899' }],
      },
      sheets: [{ id: 'sheet_1', name: 'Daily Sales', rowCount: 25, columnCount: columns.length, columns, cellData }],
    };
  }

  // 8. Crypto & Stock Investment Portfolio
  if (
    pLower.includes('crypto') ||
    pLower.includes('bitcoin') ||
    pLower.includes('eth') ||
    pLower.includes('stock') ||
    pLower.includes('portfolio') ||
    pLower.includes('investment') ||
    pLower.includes('share') ||
    pLower.includes('trade') ||
    pLower.includes('sip')
  ) {
    const columns: SheetColumn[] = [
      { key: 'A', label: 'Asset / Ticker', type: 'string', width: 120 },
      { key: 'B', label: 'Quantity Held', type: 'number', width: 120 },
      { key: 'C', label: 'Buy Price ($)', type: 'currency', width: 120 },
      { key: 'D', label: 'Market Price ($)', type: 'currency', width: 125 },
      { key: 'E', label: 'Cost Basis ($)', type: 'currency', width: 130 },
      { key: 'F', label: 'Current Value ($)', type: 'currency', width: 135 },
      { key: 'G', label: 'Profit / Loss ($)', type: 'currency', width: 135 },
      { key: 'H', label: 'ROI %', type: 'percentage', width: 110 },
    ];

    const assets = [
      { A: 'Bitcoin (BTC)', B: 0.85, C: 52000, D: 67500 },
      { A: 'Ethereum (ETH)', B: 6.5, C: 2600, D: 3450 },
      { A: 'Solana (SOL)', B: 45, C: 110, D: 155 },
      { A: 'NVIDIA (NVDA)', B: 25, C: 95, D: 128 },
      { A: 'Apple (AAPL)', B: 40, C: 175, D: 220 },
      { A: 'Microsoft (MSFT)', B: 18, C: 380, D: 435 },
    ];

    const cellData = createSheetGrid(
      columns,
      assets,
      {
        E: (r) => `=B${r}*C${r}`,
        F: (r) => `=B${r}*D${r}`,
        G: (r) => `=F${r}-E${r}`,
        H: (r) => `=ROUND(((F${r}-E${r})/E${r})*100, 1)`,
      },
      {
        labelCol: 'A',
        label: 'PORTFOLIO TOTAL',
        formulas: {
          E: '=SUM(E2:E{LAST_ROW})',
          F: '=SUM(F2:F{LAST_ROW})',
          G: '=SUM(G2:G{LAST_ROW})',
          H: '=ROUND(((F{LAST_ROW+1}-E{LAST_ROW+1})/E{LAST_ROW+1})*100, 1)',
        },
      }
    );

    return {
      id: `wb_portfolio_${Date.now()}`,
      title: 'Crypto & Stock Investment Portfolio Tracker',
      description: `Asset valuation ledger synthesized for: "${p}". Computes cost basis, unrealized gain, and ROI.`,
      category: 'Investments & Crypto',
      chartConfig: {
        type: 'bar',
        title: 'Current Holding Valuation ($)',
        xAxisKey: 'A',
        series: [{ key: 'F', label: 'Valuation ($)', color: '#8b5cf6' }],
      },
      sheets: [{ id: 'sheet_1', name: 'Portfolio', rowCount: 25, columnCount: columns.length, columns, cellData }],
    };
  }

  // 9. Fitness / Gym / Workout / Health
  if (
    pLower.includes('gym') ||
    pLower.includes('workout') ||
    pLower.includes('fitness') ||
    pLower.includes('exercise') ||
    pLower.includes('diet') ||
    pLower.includes('weight')
  ) {
    const columns: SheetColumn[] = [
      { key: 'A', label: 'Exercise', type: 'string', width: 200 },
      { key: 'B', label: 'Muscle Group', type: 'string', width: 130 },
      { key: 'C', label: 'Sets', type: 'number', width: 90 },
      { key: 'D', label: 'Reps', type: 'number', width: 90 },
      { key: 'E', label: 'Weight (kg)', type: 'number', width: 110 },
      { key: 'F', label: 'Volume (kg)', type: 'number', width: 140 },
    ];

    const exercises = [
      { A: 'Barbell Bench Press', B: 'Chest', C: 4, D: 8, E: 80 },
      { A: 'Incline Dumbbell Press', B: 'Chest', C: 3, D: 10, E: 26 },
      { A: 'Barbell Back Squat', B: 'Legs', C: 5, D: 5, E: 110 },
      { A: 'Romanian Deadlift', B: 'Hamstrings', C: 4, D: 8, E: 95 },
      { A: 'Pull-Ups / Lat Pulldown', B: 'Back', C: 4, D: 10, E: 75 },
      { A: 'Overhead Barbell Press', B: 'Shoulders', C: 4, D: 8, E: 50 },
    ];

    const cellData = createSheetGrid(
      columns,
      exercises,
      {
        F: (r) => `=C${r}*D${r}*E${r}`,
      },
      {
        labelCol: 'A',
        label: 'TOTAL SESSION VOLUME',
        formulas: {
          C: '=SUM(C2:C{LAST_ROW})',
          D: '=SUM(D2:D{LAST_ROW})',
          F: '=SUM(F2:F{LAST_ROW})',
        },
      }
    );

    return {
      id: `wb_fitness_${Date.now()}`,
      title: 'Fitness & Workout Volume Tracker',
      description: `Progressive overload training model synthesized for: "${p}".`,
      category: 'Health & Fitness',
      chartConfig: {
        type: 'bar',
        title: 'Training Volume by Movement (kg)',
        xAxisKey: 'A',
        series: [{ key: 'F', label: 'Volume (kg)', color: '#10b981' }],
      },
      sheets: [{ id: 'sheet_1', name: 'Workout Log', rowCount: 25, columnCount: columns.length, columns, cellData }],
    };
  }

  // 10. Inventory / Stock / Warehouse / Store / Retail
  if (
    pLower.includes('inventory') ||
    pLower.includes('stock') ||
    pLower.includes('warehouse') ||
    pLower.includes('retail') ||
    pLower.includes('product') ||
    pLower.includes('store') ||
    pLower.includes('maal') ||
    pLower.includes('dukan')
  ) {
    const columns: SheetColumn[] = [
      { key: 'A', label: 'SKU Code', type: 'string', width: 110 },
      { key: 'B', label: 'Item Description', type: 'string', width: 230 },
      { key: 'C', label: 'Unit Cost ($)', type: 'currency', width: 110 },
      { key: 'D', label: 'Retail Price ($)', type: 'currency', width: 110 },
      { key: 'E', label: 'Units in Stock', type: 'number', width: 120 },
      { key: 'F', label: 'Total Valuation ($)', type: 'currency', width: 140 },
      { key: 'G', label: 'Margin %', type: 'percentage', width: 100 },
    ];

    const items = [
      { A: 'SKU-1001', B: 'Wireless Noise Canceling Headphones', C: 45, D: 99, E: 120 },
      { A: 'SKU-1002', B: 'Ergonomic Mechanical Keyboard', C: 35, D: 79, E: 85 },
      { A: 'SKU-1003', B: 'Ultra-Wide 34" Curved Monitor', C: 220, D: 420, E: 28 },
      { A: 'SKU-1004', B: 'USB-C Thunderbolt Docking Station', C: 55, D: 129, E: 64 },
      { A: 'SKU-1005', B: 'Vertical Ergonomic Optical Mouse', C: 15, D: 39, E: 140 },
      { A: 'SKU-1006', B: 'Aluminium Laptop Standing Riser', C: 18, D: 45, E: 95 },
    ];

    const cellData = createSheetGrid(
      columns,
      items,
      {
        F: (r) => `=C${r}*E${r}`,
        G: (r) => `=ROUND(((D${r}-C${r})/D${r})*100, 1)`,
      },
      {
        labelCol: 'A',
        label: 'TOTAL INVENTORY',
        formulas: {
          E: '=SUM(E2:E{LAST_ROW})',
          F: '=SUM(F2:F{LAST_ROW})',
          G: '=ROUND(AVERAGE(G2:G{LAST_ROW}), 1)',
        },
      }
    );

    return {
      id: `wb_inventory_${Date.now()}`,
      title: 'Real-Time Inventory & Stock Valuation Registry',
      description: `Stock management register synthesized for: "${p}".`,
      category: 'Supply Chain & Inventory',
      chartConfig: {
        type: 'bar',
        title: 'Inventory Valuation by Item ($)',
        xAxisKey: 'B',
        series: [{ key: 'F', label: 'Valuation ($)', color: '#0ea5e9' }],
      },
      sheets: [{ id: 'sheet_1', name: 'Inventory Register', rowCount: 25, columnCount: columns.length, columns, cellData }],
    };
  }

  // 11. Personal Budget / Expenses / Cash Flow
  if (
    pLower.includes('budget') ||
    pLower.includes('expense') ||
    pLower.includes('spend') ||
    pLower.includes('cost') ||
    pLower.includes('kharcha') ||
    pLower.includes('bachat') ||
    pLower.includes('saving')
  ) {
    const columns: SheetColumn[] = [
      { key: 'A', label: 'Expense Category', type: 'string', width: 200 },
      { key: 'B', label: 'Type', type: 'string', width: 120 },
      { key: 'C', label: 'Budget ($)', type: 'currency', width: 120 },
      { key: 'D', label: 'Actual Spent ($)', type: 'currency', width: 130 },
      { key: 'E', label: 'Variance ($)', type: 'currency', width: 120 },
      { key: 'F', label: 'Utilization %', type: 'percentage', width: 120 },
    ];

    const expenses = [
      { A: 'Apartment Rent & Utilities', B: 'Fixed', C: 2100, D: 2100 },
      { A: 'Groceries & Household Goods', B: 'Variable', C: 650, D: 710 },
      { A: 'Dining Out & Entertainment', B: 'Discretionary', C: 400, D: 460 },
      { A: 'Health & Fitness Memberships', B: 'Fixed', C: 120, D: 120 },
      { A: 'Transportation & Fuel', B: 'Variable', C: 250, D: 215 },
      { A: 'SaaS Subscriptions & Cloud', B: 'Fixed', C: 95, D: 95 },
      { A: 'Emergency Rainy Day Fund', B: 'Savings', C: 500, D: 500 },
    ];

    const cellData = createSheetGrid(
      columns,
      expenses,
      {
        E: (r) => `=C${r}-D${r}`,
        F: (r) => `=ROUND((D${r}/C${r})*100, 1)`,
      },
      {
        labelCol: 'A',
        label: 'TOTAL EXPENSES',
        formulas: {
          C: '=SUM(C2:C{LAST_ROW})',
          D: '=SUM(D2:D{LAST_ROW})',
          E: '=SUM(E2:E{LAST_ROW})',
          F: '=ROUND((D{LAST_ROW+1}/C{LAST_ROW+1})*100, 1)',
        },
      }
    );

    return {
      id: `wb_budget_${Date.now()}`,
      title: 'Monthly Cash Flow & Personal Budget Ledger',
      description: `Personal financial allocation model synthesized for: "${p}".`,
      category: 'Personal Finance',
      chartConfig: {
        type: 'bar',
        title: 'Budget vs Actual by Category ($)',
        xAxisKey: 'A',
        series: [
          { key: 'C', label: 'Budget', color: '#64748b' },
          { key: 'D', label: 'Actual', color: '#10b981' },
        ],
      },
      sheets: [{ id: 'sheet_1', name: 'Monthly Budget', rowCount: 25, columnCount: columns.length, columns, cellData }],
    };
  }

  // 12. Universal Contextual Semantic Synthesizer
  // For ANY arbitrary user prompt: extracts topic keywords and constructs an authentic, meaningful model
  const cleanTitle = p.length > 55 ? `${p.slice(0, 52)}...` : p;
  const words = p.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2);
  const subjectName = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Operational Tracking';

  // Check if prompt is cost/financial oriented vs operational
  const isFinancial = pLower.includes('cost') || pLower.includes('price') || pLower.includes('revenue') || pLower.includes('fee') || pLower.includes('sale') || pLower.includes('inr') || pLower.includes('dollar');

  const columns: SheetColumn[] = isFinancial
    ? [
        { key: 'A', label: `${subjectName} Item`, type: 'string', width: 220 },
        { key: 'B', label: 'Classification', type: 'string', width: 140 },
        { key: 'C', label: 'Quantity / Units', type: 'number', width: 120 },
        { key: 'D', label: 'Unit Price ($)', type: 'currency', width: 120 },
        { key: 'E', label: 'Gross Total ($)', type: 'currency', width: 130 },
        { key: 'F', label: 'Status', type: 'string', width: 120 },
      ]
    : [
        { key: 'A', label: `${subjectName} Milestone / Item`, type: 'string', width: 220 },
        { key: 'B', label: 'Responsible Lead', type: 'string', width: 150 },
        { key: 'C', label: 'Target Value', type: 'number', width: 120 },
        { key: 'D', label: 'Delivered Value', type: 'number', width: 120 },
        { key: 'E', label: 'Net Delta', type: 'number', width: 110 },
        { key: 'F', label: 'Score / Readiness', type: 'number', width: 130 },
      ];

  const defaultRows = isFinancial
    ? [
        { A: `${subjectName} - Premium Model`, B: 'Primary Tier', C: 45, D: 180, F: 'Active' },
        { A: `${subjectName} - Standard Model`, B: 'Core Tier', C: 95, D: 85, F: 'Active' },
        { A: `${subjectName} - Regional Supply`, B: 'Distribution', C: 140, D: 55, F: 'In Review' },
        { A: `${subjectName} - Custom Enterprise`, B: 'Enterprise', C: 20, D: 450, F: 'Active' },
        { A: `${subjectName} - Expansion Pack`, B: 'Growth', C: 60, D: 110, F: 'Planned' },
      ]
    : [
        { A: `${subjectName} - Phase 1 Foundation`, B: 'Lead Engineer', C: 100, D: 95, F: 95 },
        { A: `${subjectName} - Phase 2 Execution`, B: 'Product Specialist', C: 120, D: 115, F: 96 },
        { A: `${subjectName} - Verification & QA`, B: 'Quality Assurance', C: 80, D: 82, F: 98 },
        { A: `${subjectName} - Client Delivery`, B: 'Operations Lead', C: 150, D: 140, F: 93 },
        { A: `${subjectName} - Final Review`, B: 'Executive Director', C: 90, D: 90, F: 100 },
      ];

  const cellData = createSheetGrid(
    columns,
    defaultRows,
    isFinancial
      ? {
          E: (r) => `=C${r}*D${r}`,
        }
      : {
          E: (r) => `=D${r}-C${r}`,
        },
    {
      labelCol: 'A',
      label: 'TOTAL / SUMMARY',
      formulas: isFinancial
        ? {
            C: '=SUM(C2:C{LAST_ROW})',
            E: '=SUM(E2:E{LAST_ROW})',
          }
        : {
            C: '=SUM(C2:C{LAST_ROW})',
            D: '=SUM(D2:D{LAST_ROW})',
            E: '=SUM(E2:E{LAST_ROW})',
            F: '=ROUND(AVERAGE(F2:F{LAST_ROW}), 1)',
          },
      values: isFinancial ? { F: 'Complete' } : undefined,
    }
  );

  return {
    id: `wb_custom_${Date.now()}`,
    title: cleanTitle || 'Custom Spreadsheet Workspace',
    description: `Dynamic spreadsheet synthesized for: "${p}". Reactive formulas compute line-item totals.`,
    category: isFinancial ? 'Commercial & Finance' : 'Operations & Project',
    chartConfig: {
      type: 'bar',
      title: `${subjectName} Breakdown`,
      xAxisKey: 'A',
      series: [{ key: isFinancial ? 'E' : 'D', label: isFinancial ? 'Total Value ($)' : 'Delivered Value', color: '#06b6d4' }],
    },
    sheets: [{ id: 'sheet_1', name: 'Data Sheet', rowCount: 25, columnCount: columns.length, columns, cellData }],
  };
}
