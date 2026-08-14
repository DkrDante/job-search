import axios from 'axios';
import { Job } from '../types';
import { generateDedupeKey } from '../deduplicator';

// ─── Jobicy API ───────────────────────────────────────────────────────────────
// Free public RSS/JSON API: https://jobicy.com/?feed=job_feed
// No auth required. Focuses on fully-remote roles across all industries.

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  jobIndustry: string[];
  jobType: string[];
  jobGeo: string;
  jobLevel: string;
  pubDate: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryCurrency?: string;
  jobDescription: string;
  jobExcerpt?: string;
}

interface JobicyResponse {
  jobs: JobicyJob[];
}

function mapJobicyLevel(level: string): Job['experienceLevel'] {
  const l = level.toLowerCase();
  if (l.includes('intern')) return 'intern';
  if (l.includes('junior') || l.includes('entry')) return 'junior';
  if (l.includes('senior')) return 'senior';
  if (l.includes('lead') || l.includes('principal') || l.includes('staff')) return 'lead';
  if (l.includes('executive') || l.includes('director') || l.includes('vp')) return 'executive';
  return 'mid';
}

function mapJobicyIndustry(industries: string[]): Job['industry'] {
  const text = industries.join(' ').toLowerCase();
  if (text.match(/software|engineering|developer|tech/)) return 'tech';
  if (text.match(/data|analytics|machine learning|ai/)) return 'data';
  if (text.match(/design|creative|ux|ui/)) return 'design';
  if (text.match(/marketing|growth|seo/)) return 'marketing';
  if (text.match(/product/)) return 'product';
  if (text.match(/finance|accounting|fintech/)) return 'finance';
  if (text.match(/health|medical/)) return 'healthcare';
  if (text.match(/devops|infra|cloud|sre/)) return 'devops';
  if (text.match(/education/)) return 'education';
  return 'other';
}

function mapJobicyType(types: string[]): Job['jobType'] {
  const t = types.join(' ').toLowerCase();
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract') || t.includes('freelance')) return 'contract';
  if (t.includes('intern')) return 'internship';
  return 'full-time';
}

export async function fetchJobicyJobs(count: number = 50): Promise<Job[]> {
  try {
    const response = await axios.get<JobicyResponse>(
      'https://jobicy.com/api/v2/remote-jobs',
      {
        params: { count, geo: 'worldwide' },
        timeout: 10000,
        headers: { 'Accept': 'application/json' },
      }
    );

    return (response.data.jobs ?? []).map(jj => {
      const postedAt = new Date(jj.pubDate).toISOString();
      const salary = jj.annualSalaryMin
        ? {
            min: jj.annualSalaryMin,
            max: jj.annualSalaryMax ?? jj.annualSalaryMin,
            currency: jj.salaryCurrency ?? 'USD',
            period: 'annual' as const,
          }
        : undefined;

      const jobPartial = {
        title: jj.jobTitle.slice(0, 100),
        company: jj.companyName.slice(0, 80),
        companyLogo: jj.companyLogo,
        description: jj.jobDescription.replace(/<[^>]*>/g, '').slice(0, 800),
        responsibilities: [],
        requirements: [],
        skills: jj.jobIndustry.slice(0, 6),
        location: jj.jobGeo || 'Remote (Worldwide)',
        remote: 'remote' as const,
        jobType: mapJobicyType(jj.jobType),
        experienceLevel: mapJobicyLevel(jj.jobLevel),
        industry: mapJobicyIndustry(jj.jobIndustry),
        salary,
        applyUrl: jj.url,
        postedAt,
        source: 'jobicy' as const,
        sourceId: `jobicy-${jj.id}`,
        relevanceScore: 0,
        isNew: (Date.now() - new Date(postedAt).getTime()) < 24 * 60 * 60 * 1000,
      };

      const dedupeKey = generateDedupeKey(jobPartial as any);
      return { ...jobPartial, id: `jobicy-${jj.id}`, dedupeKey } as Job;
    });
  } catch (error) {
    console.error('[Jobicy] Fetch failed:', error);
    return [];
  }
}
