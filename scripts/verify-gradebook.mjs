import { HyperFormula } from 'hyperformula';

const grid = [
  ['Roll No', 'Student Name', 'DBMS', 'Web Tech', 'Soft Eng', 'Python', 'Total', 'Pct', 'Grade', 'Status'],
  ['BCA-501', 'Aarav Sharma', 88, 92, 85, 90, '=SUM(C2:F2)', '=ROUND(G2/400,3)', '=IF(H2>=0.85,"A+","B")', 'Pass'],
  ['BCA-502', 'Priya Patel', 94, 91, 89, 95, '=SUM(C3:F3)', '=ROUND(G3/400,3)', '=IF(H3>=0.85,"A+","B")', 'Pass'],
  ['BCA-503', 'Rohan Verma', 72, 68, 75, 70, '=SUM(C4:F4)', '=ROUND(G4/400,3)', '=IF(H4>=0.85,"A+","B")', 'Pass'],
  ['BCA-504', 'Sneha Rao', 81, 85, 78, 84, '=SUM(C5:F5)', '=ROUND(G5/400,3)', '=IF(H5>=0.85,"A+","B")', 'Pass'],
  ['BCA-505', 'Vikram Malhotra', 65, 70, 62, 68, '=SUM(C6:F6)', '=ROUND(G6/400,3)', '=IF(H6>=0.85,"A+","B")', 'Pass'],
  ['BCA-506', 'Ananya Iyer', 91, 95, 93, 96, '=SUM(C7:F7)', '=ROUND(G7/400,3)', '=IF(H7>=0.85,"A+","B")', 'Pass'],
  ['BCA-507', 'Rahul Deshmukh', 58, 62, 55, 60, '=SUM(C8:F8)', '=ROUND(G8/400,3)', '=IF(H8>=0.85,"A+","B")', 'Pass'],
  ['CLASS AVERAGE', '', '=ROUND(AVERAGE(C2:C8),1)', '=ROUND(AVERAGE(D2:D8),1)', '=ROUND(AVERAGE(E2:E8),1)', '=ROUND(AVERAGE(F2:F8),1)', '=ROUND(AVERAGE(G2:G8),1)', '=ROUND(AVERAGE(H2:H8),3)', '', '']
];

const hf = HyperFormula.buildFromArray(grid, { licenseKey: 'gpl-v3' });
const sid = hf.getSheetId(hf.getSheetName(0));

console.log('--- Row 9 (CLASS AVERAGE) Values ---');
console.log('DBMS Avg (C9):', hf.getCellValue({ col: 2, row: 8, sheet: sid }));
console.log('Web Tech Avg (D9):', hf.getCellValue({ col: 3, row: 8, sheet: sid }));
console.log('Soft Eng Avg (E9):', hf.getCellValue({ col: 4, row: 8, sheet: sid }));
console.log('Python Avg (F9):', hf.getCellValue({ col: 5, row: 8, sheet: sid }));
console.log('Total Marks Avg (G9):', hf.getCellValue({ col: 6, row: 8, sheet: sid }));
console.log('Percentage Avg (H9):', hf.getCellValue({ col: 7, row: 8, sheet: sid }));
