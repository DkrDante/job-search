// ─── Core Job Types ───────────────────────────────────────────────────────────

export type ExperienceLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
export type JobType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
export type RemoteType = 'remote' | 'hybrid' | 'onsite';
export type JobSource =
  | 'remotive'
  | 'adzuna'
  | 'hn-hiring'
  | 'remoteok'
  | 'arbeitnow'
  | 'themuse'
  | 'jobicy'
  | 'rss'
  | 'custom';
export type ApplicationStatus = 'bookmarked' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn';
export type Industry =
  | 'tech'
  | 'finance'
  | 'healthcare'
  | 'education'
  | 'marketing'
  | 'design'
  | 'data'
  | 'devops'
  | 'product'
  | 'sales'
  | 'other';

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;
  period: 'hourly' | 'monthly' | 'annual';
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  location: string;
  remote: RemoteType;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  industry: Industry;
  salary?: SalaryRange;
  applyUrl: string;
  deadline?: string;
  postedAt: string;
  source: JobSource;
  sourceId?: string;
  relevanceScore: number;
  isNew: boolean;
  viewedAt?: string;
  dedupeKey: string;
}

// ─── Application Tracking ─────────────────────────────────────────────────────

export interface ApplicationRecord {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  notes: string;
  appliedAt?: string;
  updatedAt: string;
  createdAt: string;
  interviewDate?: string;
  offerAmount?: number;
  rejectionReason?: string;
}

// ─── Alert Configuration ──────────────────────────────────────────────────────

export type AlertFrequency = '15min' | '30min' | '1hour' | '6hours' | '12hours' | 'daily';

export interface AlertConfig {
  id: string;
  name: string;
  keywords: string[];
  excludeKeywords: string[];
  locations: string[];
  remote: RemoteType[];
  experienceLevels: ExperienceLevel[];
  industries: Industry[];
  minSalary?: number;
  maxSalary?: number;
  sources: JobSource[];
  frequency: AlertFrequency;
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
}

// ─── User Profile ──────────────────────────────────────────────────────────────

export interface ResumeProfile {
  skills: string[];
  titles: string[];
  experienceYears: number;
  experienceLevel: ExperienceLevel;
  preferredLocations: string[];
  preferredRemote: RemoteType[];
  preferredIndustries: Industry[];
  preferredJobTypes: JobType[];
  targetSalaryMin?: number;
  targetSalaryMax?: number;
  resumeText?: string;
  updatedAt: string;
}

// ─── Scan History ──────────────────────────────────────────────────────────────

export interface ScanRecord {
  id: string;
  timestamp: string;
  source: JobSource;
  jobsFound: number;
  newJobs: number;
  duration: number;
  error?: string;
}

// ─── API Types ─────────────────────────────────────────────────────────────────

export interface JobsQueryParams {
  q?: string;
  location?: string;
  remote?: RemoteType;
  level?: ExperienceLevel;
  industry?: Industry;
  source?: JobSource;
  minSalary?: number;
  jobType?: JobType;
  sort?: 'relevance' | 'date' | 'salary' | 'company';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  isNew?: boolean;
}

export interface PaginatedJobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  lastRefreshed: string | null;
}

export interface DashboardStats {
  totalJobs: number;
  newToday: number;
  applied: number;
  interviewing: number;
  matchRate: number;
  topSkills: { skill: string; count: number }[];
  jobsBySource: { source: string; count: number }[];
  jobsByIndustry: { industry: string; count: number }[];
  applicationFunnel: { status: ApplicationStatus; count: number }[];
  recentHighScoreJobs: Job[];
}
