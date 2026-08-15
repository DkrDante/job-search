import { prisma } from '@/lib/prisma';
import { ApplicationRecord, ApplicationStatus } from '@/lib/types';
import type { Application as PrismaApplication } from '@prisma/client';

function toApplication(row: PrismaApplication): ApplicationRecord {
  return {
    id: row.id,
    jobId: row.jobId,
    status: row.status as ApplicationStatus,
    notes: row.notes,
    appliedAt: row.appliedAt?.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    interviewDate: row.interviewDate?.toISOString(),
    offerAmount: row.offerAmount ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
  };
}

export async function getApplicationsForUser(userId: string): Promise<ApplicationRecord[]> {
  const rows = await prisma.application.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return rows.map(toApplication);
}

// Upsert (not create) keyed on [userId, jobId]: the schema enforces one application
// row per job per user, so re-bookmarking/re-quick-applying to the same job updates
// its existing kanban row instead of erroring on a unique-constraint violation.
export async function upsertApplication(
  userId: string,
  input: { jobId: string; status?: ApplicationStatus; notes?: string }
): Promise<ApplicationRecord> {
  const now = new Date();
  const row = await prisma.application.upsert({
    where: { userId_jobId: { userId, jobId: input.jobId } },
    create: {
      userId,
      jobId: input.jobId,
      status: input.status ?? 'bookmarked',
      notes: input.notes ?? '',
      appliedAt: input.status === 'applied' ? now : null,
    },
    update: {
      status: input.status ?? 'bookmarked',
      appliedAt: input.status === 'applied' ? now : undefined,
    },
  });
  return toApplication(row);
}

export async function updateApplication(
  userId: string,
  id: string,
  patch: Partial<ApplicationRecord>
): Promise<ApplicationRecord | null> {
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const row = await prisma.application.update({
    where: { id },
    data: {
      status: patch.status,
      notes: patch.notes,
      interviewDate: patch.interviewDate ? new Date(patch.interviewDate) : undefined,
      offerAmount: patch.offerAmount,
      rejectionReason: patch.rejectionReason,
      appliedAt: patch.status === 'applied' && !existing.appliedAt ? new Date() : undefined,
    },
  });
  return toApplication(row);
}

export async function deleteApplication(userId: string, id: string): Promise<boolean> {
  const result = await prisma.application.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
