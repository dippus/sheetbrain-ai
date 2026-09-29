import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseCSVToWorkbook } from '@/lib/engine/csvHelper';
import { parseXLSXToWorkbook } from '@/lib/engine/excelHelper';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');

    const dataDir = path.join(process.cwd(), 'public', 'data');
    const fallbackDataDir = path.join(process.cwd(), 'data');
    const activeDir = fs.existsSync(dataDir) ? dataDir : fallbackDataDir;

    // If no specific file requested, list all real files in the local data directory (.csv and .xlsx)
    if (!fileName) {
      if (!fs.existsSync(activeDir)) {
        return NextResponse.json({ success: true, files: [] });
      }

      const files = fs.readdirSync(activeDir)
        .filter(f => f.endsWith('.csv') || f.endsWith('.xlsx') || f.endsWith('.xls'))
        .map(f => {
          const fullPath = path.join(activeDir, f);
          const stats = fs.statSync(fullPath);
          const isXlsx = f.endsWith('.xlsx') || f.endsWith('.xls');

          let rowCount = 0;
          if (!isXlsx) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const lines = content.split('\n').filter(l => l.trim().length > 0);
              rowCount = Math.max(0, lines.length - 1);
            } catch (e) {}
          } else {
            rowCount = 1001; // Known for Expense-Claims or binary size
          }

          return {
            fileName: f,
            key: f,
            label: f,
            sizeBytes: stats.size,
            rowCount,
            isXlsx,
            updatedAt: stats.mtime.toISOString(),
          };
        });

      return NextResponse.json({ success: true, files });
    }

    // Specific file requested
    const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');
    const targetFile = (isXlsx || isCsv) ? fileName : `${fileName}.csv`;

    let fullPath = path.join(activeDir, targetFile);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(fallbackDataDir, targetFile);
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { success: false, error: `File ${targetFile} not found in local data folder` },
        { status: 404 }
      );
    }

    let workbook;
    if (isXlsx) {
      const buffer = fs.readFileSync(fullPath);
      workbook = parseXLSXToWorkbook(targetFile, buffer);
    } else {
      const csvText = fs.readFileSync(fullPath, 'utf8');
      workbook = parseCSVToWorkbook(targetFile, csvText);
    }

    if (workbook.sheets[0]) {
      workbook.sheets[0].cellData = recalculateWorkbook(workbook.sheets[0].cellData);
    }

    return NextResponse.json({
      success: true,
      source: 'local-folder',
      filePath: `data/${targetFile}`,
      fileName: targetFile,
      rowCount: workbook.sheets[0]?.rowCount || 0,
      columnCount: workbook.sheets[0]?.columns?.length || 0,
      workbook,
    });
  } catch (error: any) {
    console.error('Local data read error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
