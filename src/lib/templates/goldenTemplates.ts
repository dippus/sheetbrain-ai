import { WorkbookModel } from '@/types/sheet';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';

export const GOLDEN_TEMPLATES: Record<string, WorkbookModel> = {
  blank_sheet: {
    id: 'blank_sheet',
    title: 'Untitled Spreadsheet',
    description: 'Pristine, clean spreadsheet ready for real data entry, calculations, and formulas.',
    category: 'Workspace',
    chartConfig: {
      type: 'line',
      title: 'Data Trend',
      xAxisKey: 'A',
      series: [{ key: 'B', label: 'Value', color: '#2563eb' }],
    },
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

  git_commits: {
    id: 'git_commits',
    title: 'Git Repository Commit & Velocity History',
    description: 'Extracted directly from git log — audit of commits, code churn, insertions, deletions, and net engineering velocity.',
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
    description: 'Scanned directly from package.json & package-lock.json — production dependencies, dev tooling, licenses, and versions.',
    category: 'Architecture',
    chartConfig: {
      type: 'bar',
      title: 'Dependency Distribution by Type',
      xAxisKey: 'PackageName',
      series: [
        { key: 'Version', label: 'Version', color: '#2563eb' },
      ],
    },
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
};

// Aliases for backwards compatibility
GOLDEN_TEMPLATES['git_analytics'] = GOLDEN_TEMPLATES['git_commits'];
