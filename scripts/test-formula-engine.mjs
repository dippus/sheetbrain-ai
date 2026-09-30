import { HyperFormula, DetailedCellError } from 'hyperformula';
import assert from 'node:assert';

console.log('🧪 Running SheetBrain AI Formula Engine Tests (HyperFormula v3.4.0)...\n');

// 1. Basic Aggregation Functions
{
  const hf = HyperFormula.buildFromSheets({
    Sheet1: [
      [10, 20, 30],
      ['=SUM(A1:C1)', '=AVERAGE(A1:C1)', '=MAX(A1:C1)']
    ]
  }, { licenseKey: 'gpl-v3' });
  const sheetId = hf.getSheetId('Sheet1');

  const sumVal = hf.getCellValue({ col: 0, row: 1, sheet: sheetId });
  const avgVal = hf.getCellValue({ col: 1, row: 1, sheet: sheetId });
  const maxVal = hf.getCellValue({ col: 2, row: 1, sheet: sheetId });

  assert.strictEqual(sumVal, 60, 'SUM failed');
  assert.strictEqual(avgVal, 20, 'AVERAGE failed');
  assert.strictEqual(maxVal, 30, 'MAX failed');
  console.log('✅ Basic Aggregations (SUM, AVERAGE, MAX): Passed');
}

// 2. Logical and Conditional Functions (IF, AND, OR)
{
  const hf = HyperFormula.buildFromSheets({
    Sheet1: [
      [150, 80],
      ['=IF(A1>100, "HIGH", "LOW")', '=IF(B1>100, "HIGH", "LOW")']
    ]
  }, { licenseKey: 'gpl-v3' });
  const sheetId = hf.getSheetId('Sheet1');

  const if1 = hf.getCellValue({ col: 0, row: 1, sheet: sheetId });
  const if2 = hf.getCellValue({ col: 1, row: 1, sheet: sheetId });

  assert.strictEqual(if1, 'HIGH', 'IF condition true failed');
  assert.strictEqual(if2, 'LOW', 'IF condition false failed');
  console.log('✅ Conditional Logic (IF): Passed');
}

// 3. Lookup & Reference (VLOOKUP)
{
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
  assert.strictEqual(lookupVal, 210000, 'VLOOKUP failed');
  console.log('✅ Lookup Functions (VLOOKUP): Passed');
}

// 4. Multi-level Dependency Chains (Topological DAG)
{
  const hf = HyperFormula.buildFromSheets({
    Sheet1: [
      [1000],
      ['=A1*1.1'],
      ['=A2*1.1'],
      ['=A3*1.1'],
      ['=A4*1.1'],
      ['=SUM(A1:A5)']
    ]
  }, { licenseKey: 'gpl-v3' });
  const sheetId = hf.getSheetId('Sheet1');

  const a5 = hf.getCellValue({ col: 0, row: 4, sheet: sheetId });
  const total = hf.getCellValue({ col: 0, row: 5, sheet: sheetId });

  assert.ok(Math.abs(Number(a5) - 1464.1) < 0.01, '5-step compound chain failed');
  assert.ok(Math.abs(Number(total) - 6105.1) < 0.01, 'Chain total failed');
  console.log('✅ Multi-level Dependency Chain (5 levels deep): Passed');
}

// 5. Error Handlers & Circular Reference Detection
{
  const hf = HyperFormula.buildFromSheets({
    Sheet1: [
      ['=10/0'],
      ['=A3'],
      ['=A2'] // Circular ref A2 <-> A3
    ]
  }, { licenseKey: 'gpl-v3' });
  const sheetId = hf.getSheetId('Sheet1');

  const div0 = hf.getCellValue({ col: 0, row: 0, sheet: sheetId });
  const cycle = hf.getCellValue({ col: 0, row: 1, sheet: sheetId });

  assert.ok(div0 instanceof DetailedCellError || div0?.value === '#DIV/0!', 'DIV/0 error expected');
  assert.ok(cycle instanceof DetailedCellError || cycle?.value === '#CYCLE!' || cycle?.value === '#REF!', 'Circular ref error expected');
  console.log('✅ Error Handling (DIV/0, Circular References): Passed');
}

console.log('\n🎉 All 5 Formula Engine Test Suites Passed Successfully!\n');
