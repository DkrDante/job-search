import { prisma } from '@/lib/prisma';
import { ResumeProfile } from '@/lib/types';

export async function getUserProfile(userId: string): Promise<ResumeProfile | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.profileUpdatedAt) return null;

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

export async function updateUserProfile(
  userId: string,
  profile: Partial<ResumeProfile>
): Promise<ResumeProfile | null> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      skills: profile.skills,
      titles: profile.titles,
      experienceYears: profile.experienceYears,
      experienceLevel: profile.experienceLevel,
      preferredLocations: profile.preferredLocations,
      preferredRemote: profile.preferredRemote,
      preferredIndustries: profile.preferredIndustries,
      preferredJobTypes: profile.preferredJobTypes,
      targetSalaryMin: profile.targetSalaryMin,
      targetSalaryMax: profile.targetSalaryMax,
      resumeText: profile.resumeText,
      profileUpdatedAt: new Date(),
    },
  });
  return getUserProfile(userId);
}
