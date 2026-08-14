import { Job, ScanRecord } from './types';
import { fetchRemotiveJobs } from './sources/remotive';
import { fetchAdzunaJobs } from './sources/adzuna';
import { fetchHNHiringJobs } from './sources/hn-hiring';
import { fetchRemoteOKJobs } from './sources/remoteok';
import { fetchArbeitnowJobs } from './sources/arbeitnow';
import { fetchTheMuseJobs } from './sources/themuse';
import { fetchJobicyJobs } from './sources/jobicy';
import { fetchRSSFeed, PRESET_RSS_FEEDS } from './sources/rss-parser';
import { deduplicateJobs, deduplicateJobsWithin } from './deduplicator';
import { scoreJobs } from './scorer';
import { upsertJobs, getJobs, getProfile, addScanRecord } from './store';

export interface AggregationResult {
  totalFetched: number;
  newJobs: number;
  updated: number;
  sources: Record<string, { fetched: number; error?: string }>;
  duration: number;
}

// ─── Source Registry ──────────────────────────────────────────────────────────

type SourceFetcher = () => Promise<Job[]>;

const SOURCES: { name: string; fetch: SourceFetcher }[] = [
  // ── Free, no auth required ────────────────────────────────────────────────
  {
    name: 'remotive',
    fetch: () => fetchRemotiveJobs(60),
  },
  {
    name: 'remoteok',
    fetch: () => fetchRemoteOKJobs(60),
  },
  {
    name: 'arbeitnow',
    fetch: () => fetchArbeitnowJobs(1),
  },
  {
    name: 'themuse',
    fetch: () => fetchTheMuseJobs(1, 50),
  },
  {
    name: 'jobicy',
    fetch: () => fetchJobicyJobs(50),
  },
  {
    name: 'hn-hiring',
    fetch: () => fetchHNHiringJobs(40),
  },

  // ── Requires ADZUNA_APP_ID + ADZUNA_API_KEY (free at developer.adzuna.com) ──
  {
    name: 'adzuna',
    fetch: () => fetchAdzunaJobs('software engineer developer', 'us', 1),
  },
];

// ─── Main Aggregator ──────────────────────────────────────────────────────────

export async function runAggregation(): Promise<AggregationResult> {
  const startTime = Date.now();
  const sourceResults: Record<string, { fetched: number; error?: string }> = {};
  const allFetched: Job[] = [];

  // Run all sources concurrently with individual error isolation
  await Promise.allSettled(
    SOURCES.map(async ({ name, fetch }) => {
      try {
        const jobs = await fetch();
        allFetched.push(...jobs);
        sourceResults[name] = { fetched: jobs.length };
        console.log(`[${name}] Fetched ${jobs.length} jobs`);
      } catch (e) {
        sourceResults[name] = { fetched: 0, error: String(e) };
        console.error(`[${name}] Failed:`, e);
      }
    })
  );

  // RSS preset feeds
  for (const feedConfig of PRESET_RSS_FEEDS) {
    try {
      const rssJobs = await fetchRSSFeed(feedConfig);
      allFetched.push(...rssJobs);
      sourceResults[`rss:${feedConfig.sourceName}`] = { fetched: rssJobs.length };
    } catch (e) {
      sourceResults[`rss:${feedConfig.sourceName}`] = { fetched: 0, error: String(e) };
    }
  }

  const totalFetched = allFetched.length;

  // Dedup within incoming batch
  const dedupedIncoming = deduplicateJobsWithin(allFetched);

  // Dedup against existing store
  const existing = getJobs();
  const trulyNew = deduplicateJobs(dedupedIncoming, existing);

  // Score with user profile
  const profile = getProfile();
  const scoredAll = scoreJobs(
    [...trulyNew, ...dedupedIncoming.filter(j => !trulyNew.includes(j))],
    profile
  );

  // Upsert to store
  const { added, updated } = upsertJobs(scoredAll);

  const duration = Date.now() - startTime;

  // Log scan record
  const scanRecord: ScanRecord = {
    id: `scan-${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: 'custom',
    jobsFound: totalFetched,
    newJobs: added,
    duration,
  };
  addScanRecord(scanRecord);

  console.log(
    `[Aggregator] Done in ${duration}ms — fetched: ${totalFetched}, deduplicated to: ${dedupedIncoming.length}, new: ${added}, updated: ${updated}`
  );

  return { totalFetched, newJobs: added, updated, sources: sourceResults, duration };
}

// ─── Get New Jobs Since Timestamp ─────────────────────────────────────────────

export function getNewJobsSince(since: string): Job[] {
  const jobs = getJobs();
  return jobs.filter(j => j.isNew && new Date(j.postedAt) > new Date(since));
}
