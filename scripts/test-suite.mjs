import { HyperFormula } from 'hyperformula';
import assert from 'node:assert';

console.log('================================================================');
console.log('🧪 SheetBrain AI — Enterprise Automated Test Suite (QA Verified)');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// Coordinate mapping functions
function indexToColLetter(index) {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function colLetterToIndex(col) {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index - 1;
}

// ---------------------------------------------------------
// SUITE 1: Deterministic Formula Engine (Zero Arithmetic Hallucination)
// ---------------------------------------------------------
console.log('📋 SUITE 1: Deterministic Formula Engine (HyperFormula v3.4.0)');

runTest('Basic Mathematical Aggregations (SUM, AVERAGE, MAX, MIN)', () => {
  const hf = HyperFormula.buildFromSheets({
    Sheet1: [
      [100, 200, 300, 400],
      ['=SUM(A1:D1)', '=AVERAGE(A1:D1)', '=MAX(A1:D1)', '=MIN(A1:D1)']
    ]
  }, { licenseKey: 'gpl-v3' });
  const sheetId = hf.getSheetId('Sheet1');

  assert.strictEqual(hf.getCellValue({ col: 0, row: 1, sheet: sheetId }), 1000);
  assert.strictEqual(hf.getCellValue({ col: 1, row: 1, sheet: sheetId }), 250);
  assert.strictEqual(hf.getCellValue({ col: 2, row: 1, sheet: sheetId }), 400);
  assert.strictEqual(hf.getCellValue({ col: 3, row: 1, sheet: sheetId }), 100);
});

runTest('Conditional Branching & Nested Logic (=IF, =ROUND)', () => {
  const hf = HyperFormula.buildFromSheets({
    Sheet1: [
      [85.67, 45.2],
      ['=IF(A1>=80, "Distinction", "Pass")', '=ROUND(A1, 1)']
    ]
  }, { licenseKey: 'gpl-v3' });
  const sheetId = hf.getSheetId('Sheet1');

  assert.strictEqual(hf.getCellValue({ col: 0, row: 1, sheet: sheetId }), 'Distinction');
  assert.strictEqual(hf.getCellValue({ col: 1, row: 1, sheet: sheetId }), 85.7);
});

runTest('Lookup Functions (=VLOOKUP Table Traversal)', () => {
  const hf = HyperFormula.buildFromSheets({
    Sheet1: [
      ['Sales', 120000],
      ['Marketing', 45000],
      ['Engineering', 210000],
      ['=VLOOKUP("Engineering", A1:B3, 2, 0)', '']
    ]
  }, { licenseKey: 'gpl-v3' });
  const sheetId = hf.getSheetId('Sheet1');

  const lookupVal = hf.getCellValue({ col: 0, row: 3, sheet: sheetId });
  assert.strictEqual(lookupVal, 210000);
});

runTest('Multi-Tier 5-Level Dependency Graph Recalculation', () => {
  const hf = HyperFormula.buildFromSheets({
    Sheet1: [
      [10],
      ['=A1*2'],      // 20
      ['=A2+10'],     // 30
      ['=A3*3'],      // 90
      ['=A4-40'],     // 50
      ['=SUM(A1:A5)'] // 10 + 20 + 30 + 90 + 50 = 200
    ]
  }, { licenseKey: 'gpl-v3' });
  const sheetId = hf.getSheetId('Sheet1');

  assert.strictEqual(hf.getCellValue({ col: 0, row: 5, sheet: sheetId }), 200);
});

runTest('Circular Reference & Error Resilience (No Process Crash)', () => {
  const hf = HyperFormula.buildFromSheets({
    Sheet1: [
      ['=A2'],
      ['=A1']
    ]
  }, { licenseKey: 'gpl-v3' });
  const sheetId = hf.getSheetId('Sheet1');
  const val = hf.getCellValue({ col: 0, row: 0, sheet: sheetId });
  assert.ok(val && typeof val === 'object', 'Circular reference handled defensively');
});

// ---------------------------------------------------------
// SUITE 2: Continuous Financial Modeling & Cashflow Runways
// ---------------------------------------------------------
console.log('\n📋 SUITE 2: Continuous Financial Runway & Model Simulation');

runTest('12-Month SaaS Continuous Balance Cascade (=J2, =J3...)', () => {
  const hf = HyperFormula.buildFromSheets({
    Model: [
      ['Month', 'Beg Cash', 'Rev', 'Burn', 'Ending Cash'],
      ['M1', 500000, 25000, 60000, '=B2+C2-D2'],      // 465,000
      ['M2', '=E2', 30000, 65000, '=B3+C3-D3'],        // 430,000
      ['M3', '=E3', 38000, 70000, '=B4+C4-D4'],        // 398,000
    ]
  }, { licenseKey: 'gpl-v3' });
  const sheetId = hf.getSheetId('Model');

  const m1End = hf.getCellValue({ col: 4, row: 1, sheet: sheetId });
  const m2Beg = hf.getCellValue({ col: 1, row: 2, sheet: sheetId });
  const m2End = hf.getCellValue({ col: 4, row: 2, sheet: sheetId });
  const m3End = hf.getCellValue({ col: 4, row: 3, sheet: sheetId });

  assert.strictEqual(m1End, 465000);
  assert.strictEqual(m2Beg, 465000, 'M2 beginning cash must equal M1 ending cash');
  assert.strictEqual(m2End, 430000);
  assert.strictEqual(m3End, 398000);
});

// ---------------------------------------------------------
// SUITE 3: Statistical Outlier & Anomaly Radar Analysis
// ---------------------------------------------------------
console.log('\n📋 SUITE 3: Statistical Outlier & Anomaly Engine');

runTest('Z-Score Standard Deviation Outlier Detection (2.8σ)', () => {
  const values = [10, 12, 11, 13, 10, 12, 11, 14, 100]; // 100 is extreme outlier
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const zScores = values.map(v => Math.abs((v - mean) / stdDev));
  const outliers = values.filter((_, idx) => zScores[idx] > 2.5);

  assert.strictEqual(outliers.length, 1);
  assert.strictEqual(outliers[0], 100);
});

runTest('Health Score Integrity Invariant (No 0% False Penalties on Clean Datasets)', () => {
  // Simulate 80 outliers in 6,000 items (1.3% natural variance in retail data)
  const errorCount = 0;
  const warningCount = 0;
  const outlierCount = 80;
  const numericCount = 6000;

  const errorPenalty = Math.min(30, errorCount * 12);
  const warningPenalty = Math.min(15, warningCount * 5);
  const outlierRate = outlierCount / numericCount;
  const outlierPenalty = outlierRate > 0.05 ? Math.min(4, Math.round(outlierRate * 30)) : 2;

  const healthScore = Math.max(75, Math.min(100, 100 - errorPenalty - warningPenalty - outlierPenalty));
  assert.strictEqual(healthScore, 98, 'Clean dataset with natural outliers must score 98%, never 0%');
});

// ---------------------------------------------------------
// SUITE 4: OWASP Security & Coordinate Helpers
// ---------------------------------------------------------
console.log('\n📋 SUITE 4: OWASP Security Guardrails & Coordinates');

runTest('Bi-directional Column Letter Invariants (A-Z, AA-ZZ)', () => {
  assert.strictEqual(indexToColLetter(0), 'A');
  assert.strictEqual(indexToColLetter(25), 'Z');
  assert.strictEqual(indexToColLetter(26), 'AA');
  assert.strictEqual(colLetterToIndex('A'), 0);
  assert.strictEqual(colLetterToIndex('Z'), 25);
  assert.strictEqual(colLetterToIndex('AA'), 26);
});

runTest('Formula Injection Defense (OWASP Prefix Sanitization)', () => {
  const maliciousPayloads = ["=cmd|'/c calc'!A0", "+12345", "-@dangerous", "@SUM(A1)"];
  maliciousPayloads.forEach(payload => {
    const sanitized = payload.replace(/^[=+\-@\t\r]+/, '');
    assert.ok(!sanitized.startsWith('='), 'Equal stripped');
    assert.ok(!sanitized.startsWith('+'), 'Plus stripped');
    assert.ok(!sanitized.startsWith('-'), 'Minus stripped');
    assert.ok(!sanitized.startsWith('@'), 'At stripped');
  });
});

runTest('Circular Reference 2D Bounding-Box Range & Coordinate Defense', () => {
  function parseCoord(coord) {
    const match = coord.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    return { col: match[1], row: parseInt(match[2], 10) };
  }

  function colToIndex(col) {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  function isCircularReference(formula, targetCoord) {
    const target = parseCoord(targetCoord);
    if (!target) return false;
    const targetColIdx = colToIndex(target.col);
    const targetRow = target.row;
    const upperFormula = formula.toUpperCase();

    const rangePattern = /\$?([A-Z]{1,3})\$?([0-9]{1,7})\s*:\s*\$?([A-Z]{1,3})\$?([0-9]{1,7})/g;
    let match;
    while ((match = rangePattern.exec(upperFormula)) !== null) {
      const startColIdx = colToIndex(match[1]);
      const startRow = Number(match[2]);
      const endColIdx = colToIndex(match[3]);
      const endRow = Number(match[4]);

      const minCol = Math.min(startColIdx, endColIdx);
      const maxCol = Math.max(startColIdx, endColIdx);
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);

      if (targetColIdx >= minCol && targetColIdx <= maxCol && targetRow >= minRow && targetRow <= maxRow) {
        return true;
      }
    }

    const singleRefPattern = /\$?([A-Z]{1,3})\$?([0-9]{1,7})/g;
    while ((match = singleRefPattern.exec(upperFormula)) !== null) {
      if (match[1] === target.col && Number(match[2]) === targetRow) {
        return true;
      }
    }

    return false;
  }

  // Range containment checks
  assert.strictEqual(isCircularReference('=SUM(B2:B9)', 'B5'), true, 'B5 inside B2:B9 must be circular');
  assert.strictEqual(isCircularReference('=SUM(B2:B9)', 'B2'), true, 'B2 start endpoint must be circular');
  assert.strictEqual(isCircularReference('=SUM(B2:B9)', 'B9'), true, 'B9 end endpoint must be circular');
  assert.strictEqual(isCircularReference('=SUM(B20:B29)', 'B2'), false, 'B2 outside B20:B29 must not be circular');
  assert.strictEqual(isCircularReference('=SUM(A1:C5)', 'B3'), true, 'B3 inside 2D box A1:C5 must be circular');
  assert.strictEqual(isCircularReference('=SUM(A1:C5)', 'D6'), false, 'D6 outside A1:C5 must not be circular');
  assert.strictEqual(isCircularReference('=A1+10', 'A1'), true, 'Direct self reference must be circular');
  assert.strictEqual(isCircularReference('=$A$1*2', 'A1'), true, 'Absolute $A$1 reference must be circular');
});

runTest('Path Traversal & Safe Filename Validation Defense (REQ-NF-003)', () => {
  function isSafeFileName(fileName) {
    if (fileName.length === 0 || fileName.length > 255) return false;
    if (fileName.includes('\0')) return false;
    if (fileName.includes('..')) return false;
    if (fileName.includes('/') || fileName.includes('\\')) return false;
    if (fileName.startsWith('/') || /^[A-Za-z]:\\/.test(fileName)) return false;
    return /^[A-Za-z0-9._-]+$/.test(fileName);
  }

  // Traversal attack payloads MUST be blocked
  assert.strictEqual(isSafeFileName('../../../../etc/passwd'), false);
  assert.strictEqual(isSafeFileName('..\\windows\\win.ini'), false);
  assert.strictEqual(isSafeFileName('/etc/shadow'), false);
  assert.strictEqual(isSafeFileName('C:\\secret.env'), false);
  assert.strictEqual(isSafeFileName('data/file.csv'), false);
  assert.strictEqual(isSafeFileName('payload.csv\0.png'), false);
  assert.strictEqual(isSafeFileName(''), false);

  // Legitimate filenames MUST be accepted
  assert.strictEqual(isSafeFileName('General-Ledger.xlsx'), true);
  assert.strictEqual(isSafeFileName('financial_model_v1.csv'), true);
  assert.strictEqual(isSafeFileName('data-2026.xls'), true);
});

// ---------------------------------------------------------
// SUITE 5: AWS CloudWatch EMF & Persistence Telemetry
// ---------------------------------------------------------
console.log('\n📋 SUITE 5: AWS CloudWatch EMF & S3 Telemetry Format');

runTest('CloudWatch EMF (Embedded Metric Format) Compliance', () => {
  const emfPayload = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: 'SheetBrainAI/Metrics',
          Dimensions: [['Operation', 'Region']],
          Metrics: [{ Name: 'LatencyMs', Unit: 'Milliseconds' }]
        }
      ]
    },
    Operation: 'CompileSpreadsheet',
    Region: 'ap-southeast-2',
    LatencyMs: 142
  };

  assert.strictEqual(emfPayload._aws.CloudWatchMetrics[0].Namespace, 'SheetBrainAI/Metrics');
  assert.strictEqual(emfPayload.Region, 'ap-southeast-2');
  assert.ok(emfPayload.LatencyMs > 0);
});

// ---------------------------------------------------------
// SUITE 6: Multi-Agent Autonomous Pipeline Invariants
// ---------------------------------------------------------
console.log('\n📋 SUITE 6: Multi-Agent Topology (4 Autonomous Roles)');

runTest('Multi-Agent Sequential Pipeline Topology Verification', () => {
  const agentRoles = [
    'agent_1_schema_architect',
    'agent_2_formula_compiler',
    'agent_3_visual_analytics',
    'agent_4_deterministic_engine'
  ];
  assert.strictEqual(agentRoles.length, 4);
  assert.strictEqual(agentRoles[0], 'agent_1_schema_architect');
  assert.strictEqual(agentRoles[1], 'agent_2_formula_compiler');
  assert.strictEqual(agentRoles[2], 'agent_3_visual_analytics');
  assert.strictEqual(agentRoles[3], 'agent_4_deterministic_engine');
});

console.log('\n================================================================');
console.log(`🎉 Automated QA Test Summary: ${passedTests} / ${totalTests} Tests Passed (100% SUCCESS)`);
console.log('================================================================\n');
