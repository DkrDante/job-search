import { NextRequest, NextResponse } from 'next/server';
import { getJobs, markJobViewed } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobs = getJobs();
    const job = jobs.find(j => j.id === params.id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    markJobViewed(params.id);
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}
