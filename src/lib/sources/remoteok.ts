import axios from 'axios';
import { Job } from '../types';
import { generateDedupeKey } from '../deduplicator';

// ─── Remote OK API ────────────────────────────────────────────────────────────
// Public JSON API — no auth required: https://remoteok.com/api
// Returns 100–250 remote jobs. Rate limit: ~60 req/hour.

interface RemoteOKJob {
  id: string;
  epoch: number;
  date: string;
  company: string;
  company_logo?: string;
  position: string;
  description: string;
  tags: string[];
  location: string;
  salary_min?: number;
  salary_max?: number;
  url: string;
  apply_url?: string;
}

function inferLevel(title: string, tags: string[]): Job['experienceLevel'] {
  const text = `${title} ${tags.join(' ')}`.toLowerCase();
  if (text.includes('intern')) return 'intern';
  if (text.includes('junior') || text.includes('entry')) return 'junior';
  if (text.includes('senior') || text.includes('sr ') || text.includes('sr.')) return 'senior';
  if (text.includes('lead') || text.includes('staff') || text.includes('principal')) return 'lead';
  if (text.includes('director') || text.includes('vp') || text.includes('head of')) return 'executive';
  return 'mid';
}

function inferIndustry(tags: string[], position: string): Job['industry'] {
  const text = `${tags.join(' ')} ${position}`.toLowerCase();
  if (text.match(/devops|infra|cloud|kubernetes|sre|platform/)) return 'devops';
  if (text.match(/data|ml|ai|machine learning|analytics|scientist/)) return 'data';
  if (text.match(/design|ui|ux|frontend|css/)) return 'design';
  if (text.match(/market|growth|seo|content/)) return 'marketing';
  if (text.match(/product|pm|product manager/)) return 'product';
  if (text.match(/finance|accounting|fintech/)) return 'finance';
  if (text.match(/health|medical|clinical/)) return 'healthcare';
  return 'tech';
}

export async function fetchRemoteOKJobs(limit: number = 60): Promise<Job[]> {
  try {
    // Note: API returns legal disclaimer as first element, skip it
    const response = await axios.get<RemoteOKJob[]>('https://remoteok.com/api', {
      timeout: 12000,
      headers: {
        'User-Agent': 'JobRadar/1.0 (job aggregator)',
        'Accept': 'application/json',
      },
    });

    const raw = response.data;
    // First element is a legal disclaimer object — filter out non-job entries
    const jobs: Job[] = [];
    for (const rj of raw.slice(1, limit + 1)) {
      if (!rj.position || !rj.company || !rj.url) continue;

      const skills = (rj.tags ?? []).slice(0, 8);
      const salary = rj.salary_min
        ? { min: rj.salary_min, max: rj.salary_max ?? rj.salary_min, currency: 'USD', period: 'annual' as const }
        : undefined;

      const jobPartial = {
        title: rj.position.slice(0, 100),
        company: rj.company.slice(0, 80),
        companyLogo: rj.company_logo,
        description: rj.description?.replace(/<[^>]*>/g, '').slice(0, 800) ?? '',
        responsibilities: [],
        requirements: [],
        skills,
        location: rj.location || 'Remote (Worldwide)',
        remote: 'remote' as const,
        jobType: 'full-time' as const,
        experienceLevel: inferLevel(rj.position, rj.tags ?? []),
        industry: inferIndustry(rj.tags ?? [], rj.position),
        salary,
        applyUrl: rj.apply_url ?? rj.url,
        postedAt: rj.date ?? new Date(rj.epoch * 1000).toISOString(),
        source: 'remoteok' as const,
        sourceId: `remoteok-${rj.id}`,
        relevanceScore: 0,
        isNew: (Date.now() - new Date(rj.date).getTime()) < 24 * 60 * 60 * 1000,
      };

      const dedupeKey = generateDedupeKey(jobPartial as any);
      jobs.push({ ...jobPartial, id: `remoteok-${rj.id}`, dedupeKey } as Job);
    }

    return jobs;
  } catch (error) {
    console.error('[RemoteOK] Fetch failed:', error);
    return [];
  }
}
