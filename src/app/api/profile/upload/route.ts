import { NextRequest, NextResponse } from 'next/server';
import { saveProfile } from '@/lib/store';
import { ResumeProfile } from '@/lib/types';
import { COMMON_SKILLS } from '@/config/defaults';

// ─── Resume Text Parser ────────────────────────────────────────────────────────
// Parses plain text resume to extract skills, titles, and experience

function extractSkills(text: string): string[] {
  const textLower = text.toLowerCase();
  return COMMON_SKILLS.filter(skill => textLower.includes(skill.toLowerCase()));
}

function extractExperienceYears(text: string): number {
  const matches = text.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i);
  if (matches) return parseInt(matches[1]);
  // Count work experience sections
  const jobCount = (text.match(/\b(20\d{2})\b/g) || []).length;
  return Math.min(Math.floor(jobCount / 2), 15);
}

function inferExperienceLevel(years: number): ResumeProfile['experienceLevel'] {
  if (years === 0) return 'intern';
  if (years <= 2) return 'junior';
  if (years <= 5) return 'mid';
  if (years <= 8) return 'senior';
  if (years <= 12) return 'lead';
  return 'executive';
}

function extractTitles(text: string): string[] {
  const titlePatterns = [
    /Software\s+Engineer/i,
    /Frontend\s+Developer/i,
    /Backend\s+Developer/i,
    /Full\s+Stack\s+Developer/i,
    /Data\s+Engineer/i,
    /Data\s+Scientist/i,
    /ML\s+Engineer/i,
    /DevOps\s+Engineer/i,
    /Product\s+Manager/i,
    /Engineering\s+Manager/i,
    /Platform\s+Engineer/i,
    /Site\s+Reliability\s+Engineer/i,
    /Solutions\s+Architect/i,
  ];
  return Array.from(new Set(titlePatterns
    .filter(p => p.test(text))
    .map(p => p.source.replace(/\\s\+/g, ' ').replace(/\//g, '').trim())
  )).slice(0, 5);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const skills = extractSkills(text);
    const experienceYears = extractExperienceYears(text);
    const experienceLevel = inferExperienceLevel(experienceYears);
    const titles = extractTitles(text);

    const profile: ResumeProfile = {
      skills: skills.length > 0 ? skills : ['JavaScript', 'Python', 'React'],
      titles: titles.length > 0 ? titles : ['Software Engineer'],
      experienceYears,
      experienceLevel,
      preferredLocations: ['Remote'],
      preferredRemote: ['remote', 'hybrid'],
      preferredIndustries: ['tech'],
      preferredJobTypes: ['full-time'],
      resumeText: text.slice(0, 5000),
      updatedAt: new Date().toISOString(),
    };

    saveProfile(profile);

    return NextResponse.json({
      profile,
      extracted: {
        skills,
        titles,
        experienceYears,
        experienceLevel,
        wordCount: text.split(/\s+/).length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to parse resume' }, { status: 500 });
  }
}
