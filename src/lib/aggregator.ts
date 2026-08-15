import { Job } from './types';
import { fetchRemotiveJobs } from './sources/remotive';
import { fetchAdzunaJobs } from './sources/adzuna';
import { fetchHNHiringJobs } from './sources/hn-hiring';
import { fetchRemoteOKJobs } from './sources/remoteok';
import { fetchArbeitnowJobs } from './sources/arbeitnow';
import { fetchTheMuseJobs } from './sources/themuse';
import { fetchJobicyJobs } from './sources/jobicy';
import { fetchRSSFeed, PRESET_RSS_FEEDS } from './sources/rss-parser';
import { deduplicateJobs, deduplicateJobsWithin } from './deduplicator';
import { getAllJobs, upsertFetchedJobs, addScanRecord, toJob } from './db/jobs';

export interface AggregationResult {
  totalFetched: number;
  newJobs: number;
  updated: number;
  sources: Record<string, { fetched: number; error?: string }>;
  duration: number;
}

type SourceFetcher = () => Promise<Job[]>;

const SOURCES: { name: string; fetch: SourceFetcher }[] = [
  { name: 'remotive', fetch: () => fetchRemotiveJobs(60) },
  { name: 'remoteok', fetch: () => fetchRemoteOKJobs(60) },
  { name: 'arbeitnow', fetch: () => fetchArbeitnowJobs(1) },
  { name: 'themuse', fetch: () => fetchTheMuseJobs(1, 50) },
  { name: 'jobicy', fetch: () => fetchJobicyJobs(50) },
  { name: 'hn-hiring', fetch: () => fetchHNHiringJobs(40) },
  { name: 'adzuna', fetch: () => fetchAdzunaJobs('software engineer developer', 'us', 1) },
];

export async function runAggregation(): Promise<AggregationResult> {
  const startTime = Date.now();
  const sourceResults: Record<string, { fetched: number; error?: string }> = {};
  const allFetched: Job[] = [];

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
  const dedupedIncoming = deduplicateJobsWithin(allFetched);

  const existingRows = await getAllJobs();
  const existing = existingRows.map(row => toJob(row, { relevanceScore: 0, isNew: false }));
  const trulyNew = deduplicateJobs(dedupedIncoming, existing);

  const { added, updated } = await upsertFetchedJobs([
    ...trulyNew,
    ...dedupedIncoming.filter(j => !trulyNew.includes(j)),
  ]);

  const duration = Date.now() - startTime;

  await addScanRecord({
    source: 'custom',
    jobsFound: totalFetched,
    newJobs: added,
    duration,
  });

  console.log(
    `[Aggregator] Done in ${duration}ms — fetched: ${totalFetched}, deduplicated to: ${dedupedIncoming.length}, new: ${added}, updated: ${updated}`
  );

  return { totalFetched, newJobs: added, updated, sources: sourceResults, duration };
}
