import Fuse from 'fuse.js';
import { Job } from './types';

// ─── Deduplication Engine ─────────────────────────────────────────────────────

function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeCompositeKey(job: Job): string {
  const title = normalizeStr(job.title);
  const company = normalizeStr(job.company);
  const location = normalizeStr(job.location).replace(/remote/g, 'remote');
  return `${company}::${title}::${location}`;
}

function hashKey(key: string): string {
  // Simple djb2 hash for fast deduplication
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) + key.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export function generateDedupeKey(job: Omit<Job, 'dedupeKey' | 'id' | 'relevanceScore' | 'isNew'>): string {
  const compositeKey = makeCompositeKey(job as Job);
  return hashKey(compositeKey);
}

export function deduplicateJobs(incoming: Job[], existing: Job[]): Job[] {
  // Step 1: Exact key dedup within incoming
  const seenKeys = new Set<string>();
  const uniqueIncoming: Job[] = [];
  for (const job of incoming) {
    if (!seenKeys.has(job.dedupeKey)) {
      seenKeys.add(job.dedupeKey);
      uniqueIncoming.push(job);
    }
  }

  // Step 2: Filter out jobs already in existing by exact key
  const existingKeys = new Set(existing.map(j => j.dedupeKey));
  const newJobs = uniqueIncoming.filter(j => !existingKeys.has(j.dedupeKey));

  if (newJobs.length === 0) return [];

  // Step 3: Fuzzy dedup against existing using Fuse.js
  const fuse = new Fuse(existing, {
    keys: [
      { name: 'title', weight: 0.6 },
      { name: 'company', weight: 0.4 },
    ],
    threshold: 0.2, // Only match very similar titles (lower = stricter)
    includeScore: true,
  });

  const dedupedNew: Job[] = [];
  const addedNormalized = new Set<string>();

  for (const job of newJobs) {
    const normalizedKey = normalizeStr(`${job.company} ${job.title}`);
    if (addedNormalized.has(normalizedKey)) continue;

    const results = fuse.search({ title: job.title, company: job.company } as any);
    const isFuzzyDupe = results.some(r => {
      const score = r.score ?? 1;
      // If same company AND very similar title → duplicate
      return score < 0.15 && normalizeStr(r.item.company) === normalizeStr(job.company);
    });

    if (!isFuzzyDupe) {
      dedupedNew.push(job);
      addedNormalized.add(normalizedKey);
    }
  }

  return dedupedNew;
}

export function deduplicateJobsWithin(jobs: Job[]): Job[] {
  const seen = new Map<string, Job>();
  for (const job of jobs) {
    const existing = seen.get(job.dedupeKey);
    if (!existing || new Date(job.postedAt) > new Date(existing.postedAt)) {
      seen.set(job.dedupeKey, job);
    }
  }
  return Array.from(seen.values());
}
