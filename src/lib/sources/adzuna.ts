import axios from 'axios';
import { Job } from '../types';
import { generateDedupeKey } from '../deduplicator';

// ─── Adzuna API Client ────────────────────────────────────────────────────────
// Free tier: https://developer.adzuna.com/
// Requires free API key — falls back gracefully if not configured

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
  created: string;
  category: { label: string; tag: string };
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
}

function mapAdzunaCategory(tag: string): Job['industry'] {
  const map: Record<string, Job['industry']> = {
    it: 'tech',
    engineering: 'tech',
    finance: 'finance',
    banking: 'finance',
    healthcare: 'healthcare',
    education: 'education',
    marketing: 'marketing',
    design: 'design',
    'data-science': 'data',
  };
  return map[tag.toLowerCase()] ?? 'other';
}

function inferLevel(title: string): Job['experienceLevel'] {
  const t = title.toLowerCase();
  if (t.includes('intern')) return 'intern';
  if (t.includes('junior') || t.includes('graduate') || t.includes('entry')) return 'junior';
  if (t.includes('senior') || t.includes('sr.')) return 'senior';
  if (t.includes('lead') || t.includes('staff') || t.includes('principal')) return 'lead';
  if (t.includes('director') || t.includes('vp') || t.includes('head of')) return 'executive';
  return 'mid';
}

export async function fetchAdzunaJobs(
  keywords: string = 'software engineer',
  country: string = 'us',
  page: number = 1,
): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;

  if (!appId || !apiKey) {
    console.warn('[Adzuna] API credentials not configured — skipping');
    return [];
  }

  try {
    const response = await axios.get<AdzunaResponse>(
      `${ADZUNA_BASE}/${country}/search/${page}`,
      {
        params: {
          app_id: appId,
          app_key: apiKey,
          what: keywords,
          results_per_page: 50,
          content_type: 'application/json',
          sort_by: 'date',
        },
        timeout: 10000,
      }
    );

    return response.data.results.map(aj => {
      const remote = aj.title.toLowerCase().includes('remote') ? 'remote' : 'hybrid';
      const jobPartial = {
        title: aj.title,
        company: aj.company.display_name,
        description: aj.description.slice(0, 800),
        responsibilities: [],
        requirements: [],
        skills: [],
        location: aj.location.display_name,
        remote,
        jobType: (aj.contract_time === 'part_time' ? 'part-time' : 'full-time') as Job['jobType'],
        experienceLevel: inferLevel(aj.title),
        industry: mapAdzunaCategory(aj.category.tag),
        salary: aj.salary_min
          ? { min: aj.salary_min, max: aj.salary_max ?? aj.salary_min, currency: 'USD', period: 'annual' as const }
          : undefined,
        applyUrl: aj.redirect_url,
        postedAt: aj.created,
        source: 'adzuna' as const,
        sourceId: `adzuna-${aj.id}`,
        relevanceScore: 0,
        isNew: (Date.now() - new Date(aj.created).getTime()) < 24 * 60 * 60 * 1000,
      };

      const dedupeKey = generateDedupeKey(jobPartial as any);
      return {
        ...jobPartial,
        id: `adzuna-${aj.id}`,
        dedupeKey,
      } as Job;
    });
  } catch (error) {
    console.error('[Adzuna] Fetch failed:', error);
    return [];
  }
}
