import { WorkbookModel } from '@/types/sheet';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';

export const GOLDEN_TEMPLATES: Record<string, WorkbookModel> = {
  saas_runway: {
    id: 'saas_runway',
    title: 'SaaS 12-Month Runway & Burn Rate Model',
    description: 'Models MRR growth, operating expenses, net burn rate, and remaining cash runway.',
    category: 'Finance',
    chartConfig: {
      type: 'line',
      title: 'Monthly Cash Balance vs Net Burn ($)',
      xAxisKey: 'Month',
      series: [
        { key: 'Cash Balance', label: 'Cash Balance', color: '#10B981' },
        { key: 'Net Burn', label: 'Net Burn', color: '#EF4444' },
      ],
    },
    sheets: [
      {
        id: 'runway_sheet',
        name: '12-Month Runway',
        rowCount: 14,
        columnCount: 6,
        columns: [
          { key: 'A', label: 'Month', type: 'string', width: 110 },
          { key: 'B', label: 'MRR', type: 'currency', width: 130 },
          { key: 'C', label: 'Salaries', type: 'currency', width: 130 },
          { key: 'D', label: 'Marketing', type: 'currency', width: 130 },
          { key: 'E', label: 'Net Burn', type: 'currency', width: 130 },
          { key: 'F', label: 'Cash Balance', type: 'currency', width: 150 },
        ],
        cellData: recalculateWorkbook({
          A1: { v: 'Month', bold: true },
          B1: { v: 'MRR', bold: true },
          C1: { v: 'Salaries', bold: true },
          D1: { v: 'Marketing', bold: true },
          E1: { v: 'Net Burn', bold: true },
          F1: { v: 'Cash Balance', bold: true },

          A2: { v: 'Month 1' }, B2: { v: 18000 }, C2: { v: 42000 }, D2: { v: 8000 }, E2: { f: '=(C2+D2)-B2' }, F2: { v: 468000 },
          A3: { v: 'Month 2' }, B3: { v: 22000 }, C3: { v: 42000 }, D3: { v: 9500 }, E3: { f: '=(C3+D3)-B3' }, F3: { f: '=F2-E3' },
          A4: { v: 'Month 3' }, B4: { v: 27500 }, C4: { v: 45000 }, D4: { v: 11000 }, E4: { f: '=(C4+D4)-B4' }, F4: { f: '=F3-E4' },
          A5: { v: 'Month 4' }, B5: { v: 34000 }, C5: { v: 45000 }, D5: { v: 12500 }, E5: { f: '=(C5+D5)-B5' }, F5: { f: '=F4-E5' },
          A6: { v: 'Month 5' }, B6: { v: 42000 }, C6: { v: 52000 }, D6: { v: 14000 }, E6: { f: '=(C6+D6)-B6' }, F6: { f: '=F5-E6' },
          A7: { v: 'Month 6' }, B7: { v: 52000 }, C7: { v: 52000 }, D7: { v: 16000 }, E7: { f: '=(C7+D7)-B7' }, F7: { f: '=F6-E7' },
          A8: { v: 'Month 7' }, B8: { v: 64000 }, C8: { v: 58000 }, D8: { v: 18000 }, E8: { f: '=(C8+D8)-B8' }, F8: { f: '=F7-E8' },
          A9: { v: 'Month 8' }, B9: { v: 78000 }, C9: { v: 58000 }, D9: { v: 20000 }, E9: { f: '=(C9+D9)-B9' }, F9: { f: '=F8-E9' },
          A10: { v: 'Month 9' }, B10: { v: 95000 }, C10: { v: 66000 }, D10: { v: 22000 }, E10: { f: '=(C10+D10)-B10' }, F10: { f: '=F9-E10' },
          A11: { v: 'Month 10' }, B11: { v: 115000 }, C11: { v: 66000 }, D11: { v: 24000 }, E11: { f: '=(C11+D11)-B11' }, F11: { f: '=F10-E11' },
          A12: { v: 'Month 11' }, B12: { v: 138000 }, C12: { v: 75000 }, D12: { v: 26000 }, E12: { f: '=(C12+D12)-B12' }, F12: { f: '=F11-E12' },
          A13: { v: 'Month 12' }, B13: { v: 165000 }, C13: { v: 75000 }, D13: { v: 28000 }, E13: { f: '=(C13+D13)-B13' }, F13: { f: '=F12-E13' },

          A14: { v: 'TOTAL / AVG', bold: true },
          B14: { f: '=SUM(B2:B13)', bold: true },
          C14: { f: '=SUM(C2:C13)', bold: true },
          D14: { f: '=SUM(D2:D13)', bold: true },
          E14: { f: '=AVERAGE(E2:E13)', bold: true },
          F14: { f: '=MIN(F2:F13)', bold: true },
        }),
      },
    ],
  },

  cac_cohort: {
    id: 'cac_cohort',
    title: 'Multi-Channel CAC, LTV & Payback Cohort',
    description: 'Compares customer acquisition cost, conversion rate, and payback months across ad channels.',
    category: 'Marketing',
    chartConfig: {
      type: 'bar',
      title: 'Customer Acquisition Cost (CAC) by Channel ($)',
      xAxisKey: 'Channel',
      series: [
        { key: 'CAC', label: 'Blended CAC ($)', color: '#3B82F6' },
        { key: 'LTV', label: '12M LTV ($)', color: '#10B981' },
      ],
    },
    sheets: [
      {
        id: 'cac_sheet',
        name: 'CAC Analytics',
        rowCount: 7,
        columnCount: 6,
        columns: [
          { key: 'A', label: 'Channel', type: 'string', width: 140 },
          { key: 'B', label: 'Ad Spend', type: 'currency', width: 130 },
          { key: 'C', label: 'New Customers', type: 'number', width: 140 },
          { key: 'D', label: 'CAC', type: 'currency', width: 120 },
          { key: 'E', label: '12M LTV', type: 'currency', width: 120 },
          { key: 'F', label: 'LTV / CAC Ratio', type: 'number', width: 140 },
        ],
        cellData: recalculateWorkbook({
          A1: { v: 'Channel', bold: true },
          B1: { v: 'Ad Spend', bold: true },
          C1: { v: 'New Customers', bold: true },
          D1: { v: 'CAC', bold: true },
          E1: { v: '12M LTV', bold: true },
          F1: { v: 'LTV / CAC Ratio', bold: true },

          A2: { v: 'Google Search Ads' }, B2: { v: 45000 }, C2: { v: 360 }, D2: { f: '=B2/C2' }, E2: { v: 520 }, F2: { f: '=E2/D2' },
          A3: { v: 'Meta Video Ads' }, B3: { v: 38000 }, C3: { v: 290 }, D3: { f: '=B3/C3' }, E3: { v: 460 }, F3: { f: '=E3/D3' },
          A4: { v: 'LinkedIn B2B Ads' }, B4: { v: 28000 }, C4: { v: 140 }, D4: { f: '=B4/C4' }, E4: { v: 980 }, F4: { f: '=E4/D4' },
          A5: { v: 'Organic & SEO' }, B5: { v: 12000 }, C5: { v: 410 }, D5: { f: '=B5/C5' }, E5: { v: 640 }, F5: { f: '=E5/D5' },
          A6: { v: 'Affiliate & Referral' }, B6: { v: 9000 }, C6: { v: 190 }, D6: { f: '=B6/C6' }, E6: { v: 510 }, F6: { f: '=E6/D6' },

          A7: { v: 'TOTAL BLENDED', bold: true },
          B7: { f: '=SUM(B2:B6)', bold: true },
          C7: { f: '=SUM(C2:C6)', bold: true },
          D7: { f: '=B7/C7', bold: true },
          E7: { f: '=AVERAGE(E2:E6)', bold: true },
          F7: { f: '=E7/D7', bold: true },
        }),
      },
    ],
  },

  cap_table: {
    id: 'cap_table',
    title: 'Startup Cap Table & Ownership Dilution Model',
    description: 'Tracks shareholder equity percentages, share counts, and valuation dilution post-Series A.',
    category: 'Startup',
    chartConfig: {
      type: 'bar',
      title: 'Shareholder Ownership Percentage (%)',
      xAxisKey: 'Shareholder',
      series: [
        { key: 'Post-Money %', label: 'Ownership %', color: '#10B981' },
      ],
    },
    sheets: [
      {
        id: 'cap_sheet',
        name: 'Cap Table',
        rowCount: 7,
        columnCount: 5,
        columns: [
          { key: 'A', label: 'Shareholder', type: 'string', width: 150 },
          { key: 'B', label: 'Shares Count', type: 'number', width: 140 },
          { key: 'C', label: 'Pre-Money %', type: 'percentage', width: 130 },
          { key: 'D', label: 'New Investment ($)', type: 'currency', width: 150 },
          { key: 'E', label: 'Post-Money %', type: 'percentage', width: 140 },
        ],
        cellData: recalculateWorkbook({
          A1: { v: 'Shareholder', bold: true },
          B1: { v: 'Shares Count', bold: true },
          C1: { v: 'Pre-Money %', bold: true },
          D1: { v: 'New Investment ($)', bold: true },
          E1: { v: 'Post-Money %', bold: true },

          A2: { v: 'Founders' }, B2: { v: 5000000 }, C2: { v: 0.50 }, D2: { v: 0 }, E2: { v: 0.38 },
          A3: { v: 'Employee Option Pool' }, B3: { v: 1500000 }, C3: { v: 0.15 }, D3: { v: 0 }, E3: { v: 0.12 },
          A4: { v: 'Seed Investors' }, B4: { v: 2000000 }, C4: { v: 0.20 }, D4: { v: 0 }, E4: { v: 0.15 },
          A5: { v: 'Series A Lead VC' }, B5: { v: 2500000 }, C5: { v: 0.00 }, D5: { v: 5000000 }, E5: { v: 0.25 },
          A6: { v: 'Angel Syndicate' }, B6: { v: 1000000 }, C6: { v: 0.15 }, D6: { v: 1000000 }, E6: { v: 0.10 },

          A7: { v: 'TOTAL FULLY DILUTED', bold: true },
          B7: { f: '=SUM(B2:B6)', bold: true },
          C7: { f: '=SUM(C2:C6)', bold: true },
          D7: { f: '=SUM(D2:D6)', bold: true },
          E7: { f: '=SUM(E2:E6)', bold: true },
        }),
      },
    ],
  },

  dept_budget: {
    id: 'dept_budget',
    title: 'Quarterly Departmental Budget Variance',
    description: 'Tracks allocated vs actual expenditures across Engineering, Sales, Product, and G&A.',
    category: 'Operations',
    chartConfig: {
      type: 'bar',
      title: 'Allocated vs Actual Budget ($)',
      xAxisKey: 'Department',
      series: [
        { key: 'Allocated', label: 'Allocated ($)', color: '#3B82F6' },
        { key: 'Actual', label: 'Actual ($)', color: '#EF4444' },
      ],
    },
    sheets: [
      {
        id: 'budget_sheet',
        name: 'Q3 Budget',
        rowCount: 7,
        columnCount: 6,
        columns: [
          { key: 'A', label: 'Department', type: 'string', width: 140 },
          { key: 'B', label: 'Allocated', type: 'currency', width: 130 },
          { key: 'C', label: 'Actual Spend', type: 'currency', width: 130 },
          { key: 'D', label: 'Variance ($)', type: 'currency', width: 130 },
          { key: 'E', label: 'Variance %', type: 'percentage', width: 120 },
          { key: 'F', label: 'Status', type: 'string', width: 120 },
        ],
        cellData: recalculateWorkbook({
          A1: { v: 'Department', bold: true },
          B1: { v: 'Allocated', bold: true },
          C1: { v: 'Actual Spend', bold: true },
          D1: { v: 'Variance ($)', bold: true },
          E1: { v: 'Variance %', bold: true },
          F1: { v: 'Status', bold: true },

          A2: { v: 'Engineering & DevOps' }, B2: { v: 120000 }, C2: { v: 114000 }, D2: { f: '=B2-C2' }, E2: { f: '=D2/B2' }, F2: { v: 'Under Budget' },
          A3: { v: 'Growth & Marketing' }, B3: { v: 65000 }, C3: { v: 72000 }, D3: { f: '=B3-C3' }, E3: { f: '=D3/B3' }, F3: { v: 'Over Budget' },
          A4: { v: 'Sales & Account Execs' }, B4: { v: 85000 }, C4: { v: 81000 }, D4: { f: '=B4-C4' }, E4: { f: '=D4/B4' }, F4: { v: 'Under Budget' },
          A5: { v: 'Product & Design' }, B5: { v: 45000 }, C5: { v: 43500 }, D5: { f: '=B5-C5' }, E5: { f: '=D5/B5' }, F5: { v: 'Under Budget' },
          A6: { v: 'Legal & Compliance' }, B6: { v: 25000 }, C6: { v: 28000 }, D6: { f: '=B6-C6' }, E6: { f: '=D6/B6' }, F6: { v: 'Over Budget' },

          A7: { v: 'TOTAL COMPANY', bold: true },
          B7: { f: '=SUM(B2:B6)', bold: true },
          C7: { f: '=SUM(C2:C6)', bold: true },
          D7: { f: '=B7-C7', bold: true },
          E7: { f: '=D7/B7', bold: true },
          F7: { v: 'On Track', bold: true },
        }),
      },
    ],
  },

  sprint_velocity: {
    id: 'sprint_velocity',
    title: 'Agile Sprint Velocity & Story Points Tracker',
    description: 'Calculates team story point completion rates, carry-overs, and velocity trends over 6 sprints.',
    category: 'Engineering',
    chartConfig: {
      type: 'line',
      title: 'Committed vs Completed Story Points',
      xAxisKey: 'Sprint',
      series: [
        { key: 'Committed', label: 'Committed Points', color: '#3B82F6' },
        { key: 'Completed', label: 'Completed Points', color: '#10B981' },
      ],
    },
    sheets: [
      {
        id: 'velocity_sheet',
        name: 'Sprint Velocity',
        rowCount: 8,
        columnCount: 6,
        columns: [
          { key: 'A', label: 'Sprint', type: 'string', width: 110 },
          { key: 'B', label: 'Committed', type: 'number', width: 120 },
          { key: 'C', label: 'Completed', type: 'number', width: 120 },
          { key: 'D', label: 'Carry-Over', type: 'number', width: 120 },
          { key: 'E', label: 'Completion %', type: 'percentage', width: 130 },
          { key: 'F', label: 'Team Velocity', type: 'number', width: 130 },
        ],
        cellData: recalculateWorkbook({
          A1: { v: 'Sprint', bold: true },
          B1: { v: 'Committed', bold: true },
          C1: { v: 'Completed', bold: true },
          D1: { v: 'Carry-Over', bold: true },
          E1: { v: 'Completion %', bold: true },
          F1: { v: 'Team Velocity', bold: true },

          A2: { v: 'Sprint 21' }, B2: { v: 48 }, C2: { v: 44 }, D2: { f: '=B2-C2' }, E2: { f: '=C2/B2' }, F2: { v: 44 },
          A3: { v: 'Sprint 22' }, B3: { v: 52 }, C3: { v: 50 }, D3: { f: '=B3-C3' }, E3: { f: '=C3/B3' }, F3: { f: '=(C2+C3)/2' },
          A4: { v: 'Sprint 23' }, B4: { v: 55 }, C4: { v: 51 }, D4: { f: '=B4-C4' }, E4: { f: '=C4/B4' }, F4: { f: '=(C2+C3+C4)/3' },
          A5: { v: 'Sprint 24' }, B5: { v: 60 }, C5: { v: 58 }, D5: { f: '=B5-C5' }, E5: { f: '=C5/B5' }, F5: { f: '=(C3+C4+C5)/3' },
          A6: { v: 'Sprint 25' }, B6: { v: 64 }, C6: { v: 61 }, D6: { f: '=B6-C6' }, E6: { f: '=C6/B6' }, F6: { f: '=(C4+C5+C6)/3' },
          A7: { v: 'Sprint 26' }, B7: { v: 70 }, C7: { v: 67 }, D7: { f: '=B7-C7' }, E7: { f: '=C7/B7' }, F7: { f: '=(C5+C6+C7)/3' },

          A8: { v: 'AVERAGE / TOTAL', bold: true },
          B8: { f: '=SUM(B2:B7)', bold: true },
          C8: { f: '=SUM(C2:C7)', bold: true },
          D8: { f: '=SUM(D2:D7)', bold: true },
          E8: { f: '=AVERAGE(E2:E7)', bold: true },
          F8: { f: '=AVERAGE(F2:F7)', bold: true },
        }),
      },
    ],
  },
};
