import { prisma } from '@/lib/prisma';
import { AlertConfig } from '@/lib/types';
import type { Alert as PrismaAlert } from '@prisma/client';

function toAlert(row: PrismaAlert): AlertConfig {
  return {
    id: row.id,
    name: row.name,
    keywords: row.keywords,
    excludeKeywords: row.excludeKeywords,
    locations: row.locations,
    remote: row.remote as AlertConfig['remote'],
    experienceLevels: row.experienceLevels as AlertConfig['experienceLevels'],
    industries: row.industries as AlertConfig['industries'],
    minSalary: row.minSalary ?? undefined,
    maxSalary: row.maxSalary ?? undefined,
    sources: row.sources as AlertConfig['sources'],
    frequency: row.frequency as AlertConfig['frequency'],
    isActive: row.isActive,
    lastTriggered: row.lastTriggered?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAlertsForUser(userId: string): Promise<AlertConfig[]> {
  const rows = await prisma.alert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return rows.map(toAlert);
}

export async function createAlert(userId: string, input: Omit<AlertConfig, 'id' | 'createdAt'>): Promise<AlertConfig> {
  const row = await prisma.alert.create({
    data: {
      userId,
      name: input.name,
      keywords: input.keywords,
      excludeKeywords: input.excludeKeywords,
      locations: input.locations,
      remote: input.remote,
      experienceLevels: input.experienceLevels,
      industries: input.industries,
      minSalary: input.minSalary,
      maxSalary: input.maxSalary,
      sources: input.sources,
      frequency: input.frequency,
      isActive: input.isActive,
    },
  });
  return toAlert(row);
}

export async function updateAlert(
  userId: string,
  id: string,
  patch: Partial<AlertConfig>
): Promise<AlertConfig | null> {
  const existing = await prisma.alert.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const row = await prisma.alert.update({
    where: { id },
    data: {
      name: patch.name,
      keywords: patch.keywords,
      excludeKeywords: patch.excludeKeywords,
      locations: patch.locations,
      remote: patch.remote,
      experienceLevels: patch.experienceLevels,
      industries: patch.industries,
      minSalary: patch.minSalary,
      maxSalary: patch.maxSalary,
      sources: patch.sources,
      frequency: patch.frequency,
      isActive: patch.isActive,
    },
  });
  return toAlert(row);
}

export async function deleteAlert(userId: string, id: string): Promise<boolean> {
  const result = await prisma.alert.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
