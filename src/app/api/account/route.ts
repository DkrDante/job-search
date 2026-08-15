import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API:account] Error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
