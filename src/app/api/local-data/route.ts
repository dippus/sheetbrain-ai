import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { parseCSVToWorkbook } from '@/lib/engine/csvHelper';
import { parseXLSXToWorkbook } from '@/lib/engine/excelHelper';
import { recalculateWorkbook } from '@/lib/engine/formulaEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');

    // SECURITY (REQ-NF-003): Reject any attempt to escape the sandboxed data directory.
    // Prevents path traversal via directory separators, parent-directory
    // references, absolute paths, and null-byte injection.
    if (fileName !== null && !isSafeFileName(fileName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file name. Only simple file names are permitted.' },
        { status: 400 }
      );
    }

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
            } catch (e) {
              console.warn(`[local-data] Could not count CSV rows for "${f}":`, e);
              rowCount = 0;
            }
          } else {
            try {
              const buffer = fs.readFileSync(fullPath);
              const wb = XLSX.read(buffer, { type: 'buffer' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const range = ws?.['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
              rowCount = range ? range.e.r : 0;
            } catch (e) {
              console.warn(`[local-data] Could not count XLSX rows for "${f}":`, e);
              rowCount = 0;
            }
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

    // Defence in depth: re-validate the derived filename before any filesystem access.
    if (!isSafeFileName(targetFile)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file name. Only simple file names are permitted.' },
        { status: 400 }
      );
    }

    // Defence in depth: resolve the candidate path and confirm it still resides
    // inside an allowed directory. Guards against traversal even if a future
    // refactor reintroduces an unsanitized value upstream.
    let fullPath = safeResolveWithin(activeDir, targetFile);
    if (fullPath === null || !fs.existsSync(fullPath)) {
      const altPath = safeResolveWithin(fallbackDataDir, targetFile);
      if (altPath !== null && fs.existsSync(altPath)) {
        fullPath = altPath;
      }
    }

    if (fullPath === null || !fs.existsSync(fullPath)) {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown local data error';
    console.error('Local data read error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * SECURITY (REQ-NF-003): Whitelist-based filename validator.
 * Allows only plain filenames made of letters, digits, dots, dashes and
 * underscores. Explicitly denies directory separators, parent-directory
 * traversal sequences, absolute paths, and null bytes.
 */
function isSafeFileName(fileName: string): boolean {
  if (fileName.length === 0 || fileName.length > 255) return false;
  if (fileName.includes('\0')) return false;
  if (fileName.includes('..')) return false;
  if (fileName.includes('/') || fileName.includes('\\')) return false;
  if (path.isAbsolute(fileName)) return false;
  return /^[A-Za-z0-9._-]+$/.test(fileName);
}

/**
 * SECURITY (REQ-NF-003): Resolves `fileName` against `baseDir` and returns the
 * absolute path only when the result stays inside `baseDir`. Returns null otherwise.
 */
function safeResolveWithin(baseDir: string, fileName: string): string | null {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, fileName);
  const relative = path.relative(resolvedBase, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return resolvedTarget;
}
