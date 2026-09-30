import { WorkbookModel } from '@/types/sheet';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';

export const GOLDEN_TEMPLATES: Record<string, WorkbookModel> = {
  blank_sheet: {
    id: 'blank_sheet',
    title: 'Sheet 1',
    description: 'Pristine, clean spreadsheet ready for real data entry, calculations, and formulas.',
    category: 'Workspace',
    chartConfig: {
      type: 'line',
      title: 'Data Trend',
      xAxisKey: 'A',
      series: [{ key: 'B', label: 'Value', color: '#2563eb' }],
    },
    suggestedScenarios: [
      { label: '+10% Value Increase', prompt: 'Increase all numerical values by 10%' },
      { label: '-5% Reduction', prompt: 'Decrease all numerical values by 5%' }
    ],
    sheets: [
      {
        id: 'sheet_1',
        name: 'Sheet 1',
        rowCount: 30,
        columnCount: 10,
        columns: [
          { key: 'A', label: 'A', type: 'string', width: 140 },
          { key: 'B', label: 'B', type: 'number', width: 130 },
          { key: 'C', label: 'C', type: 'number', width: 130 },
          { key: 'D', label: 'D', type: 'number', width: 130 },
          { key: 'E', label: 'E', type: 'number', width: 130 },
          { key: 'F', label: 'F', type: 'string', width: 140 },
          { key: 'G', label: 'G', type: 'string', width: 140 },
          { key: 'H', label: 'H', type: 'string', width: 140 },
          { key: 'I', label: 'I', type: 'string', width: 140 },
          { key: 'J', label: 'J', type: 'string', width: 140 },
        ],
        cellData: {},
      },
    ],
  },

  saas_runway: {
    id: 'saas_runway',
    title: '12-Month SaaS Financial Runway & Growth Forecast',
    description: 'Dynamic 12-month model with MRR, OpEx, Gross Profit, Net Cash Burn, and reactive Excel formulas.',
    category: 'Finance',
    chartConfig: {
      type: 'line',
      title: 'Monthly Revenue vs OpEx Burn',
      xAxisKey: 'Month',
      series: [
        { key: 'Revenue', label: 'Monthly Revenue ($)', color: '#10b981' },
        { key: 'OpEx', label: 'Operating Expenses ($)', color: '#ef4444' },
        { key: 'NetCash', label: 'Net Cash Flow ($)', color: '#38bdf8' },
      ],
    },
    suggestedScenarios: [
      { label: '+25% Marketing Spend', prompt: 'What if marketing costs jump 25%?' },
      { label: '-15% Churn Reduction', prompt: 'Reduce customer churn by 15%' },
      { label: 'Hire 3 Engineers (+18k/mo)', prompt: 'Add 3 senior engineers at $18,000 monthly burn' },
    ],
    sheets: [
      {
        id: 'runway_sheet_1',
        name: 'Financial Forecast',
        rowCount: 20,
        columnCount: 6,
        columns: [
          { key: 'A', label: 'Month', type: 'string', width: 130 },
          { key: 'B', label: 'Revenue ($)', type: 'number', width: 140 },
          { key: 'C', label: 'OpEx ($)', type: 'number', width: 140 },
          { key: 'D', label: 'Net Cash Flow ($)', type: 'number', width: 150 },
          { key: 'E', label: 'Cash Balance ($)', type: 'number', width: 150 },
          { key: 'F', label: 'Growth %', type: 'string', width: 120 },
        ],
        cellData: recalculateWorkbook({
          A1: { v: 'Month', bold: true },
          B1: { v: 'Revenue ($)', bold: true },
          C1: { v: 'OpEx ($)', bold: true },
          D1: { v: 'Net Cash Flow ($)', bold: true },
          E1: { v: 'Cash Balance ($)', bold: true },
          F1: { v: 'Growth %', bold: true },

          A2: { v: 'Month 1' },  B2: { v: 15000 }, C2: { v: 22000 }, D2: { f: '=B2-C2' },  E2: { v: 243000 }, F2: { v: 'Base' },
          A3: { v: 'Month 2' },  B3: { v: 18500 }, C3: { v: 22500 }, D3: { f: '=B3-C3' },  E3: { f: '=E2+D3' }, F3: { v: '+23.3%' },
          A4: { v: 'Month 3' },  B4: { v: 23000 }, C4: { v: 23200 }, D4: { f: '=B4-C4' },  E4: { f: '=E3+D4' }, F4: { v: '+24.3%' },
          A5: { v: 'Month 4' },  B5: { v: 28500 }, C5: { v: 24000 }, D5: { f: '=B5-C5' },  E5: { f: '=E4+D5' }, F5: { v: '+23.9%' },
          A6: { v: 'Month 5' },  B6: { v: 35000 }, C6: { v: 25500 }, D6: { f: '=B6-C6' },  E6: { f: '=E5+D6' }, F6: { v: '+22.8%' },
          A7: { v: 'Month 6' },  B7: { v: 43000 }, C7: { v: 27000 }, D7: { f: '=B7-C7' },  E7: { f: '=E6+D7' }, F7: { v: '+22.9%' },
          A8: { v: 'Month 7' },  B8: { v: 52000 }, C8: { v: 28500 }, D8: { f: '=B8-C8' },  E8: { f: '=E7+D8' }, F8: { v: '+20.9%' },
          A9: { v: 'Month 8' },  B9: { v: 62500 }, C9: { v: 30000 }, D9: { f: '=B9-C9' },  E9: { f: '=E8+D9' }, F9: { v: '+20.2%' },
          A10: { v: 'Month 9' }, B10: { v: 74000 }, C10: { v: 31500 }, D10: { f: '=B10-C10' }, E10: { f: '=E9+D10' }, F10: { v: '+18.4%' },
          A11: { v: 'Month 10' }, B11: { v: 87500 }, C11: { v: 33000 }, D11: { f: '=B11-C11' }, E11: { f: '=E10+D11' }, F11: { v: '+18.2%' },
          A12: { v: 'Month 11' }, B12: { v: 103000 }, C12: { v: 35000 }, D12: { f: '=B12-C12' }, E12: { f: '=E11+D12' }, F12: { v: '+17.7%' },
          A13: { v: 'Month 12' }, B13: { v: 121000 }, C13: { v: 37000 }, D13: { f: '=B13-C13' }, E13: { f: '=E12+D13' }, F13: { v: '+17.5%' },

          A14: { v: 'TOTAL / YTD', bold: true },
          B14: { f: '=SUM(B2:B13)', bold: true },
          C14: { f: '=SUM(C2:C13)', bold: true },
          D14: { f: '=SUM(D2:D13)', bold: true },
          E14: { f: '=AVERAGE(E2:E13)', bold: true },
          F14: { v: 'Average Run', bold: true },
        }),
      },
    ],
  },

  git_commits: {
    id: 'git_commits',
    title: 'Git Repository Commit & Velocity History',
    description: 'Sample snapshot of repository commits — audit of code churn, insertions, deletions, and net engineering velocity.',
    category: 'Engineering',
    chartConfig: {
      type: 'bar',
      title: 'Insertions (+) vs Deletions (-) by Revision',
      xAxisKey: 'Commit Hash',
      series: [
        { key: 'Insertions', label: 'Insertions (+)', color: '#2563eb' },
        { key: 'Deletions', label: 'Deletions (-)', color: '#ef4444' },
        { key: 'FilesChanged', label: 'Files Changed', color: '#0d9488' },
      ],
    },
    suggestedScenarios: [
      { label: 'Double Insertions', prompt: 'Double the number of insertions across all commits' },
      { label: '-50% Code Deletions', prompt: 'Reduce all deletion metrics by 50%' },
      { label: '10x Multiplier', prompt: 'Multiply all files changed and insertions by 10' }
    ],
    sheets: [
      {
        id: 'git_sheet',
        name: 'Git Commit History',
        rowCount: 10,
        columnCount: 8,
        columns: [
          { key: 'A', label: 'Commit Hash', type: 'string', width: 110 },
          { key: 'B', label: 'Author', type: 'string', width: 160 },
          { key: 'C', label: 'Date', type: 'string', width: 110 },
          { key: 'D', label: 'Files Changed', type: 'number', width: 120 },
          { key: 'E', label: 'Insertions (+)', type: 'number', width: 120 },
          { key: 'F', label: 'Deletions (-)', type: 'number', width: 120 },
          { key: 'G', label: 'Net Code Delta', type: 'number', width: 130 },
          { key: 'H', label: 'Commit Message', type: 'string', width: 340 },
        ],
        cellData: recalculateWorkbook({
          A1: { v: 'Commit Hash', bold: true },
          B1: { v: 'Author', bold: true },
          C1: { v: 'Date', bold: true },
          D1: { v: 'Files Changed', bold: true },
          E1: { v: 'Insertions (+)', bold: true },
          F1: { v: 'Deletions (-)', bold: true },
          G1: { v: 'Net Code Delta', bold: true },
          H1: { v: 'Commit Message', bold: true },

          A2: { v: 'f8c4a96' }, B2: { v: 'sajankuma7000-art' }, C2: { v: '2026-09-29' }, D2: { v: 5 }, E2: { v: 465 }, F2: { v: 172 }, G2: { f: '=E2-F2' }, H2: { v: 'feat: complete UI/UX overhaul with multi-chart switcher' },
          A3: { v: '29501ff' }, B3: { v: 'sajankuma7000-art' }, C3: { v: '2026-09-29' }, D3: { v: 1 }, E3: { v: 335 }, F3: { v: 48 }, G3: { f: '=E3-F3' }, H3: { v: 'feat: add interactive row/column operations and cell format controls' },
          A4: { v: '7bd7403' }, B4: { v: 'sajankuma7000-art' }, C4: { v: '2026-09-29' }, D4: { v: 683 }, E4: { v: 269979 }, F4: { v: 0 }, G4: { f: '=E4-F4' }, H4: { v: 'feat: install UI/UX Pro Max skill v2.6.0 with design intelligence catalogs' },
          A5: { v: '6341ec3' }, B5: { v: 'sajankuma7000-art' }, C5: { v: '2026-09-29' }, D5: { v: 34 }, E5: { v: 4114 }, F5: { v: 51 }, G5: { f: '=E5-F5' }, H5: { v: 'feat: install avoid-ai-design anti-slop skill and refine studio UI' },
          A6: { v: '077836c' }, B6: { v: 'sajankuma7000-art' }, C6: { v: '2026-09-29' }, D6: { v: 3 }, E6: { v: 779 }, F6: { v: 0 }, G6: { f: '=E6-F6' }, H6: { v: 'feat: install and integrate Claude Code Frontend Design Toolkit' },
          A7: { v: '7883166' }, B7: { v: 'sajankuma7000-art' }, C7: { v: '2026-09-29' }, D7: { v: 2 }, E7: { v: 294 }, F7: { v: 19 }, G7: { f: '=E7-F7' }, H7: { v: 'feat: add CSV upload and import engine with auto-chart binding' },
          A8: { v: '0ec40e4' }, B8: { v: 'sajankuma7000-art' }, C8: { v: '2026-09-29' }, D8: { v: 1 }, E8: { v: 2 }, F8: { v: 2 }, G8: { f: '=E8-F8' }, H8: { v: 'chore: optimize amplify.yml build configuration' },
          A9: { v: '00640e3' }, B9: { v: 'sajankuma7000-art' }, C9: { v: '2026-09-29' }, D9: { v: 57 }, E9: { v: 9693 }, F9: { v: 0 }, G9: { f: '=E9-F9' }, H9: { v: 'feat: initial release of SheetBrain AI engine' },

          A10: { v: 'TOTAL VELOCITY', bold: true },
          B10: { v: '8 Commits Audited', bold: true },
          C10: { v: 'Verified', bold: true },
          D10: { f: '=SUM(D2:D9)', bold: true },
          E10: { f: '=SUM(E2:E9)', bold: true },
          F10: { f: '=SUM(F2:F9)', bold: true },
          G10: { f: '=SUM(G2:G9)', bold: true },
          H10: { v: 'Repository Net Velocity', bold: true },
        }),
      },
    ],
  },

  project_dependencies: {
    id: 'project_dependencies',
    title: 'Project NPM Package Dependencies Audit',
    description: 'Snapshot of package.json dependencies — production deps, dev tooling, licenses, and versions.',
    category: 'Architecture',
    chartConfig: {
      type: 'bar',
      title: 'Dependency Distribution by Type',
      xAxisKey: 'PackageName',
      series: [
        { key: 'Version', label: 'Version', color: '#2563eb' },
      ],
    },
    suggestedScenarios: [
      { label: 'Major Version Upgrade', prompt: 'Change all versions to next major release (e.g. 15.0.0)' },
      { label: 'Enforce MIT License', prompt: 'Change all non-MIT licenses to MIT' }
    ],
    sheets: [
      {
        id: 'deps_sheet',
        name: 'NPM Packages',
        rowCount: 20,
        columnCount: 5,
        columns: [
          { key: 'A', label: 'Package Name', type: 'string', width: 220 },
          { key: 'B', label: 'Version', type: 'string', width: 110 },
          { key: 'C', label: 'Type', type: 'string', width: 130 },
          { key: 'D', label: 'License', type: 'string', width: 110 },
          { key: 'E', label: 'Category', type: 'string', width: 150 },
        ],
        cellData: {
          A1: { v: 'Package Name', bold: true },
          B1: { v: 'Version', bold: true },
          C1: { v: 'Type', bold: true },
          D1: { v: 'License', bold: true },
          E1: { v: 'Category', bold: true },

          A2: { v: 'next' }, B2: { v: '14.2.23' }, C2: { v: 'Production' }, D2: { v: 'MIT' }, E2: { v: 'Core Framework' },
          A3: { v: 'react' }, B3: { v: '18.3.1' }, C3: { v: 'Production' }, D3: { v: 'MIT' }, E3: { v: 'UI Library' },
          A4: { v: 'react-dom' }, B4: { v: '18.3.1' }, C4: { v: 'Production' }, D4: { v: 'MIT' }, E4: { v: 'DOM Renderer' },
          A5: { v: 'recharts' }, B5: { v: '2.15.0' }, C5: { v: 'Production' }, D5: { v: 'MIT' }, E5: { v: 'Data Visualization' },
          A6: { v: 'lucide-react' }, B6: { v: '0.469.0' }, C6: { v: 'Production' }, D6: { v: 'ISC' }, E6: { v: 'Iconography' },
          A7: { v: 'hyperformula' }, B7: { v: '3.4.0' }, C7: { v: 'Production' }, D7: { v: 'GPL-3.0' }, E7: { v: 'Calculation Engine' },
          A8: { v: '@aws-sdk/client-bedrock-runtime' }, B8: { v: '3.716.0' }, C8: { v: 'Production' }, D8: { v: 'Apache-2.0' }, E8: { v: 'Cloud AI' },
          A9: { v: '@univerjs/preset-sheets-core' }, B9: { v: '1.0.2' }, C9: { v: 'Production' }, D9: { v: 'Apache-2.0' }, E9: { v: 'Spreadsheet Kernel' },
          A10: { v: 'typescript' }, B10: { v: '5.7.2' }, C10: { v: 'Development' }, D10: { v: 'Apache-2.0' }, E10: { v: 'Type Safety' },
          A11: { v: 'tailwindcss' }, B11: { v: '3.4.17' }, C11: { v: 'Development' }, D11: { v: 'MIT' }, E11: { v: 'CSS Engine' },
          A12: { v: 'postcss' }, B12: { v: '8.4.49' }, C12: { v: 'Development' }, D12: { v: 'MIT' }, E12: { v: 'CSS Postprocessor' },
          A13: { v: 'clsx' }, B13: { v: '2.1.1' }, C13: { v: 'Production' }, D13: { v: 'MIT' }, E13: { v: 'Class Utility' },
          A14: { v: 'tailwind-merge' }, B14: { v: '2.6.0' }, C14: { v: 'Production' }, D14: { v: 'MIT' }, E14: { v: 'Class Conflict Resolver' },
          A15: { v: 'autoprefixer' }, B15: { v: '10.4.20' }, C15: { v: 'Development' }, D15: { v: 'MIT' }, E15: { v: 'Vendor Prefixes' },
        },
      },
    ],
  },
  sales_pipeline: {
    id: 'sales_pipeline',
    title: 'B2B Enterprise Sales Pipeline & Commission Forecast',
    description: 'Real-time sales velocity model with deal probability, weighted revenue, tier classification, and quota commissions.',
    category: 'Sales',
    chartConfig: {
      type: 'bar',
      title: 'Deal Value vs Weighted Pipeline Forecast',
      xAxisKey: 'Deal',
      series: [
        { key: 'Value', label: 'Deal Value ($)', color: '#38bdf8' },
        { key: 'Weighted', label: 'Weighted Pipeline ($)', color: '#10b981' },
      ],
    },
    suggestedScenarios: [
      { label: '+20% Deal Velocity', prompt: 'Increase deal win probability across all enterprise accounts by 20%' },
      { label: '-15% Budget Freeze', prompt: 'Simulate customer budget freeze reducing deal values by 15%' },
      { label: 'Accelerator Commission', prompt: 'Boost tier commissions by 25% for closed enterprise wins' }
    ],
    sheets: [
      {
        id: 'sales_sheet',
        name: 'Pipeline & Commission',
        rowCount: 15,
        columnCount: 7,
        columns: [
          { key: 'A', label: 'Deal Account', type: 'string', width: 170 },
          { key: 'B', label: 'Deal Value ($)', type: 'currency', width: 130 },
          { key: 'C', label: 'Win Probability', type: 'percentage', width: 120 },
          { key: 'D', label: 'Weighted Pipeline ($)', type: 'currency', width: 150 },
          { key: 'E', label: 'Commission Rate', type: 'percentage', width: 130 },
          { key: 'F', label: 'Est Commission ($)', type: 'currency', width: 140 },
          { key: 'G', label: 'Account Tier', type: 'string', width: 120 },
        ],
        cellData: recalculateWorkbook({
          A1: { v: 'Deal Account', bold: true },
          B1: { v: 'Deal Value ($)', bold: true },
          C1: { v: 'Win Probability', bold: true },
          D1: { v: 'Weighted Pipeline ($)', bold: true },
          E1: { v: 'Commission Rate', bold: true },
          F1: { v: 'Est Commission ($)', bold: true },
          G1: { v: 'Account Tier', bold: true },

          A2: { v: 'Apex Global Financial' }, B2: { v: 120000 }, C2: { v: 0.75 }, D2: { f: '=B2*C2' }, E2: { v: 0.08 }, F2: { f: '=D2*E2' }, G2: { f: '=IF(B2>=100000, "Enterprise", "Mid-Market")' },
          A3: { v: 'CloudScale Networks' },   B3: { v: 85000 },  C3: { v: 0.60 }, D3: { f: '=B3*C3' }, E3: { v: 0.08 }, F3: { f: '=D3*E3' }, G3: { f: '=IF(B3>=100000, "Enterprise", "Mid-Market")' },
          A4: { v: 'Vanguard Health AI' },    B4: { v: 150000 }, C4: { v: 0.80 }, D4: { f: '=B4*C4' }, E4: { v: 0.10 }, F4: { f: '=D4*E4' }, G4: { f: '=IF(B4>=100000, "Enterprise", "Mid-Market")' },
          A5: { v: 'OmniRetail Systems' },    B5: { v: 65000 },  C5: { v: 0.40 }, D5: { f: '=B5*C5' }, E5: { v: 0.06 }, F5: { f: '=D5*E5' }, G5: { f: '=IF(B5>=100000, "Enterprise", "Mid-Market")' },
          A6: { v: 'Starlight Media Group' }, B6: { v: 110000 }, C6: { v: 0.70 }, D6: { f: '=B6*C6' }, E6: { v: 0.08 }, F6: { f: '=D6*E6' }, G6: { f: '=IF(B6>=100000, "Enterprise", "Mid-Market")' },
          A7: { v: 'CyberShield Defense' },   B7: { v: 95000 },  C7: { v: 0.50 }, D7: { f: '=B7*C7' }, E7: { v: 0.08 }, F7: { f: '=D7*E7' }, G7: { f: '=IF(B7>=100000, "Enterprise", "Mid-Market")' },
          A8: { v: 'Nova Logistics Hub' },    B8: { v: 135000 }, C8: { v: 0.85 }, D8: { f: '=B8*C8' }, E8: { v: 0.10 }, F8: { f: '=D8*E8' }, G8: { f: '=IF(B8>=100000, "Enterprise", "Mid-Market")' },

          A10: { v: 'PORTFOLIO TOTAL', bold: true },
          B10: { f: '=SUM(B2:B8)', bold: true },
          C10: { f: '=AVERAGE(C2:C8)', bold: true },
          D10: { f: '=SUM(D2:D8)', bold: true },
          E10: { v: 'Weighted Avg', bold: true },
          F10: { f: '=SUM(F2:F8)', bold: true },
          G10: { v: 'Active Portfolio', bold: true },
        }),
      },
    ],
  },
};

// Aliases for backwards compatibility
GOLDEN_TEMPLATES['git_analytics'] = GOLDEN_TEMPLATES['git_commits'];

