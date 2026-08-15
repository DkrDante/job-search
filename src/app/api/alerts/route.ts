import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAlertsForUser, createAlert, updateAlert, deleteAlert } from '@/lib/db/alerts';
import { AlertConfig } from '@/lib/types';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const alerts = await getAlertsForUser(session.user.id);
  return NextResponse.json(alerts);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const alert = await createAlert(session.user.id, {
      name: body.name || 'New Alert',
      keywords: body.keywords || [],
      excludeKeywords: body.excludeKeywords || [],
      locations: body.locations || [],
      remote: body.remote || ['remote'],
      experienceLevels: body.experienceLevels || ['mid', 'senior'],
      industries: body.industries || ['tech'],
      minSalary: body.minSalary,
      maxSalary: body.maxSalary,
      sources: body.sources || ['remotive'],
      frequency: body.frequency || '30min',
      isActive: body.isActive ?? true,
    });
    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const updated = await updateAlert(session.user.id, body.id, body as Partial<AlertConfig>);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleted = await deleteAlert(session.user.id, id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
