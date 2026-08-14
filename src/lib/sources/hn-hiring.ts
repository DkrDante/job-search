import axios from 'axios';
import { Job } from '../types';
import { generateDedupeKey } from '../deduplicator';

// ─── HN Who's Hiring Scraper ──────────────────────────────────────────────────
// Uses HN Algolia API to fetch monthly "Who's Hiring" thread

interface HNItem {
  objectID: string;
  author: string;
  comment_text: string;
  created_at: string;
  story_id: number;
}

interface HNAlgoliaResponse {
  hits: HNItem[];
}

function parseHNComment(comment: HNItem): Partial<Job> | null {
  const text = comment.comment_text?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || text.length < 50) return null;

  // Parse company | title | location | remote format
  const lines = text.split(/\n|<br>|\|/).map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0] ?? '';

  const parts = firstLine.split('|').map(p => p.trim());
  const company = parts[0]?.slice(0, 60) || 'Unknown';
  const title = parts[1] || 'Software Engineer';
  const locationPart = parts[2] || '';

  const isRemote = text.toLowerCase().includes('remote') || locationPart.toLowerCase().includes('remote');
  const location = isRemote ? 'Remote' : (locationPart || 'Unknown');
  const remote: Job['remote'] = isRemote ? 'remote' : 'onsite';

  // Extract skills from text
  const skillPatterns = [
    'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java', 'C++',
    'React', 'Node.js', 'AWS', 'Kubernetes', 'PostgreSQL', 'ML', 'LLMs',
  ];
  const skills = skillPatterns.filter(s => text.includes(s));

  return {
    title: title.slice(0, 100),
    company: company.slice(0, 80),
    description: text.slice(0, 800),
    responsibilities: [],
    requirements: [],
    skills,
    location,
    remote,
    jobType: 'full-time',
    experienceLevel: 'mid',
    industry: 'tech',
    applyUrl: `https://news.ycombinator.com/item?id=${comment.objectID}`,
    postedAt: comment.created_at,
    source: 'hn-hiring' as const,
    sourceId: `hn-${comment.objectID}`,
    relevanceScore: 0,
    isNew: (Date.now() - new Date(comment.created_at).getTime()) < 24 * 60 * 60 * 1000,
  };
}

export async function fetchHNHiringJobs(limit: number = 30): Promise<Job[]> {
  try {
    // Search for the latest "Ask HN: Who is hiring?" thread
    const threadSearch = await axios.get<{ hits: { objectID: string; title: string; created_at: string }[] }>(
      'https://hn.algolia.com/api/v1/search',
      {
        params: {
          query: 'Ask HN: Who is hiring?',
          tags: 'story',
          hitsPerPage: 3,
        },
        timeout: 8000,
      }
    );

    const latestThread = threadSearch.data.hits[0];
    if (!latestThread) return [];

    const commentsResponse = await axios.get<HNAlgoliaResponse>(
      'https://hn.algolia.com/api/v1/search',
      {
        params: {
          tags: `comment,story_${latestThread.objectID}`,
          hitsPerPage: limit,
        },
        timeout: 8000,
      }
    );

    const jobs: Job[] = [];
    for (const comment of commentsResponse.data.hits) {
      const parsed = parseHNComment(comment);
      if (!parsed || !parsed.company || !parsed.title) continue;

      const dedupeKey = generateDedupeKey(parsed as any);
      jobs.push({
        ...parsed,
        id: `hn-${comment.objectID}`,
        dedupeKey,
        description: parsed.description ?? '',
        responsibilities: [],
        requirements: [],
        skills: parsed.skills ?? [],
        location: parsed.location ?? 'Remote',
        remote: parsed.remote ?? 'remote',
        jobType: 'full-time',
        experienceLevel: 'mid',
        industry: 'tech',
        applyUrl: parsed.applyUrl ?? '',
        postedAt: parsed.postedAt ?? new Date().toISOString(),
        source: 'hn-hiring',
        sourceId: `hn-${comment.objectID}`,
        relevanceScore: 0,
        isNew: parsed.isNew ?? false,
        title: parsed.title ?? 'Engineer',
        company: parsed.company ?? 'Unknown',
        salary: undefined,
      } as Job);
    }

    return jobs;
  } catch (error) {
    console.error('[HN Hiring] Fetch failed:', error);
    return [];
  }
}
