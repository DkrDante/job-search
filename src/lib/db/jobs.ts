import { prisma } from '@/lib/prisma';
import { Job, JobSource } from '@/lib/types';
import type { Job as PrismaJob } from '@prisma/client';

export function toJob(
  row: PrismaJob,
  extra: { relevanceScore: number; isNew: boolean; viewedAt?: string }
): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    companyLogo: row.companyLogo ?? undefined,
    description: row.description,
    responsibilities: row.responsibilities,
    requirements: row.requirements,
    skills: row.skills,
    location: row.location,
    remote: row.remote as Job['remote'],
    jobType: row.jobType as Job['jobType'],
    experienceLevel: row.experienceLevel as Job['experienceLevel'],
    industry: row.industry as Job['industry'],
    salary:
      row.salaryMin != null || row.salaryMax != null
        ? {
            min: row.salaryMin ?? undefined,
            max: row.salaryMax ?? undefined,
            currency: row.salaryCurrency ?? 'USD',
            period: (row.salaryPeriod as 'hourly' | 'monthly' | 'annual' | null) ?? 'annual',
          }
        : undefined,
    applyUrl: row.applyUrl,
    deadline: row.deadline?.toISOString(),
    postedAt: row.postedAt.toISOString(),
    source: row.source as JobSource,
    sourceId: row.sourceId ?? undefined,
    relevanceScore: extra.relevanceScore,
    isNew: extra.isNew,
    viewedAt: extra.viewedAt,
    dedupeKey: row.dedupeKey,
  };
}

export async function getAllJobs(limit = 2000): Promise<PrismaJob[]> {
  return prisma.job.findMany({
    orderBy: { postedAt: 'desc' },
    take: limit,
  });
}

export async function getJobById(id: string): Promise<PrismaJob | null> {
  return prisma.job.findUnique({ where: { id } });
}

export async function upsertFetchedJobs(jobs: Job[]): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;

  for (const job of jobs) {
    const existing = await prisma.job.findUnique({ where: { dedupeKey: job.dedupeKey } });
    const data = {
      title: job.title,
      company: job.company,
      companyLogo: job.companyLogo,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      skills: job.skills,
      location: job.location,
      remote: job.remote,
      jobType: job.jobType,
      experienceLevel: job.experienceLevel,
      industry: job.industry,
      salaryMin: job.salary?.min,
      salaryMax: job.salary?.max,
      salaryCurrency: job.salary?.currency,
      salaryPeriod: job.salary?.period,
      applyUrl: job.applyUrl,
      deadline: job.deadline ? new Date(job.deadline) : null,
      postedAt: new Date(job.postedAt),
      source: job.source,
      sourceId: job.sourceId,
      dedupeKey: job.dedupeKey,
    };

    if (existing) {
      await prisma.job.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.job.create({ data });
      added++;
    }
  }

  return { added, updated };
}

export async function getLastRefreshed(): Promise<string | null> {
  const latest = await prisma.scanRecord.findFirst({ orderBy: { timestamp: 'desc' } });
  return latest?.timestamp.toISOString() ?? null;
}

export async function addScanRecord(record: {
  source: string;
  jobsFound: number;
  newJobs: number;
  duration: number;
  error?: string;
}): Promise<void> {
  await prisma.scanRecord.create({ data: record });
}

export async function markJobViewed(userId: string, jobId: string): Promise<void> {
  await prisma.jobView.upsert({
    where: { userId_jobId: { userId, jobId } },
    create: { userId, jobId },
    update: { viewedAt: new Date() },
  });
}

export async function getViewedJobIds(userId: string, jobIds: string[]): Promise<Map<string, string>> {
  const views = await prisma.jobView.findMany({
    where: { userId, jobId: { in: jobIds } },
  });
  return new Map(views.map(v => [v.jobId, v.viewedAt.toISOString()]));
}
