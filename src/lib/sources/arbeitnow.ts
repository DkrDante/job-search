import axios from 'axios';
import { Job } from '../types';
import { generateDedupeKey } from '../deduplicator';

// ─── Arbeitnow API ────────────────────────────────────────────────────────────
// Free, no-auth API with global tech jobs: https://arbeitnow.com/api/job-board-api
// Returns ~100 jobs per page. No rate limit stated; be respectful.

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;   // unix timestamp
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
  links: { next?: string };
}

function mapJobType(types: string[]): Job['jobType'] {
  const t = types.join(' ').toLowerCase();
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract') || t.includes('freelance')) return 'contract';
  if (t.includes('intern')) return 'internship';
  return 'full-time';
}

function inferLevel(title: string): Job['experienceLevel'] {
  const t = title.toLowerCase();
  if (t.includes('intern')) return 'intern';
  if (t.includes('junior') || t.includes('entry') || t.includes('graduate')) return 'junior';
  if (t.includes('senior') || t.includes('sr.') || t.includes('sr ')) return 'senior';
  if (t.includes('lead') || t.includes('staff') || t.includes('principal')) return 'lead';
  if (t.includes('director') || t.includes('head of') || t.includes('vp')) return 'executive';
  return 'mid';
}

function inferIndustry(tags: string[], title: string): Job['industry'] {
  const text = `${tags.join(' ')} ${title}`.toLowerCase();
  if (text.match(/devops|kubernetes|terraform|cloud|platform|sre/)) return 'devops';
  if (text.match(/data|machine learning|ai|analyst|scientist|spark/)) return 'data';
  if (text.match(/design|figma|ux|ui\b/)) return 'design';
  if (text.match(/marketing|seo|growth|content/)) return 'marketing';
  if (text.match(/product manager|pm\b|roadmap/)) return 'product';
  if (text.match(/finance|accounting|fintech|bank/)) return 'finance';
  if (text.match(/health|medical|clinical|pharma/)) return 'healthcare';
  return 'tech';
}

export async function fetchArbeitnowJobs(page: number = 1): Promise<Job[]> {
  try {
    const response = await axios.get<ArbeitnowResponse>(
      'https://arbeitnow.com/api/job-board-api',
      {
        params: { page },
        timeout: 10000,
        headers: { 'Accept': 'application/json' },
      }
    );

    return response.data.data.map(aj => {
      const postedAt = new Date(aj.created_at * 1000).toISOString();
      const jobPartial = {
        title: aj.title.slice(0, 100),
        company: aj.company_name.slice(0, 80),
        description: aj.description.replace(/<[^>]*>/g, '').slice(0, 800),
        responsibilities: [],
        requirements: [],
        skills: aj.tags.slice(0, 8),
        location: aj.location || (aj.remote ? 'Remote' : 'Unknown'),
        remote: aj.remote ? ('remote' as const) : ('hybrid' as const),
        jobType: mapJobType(aj.job_types),
        experienceLevel: inferLevel(aj.title),
        industry: inferIndustry(aj.tags, aj.title),
        applyUrl: aj.url,
        postedAt,
        source: 'arbeitnow' as const,
        sourceId: `arbeitnow-${aj.slug}`,
        relevanceScore: 0,
        isNew: (Date.now() - new Date(postedAt).getTime()) < 24 * 60 * 60 * 1000,
      };

      const dedupeKey = generateDedupeKey(jobPartial as any);
      return { ...jobPartial, id: `arbeitnow-${aj.slug}`, dedupeKey } as Job;
    });
  } catch (error) {
    console.error('[Arbeitnow] Fetch failed:', error);
    return [];
  }
}
