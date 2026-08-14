import { NextRequest, NextResponse } from 'next/server';
import { getApplications, saveApplication } from '@/lib/store';
import { ApplicationRecord, ApplicationStatus } from '@/lib/types';

export async function GET() {
  try {
    const applications = getApplications();
    return NextResponse.json(applications);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const app: ApplicationRecord = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      jobId: body.jobId,
      status: (body.status as ApplicationStatus) || 'bookmarked',
      notes: body.notes || '',
      appliedAt: body.status === 'applied' ? now : undefined,
      updatedAt: now,
      createdAt: now,
    };
    saveApplication(app);
    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
  }
}
