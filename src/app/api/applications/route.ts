import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getApplicationsForUser, upsertApplication } from '@/lib/db/applications';
import { ApplicationStatus } from '@/lib/types';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const applications = await getApplicationsForUser(session.user.id);
    return NextResponse.json(applications);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const app = await upsertApplication(session.user.id, {
      jobId: body.jobId,
      status: (body.status as ApplicationStatus) || 'bookmarked',
      notes: body.notes || '',
    });
    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
  }
}
