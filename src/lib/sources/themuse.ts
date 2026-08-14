import axios from 'axios';
import { Job } from '../types';
import { generateDedupeKey } from '../deduplicator';

// ─── The Muse API ─────────────────────────────────────────────────────────────
// Free public API: https://www.themuse.com/developers/api/v2
// No auth required for read access. Strong on culture-forward & startup roles.

interface MuseJob {
  id: number;
  name: string;               // job title
  publication_date: string;
  short_name: string;
  refs: { landing_page: string };
  contents: string;           // HTML description
  locations: { name: string }[];
  levels: { name: string; short_name: string }[];
  tags: { name: string }[];
  categories: { name: string }[];
  company: {
    id: number;
    name: string;
    short_name: string;
  };
}

interface MuseResponse {
  results: MuseJob[];
  page: number;
  page_count: number;
  total: number;
}

function mapMuseLevel(levels: { name: string }[]): Job['experienceLevel'] {
  const name = levels[0]?.name?.toLowerCase() ?? '';
  if (name.includes('intern')) return 'intern';
  if (name.includes('entry') || name.includes('junior')) return 'junior';
  if (name.includes('senior') || name.includes('experienced')) return 'senior';
  if (name.includes('manager') || name.includes('director')) return 'executive';
  return 'mid';
}

function mapMuseIndustry(categories: { name: string }[], tags: { name: string }[]): Job['industry'] {
  const text = `${categories.map(c => c.name).join(' ')} ${tags.map(t => t.name).join(' ')}`.toLowerCase();
  if (text.match(/engineering|software|dev|tech/)) return 'tech';
  if (text.match(/data|analytics|machine learning|ai/)) return 'data';
  if (text.match(/design|creative|ux|ui/)) return 'design';
  if (text.match(/marketing|growth|content/)) return 'marketing';
  if (text.match(/product/)) return 'product';
  if (text.match(/finance|account|banking/)) return 'finance';
  if (text.match(/health|medical|clinical/)) return 'healthcare';
  if (text.match(/devops|infra|cloud/)) return 'devops';
  if (text.match(/education|learning/)) return 'education';
  return 'other';
}

export async function fetchTheMuseJobs(page: number = 1, limit: number = 50): Promise<Job[]> {
  try {
    const response = await axios.get<MuseResponse>(
      'https://www.themuse.com/api/public/jobs',
      {
        params: {
          page,
          descending: true,
        },
        timeout: 10000,
        headers: { 'Accept': 'application/json' },
      }
    );

    return response.data.results.slice(0, limit).map(mj => {
      const postedAt = new Date(mj.publication_date).toISOString();
      const location = mj.locations[0]?.name ?? 'Remote';
      const isRemote = location.toLowerCase().includes('remote') ||
        mj.tags.some(t => t.name.toLowerCase().includes('remote'));

      const jobPartial = {
        title: mj.name.slice(0, 100),
        company: mj.company.name.slice(0, 80),
        description: mj.contents.replace(/<[^>]*>/g, '').slice(0, 800),
        responsibilities: [],
        requirements: [],
        skills: mj.tags.map(t => t.name).slice(0, 8),
        location,
        remote: isRemote ? ('remote' as const) : ('hybrid' as const),
        jobType: 'full-time' as const,
        experienceLevel: mapMuseLevel(mj.levels),
        industry: mapMuseIndustry(mj.categories, mj.tags),
        applyUrl: mj.refs.landing_page,
        postedAt,
        source: 'themuse' as const,
        sourceId: `themuse-${mj.id}`,
        relevanceScore: 0,
        isNew: (Date.now() - new Date(postedAt).getTime()) < 24 * 60 * 60 * 1000,
      };

      const dedupeKey = generateDedupeKey(jobPartial as any);
      return { ...jobPartial, id: `themuse-${mj.id}`, dedupeKey } as Job;
    });
  } catch (error) {
    console.error('[TheMuse] Fetch failed:', error);
    return [];
  }
}
