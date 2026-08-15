import { prisma } from '@/lib/prisma';
import { ResumeProfile } from '@/lib/types';

export async function getUserProfile(userId: string): Promise<ResumeProfile | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return {
    skills: user.skills,
    titles: user.titles,
    experienceYears: user.experienceYears ?? 0,
    experienceLevel: (user.experienceLevel as ResumeProfile['experienceLevel']) ?? 'mid',
    preferredLocations: user.preferredLocations,
    preferredRemote: user.preferredRemote as ResumeProfile['preferredRemote'],
    preferredIndustries: user.preferredIndustries as ResumeProfile['preferredIndustries'],
    preferredJobTypes: user.preferredJobTypes as ResumeProfile['preferredJobTypes'],
    targetSalaryMin: user.targetSalaryMin ?? undefined,
    targetSalaryMax: user.targetSalaryMax ?? undefined,
    resumeText: user.resumeText ?? undefined,
    updatedAt: (user.profileUpdatedAt ?? user.updatedAt).toISOString(),
  };
}
