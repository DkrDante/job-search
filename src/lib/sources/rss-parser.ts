import { Job } from '../types';
import { generateDedupeKey } from '../deduplicator';
import axios from 'axios';

// ─── Generic RSS Parser ────────────────────────────────────────────────────────

interface RSSItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  company?: string;
  location?: string;
}

function extractText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/${tag}>`, 'is'));
  return match?.[1]?.trim() ?? '';
}

function parseRSSItems(xmlText: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/gi);

  for (const match of itemMatches) {
    const itemXml = match[1];
    items.push({
      title: extractText(itemXml, 'title'),
      link: extractText(itemXml, 'link'),
      description: extractText(itemXml, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600),
      pubDate: extractText(itemXml, 'pubDate'),
      company: extractText(itemXml, 'company') || extractText(itemXml, 'source'),
      location: extractText(itemXml, 'location'),
    });
  }

  return items;
}

export interface RSSFeedConfig {
  url: string;
  sourceName: string;
  defaultCompany?: string;
  defaultIndustry?: Job['industry'];
}

export async function fetchRSSFeed(config: RSSFeedConfig): Promise<Job[]> {
  try {
    const response = await axios.get<string>(config.url, {
      timeout: 8000,
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
      responseType: 'text',
    });

    const items = parseRSSItems(response.data);
    const jobs: Job[] = [];

    for (const item of items) {
      if (!item.title || !item.link) continue;

      const postedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
      const isNew = (Date.now() - new Date(postedAt).getTime()) < 24 * 60 * 60 * 1000;
      const location = item.location || 'Remote';
      const remote: Job['remote'] = location.toLowerCase().includes('remote') ? 'remote' : 'onsite';
      const company = item.company || config.defaultCompany || 'Unknown';

      const jobPartial = {
        title: item.title.slice(0, 100),
        company,
        description: item.description ?? '',
        responsibilities: [],
        requirements: [],
        skills: [],
        location,
        remote,
        jobType: 'full-time' as const,
        experienceLevel: 'mid' as const,
        industry: config.defaultIndustry ?? 'tech',
        applyUrl: item.link,
        postedAt,
        source: 'rss' as const,
        sourceId: `rss-${Buffer.from(item.link).toString('base64').slice(0, 16)}`,
        relevanceScore: 0,
        isNew,
      };

      const dedupeKey = generateDedupeKey(jobPartial as any);
      jobs.push({
        ...jobPartial,
        id: `rss-${dedupeKey}`,
        dedupeKey,
      } as Job);
    }

    return jobs;
  } catch (error) {
    console.error(`[RSS:${config.sourceName}] Fetch failed:`, error);
    return [];
  }
}

// Preset RSS feeds to monitor
export const PRESET_RSS_FEEDS: RSSFeedConfig[] = [
  // These are example feeds — add real career page RSS URLs here
  {
    url: 'https://github.blog/feed/',
    sourceName: 'GitHub Blog',
    defaultCompany: 'GitHub',
    defaultIndustry: 'tech',
  },
];
