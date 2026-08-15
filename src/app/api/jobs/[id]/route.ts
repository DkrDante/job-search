import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getJobById, markJobViewed, toJob } from '@/lib/db/jobs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = await getJobById(params.id);
    if (!row) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    await markJobViewed(session.user.id, params.id);
    return NextResponse.json(toJob(row, { relevanceScore: 0, isNew: false }));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}
