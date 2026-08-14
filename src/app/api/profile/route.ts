import { NextRequest, NextResponse } from 'next/server';
import { getProfile, saveProfile } from '@/lib/store';
import { ResumeProfile } from '@/lib/types';

export async function GET() {
  const profile = getProfile();
  return NextResponse.json(profile);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile: ResumeProfile = {
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
      updatedAt: new Date().toISOString(),
    };
    saveProfile(profile);

    // Re-score all jobs with new profile
    const { getJobs, saveJobs } = await import('@/lib/store');
    const { scoreJobs } = await import('@/lib/scorer');
    const jobs = getJobs();
    const rescored = scoreJobs(jobs, profile);
    saveJobs(rescored);

    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
