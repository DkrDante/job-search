import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, saveAlert, deleteAlert } from '@/lib/store';
import { AlertConfig } from '@/lib/types';

export async function GET() {
  return NextResponse.json(getAlerts());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const alert: AlertConfig = {
      id: `alert-${Date.now()}`,
      name: body.name || 'New Alert',
      keywords: body.keywords || [],
      excludeKeywords: body.excludeKeywords || [],
      locations: body.locations || [],
      remote: body.remote || ['remote'],
      experienceLevels: body.experienceLevels || ['mid', 'senior'],
      industries: body.industries || ['tech'],
      sources: body.sources || ['remotive', 'mock'],
      frequency: body.frequency || '30min',
      isActive: body.isActive ?? true,
      createdAt: new Date().toISOString(),
    };
    saveAlert(alert);
    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    saveAlert(body as AlertConfig);
    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    deleteAlert(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
