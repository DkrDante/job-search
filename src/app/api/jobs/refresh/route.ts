import { NextRequest, NextResponse } from 'next/server';
import { runAggregation } from '@/lib/aggregator';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const result = await runAggregation();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API:jobs/refresh] Error:', error);
    return NextResponse.json({ error: 'Refresh failed', details: String(error) }, { status: 500 });
  }
}
