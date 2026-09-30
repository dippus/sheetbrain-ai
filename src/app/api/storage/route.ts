import { NextRequest, NextResponse } from 'next/server';
import { saveWorkbookToS3, getWorkbookFromS3, listPersistedWorkbooks } from '@/lib/aws/s3';
import { WorkbookModel } from '@/types/sheet';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workbook = body.workbook as WorkbookModel;

    if (!workbook || !workbook.sheets) {
      return NextResponse.json(
        { success: false, error: 'Valid workbook object is required' },
        { status: 400 }
      );
    }

    const result = await saveWorkbookToS3(workbook);
    return NextResponse.json({
      message: result.isFallback
        ? 'Saved to Cloud Persistence Cache (ap-southeast-2 fallback)'
        : 'Successfully persisted to Amazon S3 (ap-southeast-2)',
      ...result,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Storage operation failed';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      // List all saved workbooks
      const list = listPersistedWorkbooks();
      return NextResponse.json({ success: true, count: list.length, workbooks: list });
    }

    const workbook = await getWorkbookFromS3(id);
    if (!workbook) {
      return NextResponse.json({ success: false, error: 'Workbook not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, workbook });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve workbook';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
