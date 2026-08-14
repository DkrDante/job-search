// ─── Default Configuration ────────────────────────────────────────────────────

import { AlertConfig, ResumeProfile } from '../lib/types';

export const DEFAULT_SCAN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
export const DEFAULT_SCAN_CRON = '*/30 * * * *';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_JOBS_STORED = 2000;

export const EXPERIENCE_LEVEL_LABELS = {
  intern: 'Intern',
  junior: 'Junior (0–2 yrs)',
  mid: 'Mid-level (2–5 yrs)',
  senior: 'Senior (5–8 yrs)',
  lead: 'Lead / Staff (8+ yrs)',
  executive: 'Executive / Director',
};

export const INDUSTRY_LABELS = {
  tech: 'Software & Tech',
  finance: 'Finance & Fintech',
  healthcare: 'Healthcare',
  education: 'Education',
  marketing: 'Marketing',
  design: 'Design & Creative',
  data: 'Data & Analytics',
  devops: 'DevOps & Cloud',
  product: 'Product Management',
  sales: 'Sales & Business Dev',
  other: 'Other',
};

export const SOURCE_LABELS: Record<string, string> = {
  remotive:   'Remotive',
  adzuna:     'Adzuna',
  'hn-hiring':'HN Who\'s Hiring',
  remoteok:   'Remote OK',
  arbeitnow:  'Arbeitnow',
  themuse:    'The Muse',
  jobicy:     'Jobicy',
  rss:        'RSS Feed',
  custom:     'Custom Source',
};

export const SOURCE_COLORS: Record<string, string> = {
  remotive:   '#10b981',
  adzuna:     '#6366f1',
  'hn-hiring':'#f59e0b',
  remoteok:   '#06b6d4',
  arbeitnow:  '#8b5cf6',
  themuse:    '#ec4899',
  jobicy:     '#f43f5e',
  rss:        '#64748b',
  custom:     '#94a3b8',
};

export const DEFAULT_ALERT: Omit<AlertConfig, 'id' | 'createdAt'> = {
  name: 'My Job Alert',
  keywords: ['software engineer', 'developer', 'engineer'],
  excludeKeywords: ['10+ years', 'PHP', 'COBOL'],
  locations: ['Remote', 'San Francisco', 'New York'],
  remote: ['remote', 'hybrid'],
  experienceLevels: ['mid', 'senior'],
  industries: ['tech', 'data', 'devops'],
  sources: ['remotive', 'remoteok', 'arbeitnow', 'themuse', 'jobicy', 'hn-hiring'],
  frequency: '30min',
  isActive: true,
};

export const DEFAULT_PROFILE: ResumeProfile = {
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Git'],
  titles: ['Software Engineer', 'Frontend Developer', 'Full Stack Developer'],
  experienceYears: 3,
  experienceLevel: 'mid',
  preferredLocations: ['Remote', 'San Francisco'],
  preferredRemote: ['remote', 'hybrid'],
  preferredIndustries: ['tech', 'data', 'fintech' as any],
  preferredJobTypes: ['full-time'],
  targetSalaryMin: 100000,
  targetSalaryMax: 160000,
  updatedAt: new Date().toISOString(),
};

export const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
  'React', 'Vue', 'Angular', 'Next.js', 'Svelte', 'Node.js', 'Express',
  'FastAPI', 'Django', 'Spring Boot', 'GraphQL', 'REST API',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
  'Machine Learning', 'TensorFlow', 'PyTorch', 'LLMs', 'RAG',
  'Figma', 'UI/UX', 'Design Systems', 'Tailwind CSS',
  'Git', 'CI/CD', 'Agile', 'Scrum', 'System Design', 'Microservices',
];
