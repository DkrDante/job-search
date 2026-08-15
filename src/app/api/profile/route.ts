import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserProfile, updateUserProfile } from '@/lib/db/users';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await getUserProfile(session.user.id);
  return NextResponse.json(profile);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const profile = await updateUserProfile(session.user.id, {
      skills: body.skills || [],
      titles: body.titles || [],
      experienceYears: body.experienceYears || 0,
      experienceLevel: body.experienceLevel || 'mid',
      preferredLocations: body.preferredLocations || [],
      preferredRemote: body.preferredRemote || ['remote'],
      preferredIndustries: body.preferredIndustries || ['tech'],
      preferredJobTypes: body.preferredJobTypes || ['full-time'],
      targetSalaryMin: body.targetSalaryMin,
      targetSalaryMax: body.targetSalaryMax,
      resumeText: body.resumeText,
    });
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
