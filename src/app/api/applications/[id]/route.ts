import { NextRequest, NextResponse } from 'next/server';
import { getApplications, saveApplication, deleteApplication } from '@/lib/store';
import { ApplicationStatus } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apps = getApplications();
    const app = apps.find(a => a.id === params.id);
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const now = new Date().toISOString();
    const updated = {
      ...app,
      ...body,
      id: params.id,
      updatedAt: now,
      appliedAt: body.status === 'applied' && !app.appliedAt ? now : app.appliedAt,
    };
    saveApplication(updated);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    deleteApplication(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}
