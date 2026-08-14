import axios from 'axios';
import { Job } from '../types';
import { generateDedupeKey } from '../deduplicator';

// ─── Remotive.io API Client ────────────────────────────────────────────────────
// Free API — no auth required: https://remotive.com/api/remote-jobs

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

function parseSalary(salaryStr: string) {
  if (!salaryStr) return undefined;
  const matches = salaryStr.match(/\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/);
  if (matches) {
    return {
      min: parseInt(matches[1].replace(/,/g, '')),
      max: parseInt(matches[2].replace(/,/g, '')),
      currency: 'USD',
      period: 'annual' as const,
    };
  }
  return undefined;
}

function mapCategory(category: string): Job['industry'] {
  const map: Record<string, Job['industry']> = {
    'Software Development': 'tech',
    'DevOps / Sysadmin': 'devops',
    'Data': 'data',
    'Finance / Legal': 'finance',
    'Design': 'design',
    'Marketing': 'marketing',
    'Product': 'product',
    'Healthcare': 'healthcare',
    'Education': 'education',
  };
  for (const [key, val] of Object.entries(map)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 'other';
}

function inferExperienceLevel(title: string, description: string): Job['experienceLevel'] {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('intern') || text.includes('internship')) return 'intern';
  if (text.includes('junior') || text.includes('entry level') || text.includes('0-2')) return 'junior';
  if (text.includes('senior') || text.includes('sr.') || text.includes('5+ years')) return 'senior';
  if (text.includes('lead') || text.includes('staff') || text.includes('principal')) return 'lead';
  if (text.includes('director') || text.includes('vp ') || text.includes('executive')) return 'executive';
  return 'mid';
}

export async function fetchRemotiveJobs(limit: number = 50): Promise<Job[]> {
  try {
    const response = await axios.get<RemotiveResponse>(
      'https://remotive.com/api/remote-jobs',
      {
        params: { limit },
        timeout: 10000,
        headers: { 'Accept': 'application/json' },
      }
    );

    return response.data.jobs.map(rj => {
      const skills = rj.tags.slice(0, 8);
      const level = inferExperienceLevel(rj.title, rj.description);
      const jobPartial = {
        title: rj.title,
        company: rj.company_name,
        description: rj.description.replace(/<[^>]*>/g, '').slice(0, 800),
        responsibilities: [],
        requirements: [],
        skills,
        location: rj.candidate_required_location || 'Remote',
        remote: 'remote' as const,
        jobType: (rj.job_type?.toLowerCase().includes('contract') ? 'contract' : 'full-time') as Job['jobType'],
        experienceLevel: level,
        industry: mapCategory(rj.category),
        salary: parseSalary(rj.salary),
        applyUrl: rj.url,
        postedAt: rj.publication_date,
        source: 'remotive' as const,
        sourceId: `remotive-${rj.id}`,
        relevanceScore: 0,
        isNew: (Date.now() - new Date(rj.publication_date).getTime()) < 24 * 60 * 60 * 1000,
        companyLogo: rj.company_logo,
      };

      const dedupeKey = generateDedupeKey(jobPartial as any);
      return {
        ...jobPartial,
        id: `remotive-${rj.id}`,
        dedupeKey,
      } as Job;
    });
  } catch (error) {
    console.error('[Remotive] Fetch failed:', error);
    return [];
  }
}
