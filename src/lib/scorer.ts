import { Job, ResumeProfile } from './types';

// ─── TF-IDF Relevance Scorer ──────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function termFrequency(term: string, tokens: string[]): number {
  const count = tokens.filter(t => t === term).length;
  return count / tokens.length;
}

function computeSkillOverlap(jobSkills: string[], profileSkills: string[]): number {
  const jobSet = new Set(jobSkills.map(s => s.toLowerCase()));
  const profileSet = new Set(profileSkills.map(s => s.toLowerCase()));
  let matches = 0;
  for (const skill of profileSet) {
    if (jobSet.has(skill)) matches++;
  }
  return profileSet.size > 0 ? matches / profileSet.size : 0;
}

function computeTitleMatch(jobTitle: string, profileTitles: string[]): number {
  const jobTokens = tokenize(jobTitle);
  let maxScore = 0;
  for (const title of profileTitles) {
    const titleTokens = tokenize(title);
    const overlap = jobTokens.filter(t => titleTokens.includes(t)).length;
    const score = overlap / Math.max(titleTokens.length, 1);
    maxScore = Math.max(maxScore, score);
  }
  return maxScore;
}

function computeRecencyBoost(postedAt: string): number {
  const ageMs = Date.now() - new Date(postedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < 6) return 25;
  if (ageHours < 24) return 20;
  if (ageHours < 48) return 15;
  if (ageHours < 72) return 10;
  if (ageHours < 168) return 5; // < 1 week
  return 0;
}

function computeLocationMatch(
  jobRemote: Job['remote'],
  jobLocation: string,
  profileRemote: ResumeProfile['preferredRemote'],
  profileLocations: string[],
): number {
  // Remote match
  if (profileRemote.includes(jobRemote)) return 1.0;
  // Location keyword match
  const jobLoc = jobLocation.toLowerCase();
  for (const loc of profileLocations) {
    if (jobLoc.includes(loc.toLowerCase()) || loc.toLowerCase() === 'remote') return 0.8;
  }
  return 0.2;
}

function computeSalaryMatch(
  jobSalary: Job['salary'],
  profileMin?: number,
  profileMax?: number,
): number {
  if (!jobSalary || !profileMin) return 0.5; // neutral if unknown
  const jobMin = jobSalary.min ?? 0;
  const jobMax = jobSalary.max ?? jobMin;
  if (jobMax >= profileMin) return 1.0;
  if (jobMin >= profileMin * 0.8) return 0.7;
  return 0.3;
}

function computeExperienceMatch(
  jobLevel: Job['experienceLevel'],
  profileLevel: ResumeProfile['experienceLevel'],
): number {
  const levels = ['intern', 'junior', 'mid', 'senior', 'lead', 'executive'];
  const jobIdx = levels.indexOf(jobLevel);
  const profileIdx = levels.indexOf(profileLevel);
  const diff = Math.abs(jobIdx - profileIdx);
  if (diff === 0) return 1.0;
  if (diff === 1) return 0.8;
  if (diff === 2) return 0.5;
  return 0.2;
}

function computeKeywordScore(job: Job, profile: ResumeProfile): number {
  const jobText = [
    job.title,
    job.description,
    ...job.skills,
    ...job.requirements,
    ...job.responsibilities,
  ].join(' ');
  const jobTokens = tokenize(jobText);
  const profileTokens = [
    ...profile.skills,
    ...profile.titles,
  ].flatMap(s => tokenize(s));

  const uniqueProfileTerms = [...new Set(profileTokens)];
  let score = 0;
  for (const term of uniqueProfileTerms) {
    const tf = termFrequency(term, jobTokens);
    score += tf;
  }
  return Math.min(1, score * 10); // Normalize to 0-1
}

export function scoreJob(job: Job, profile: ResumeProfile | null): number {
  if (!profile) return 50; // Default score when no profile

  const weights = {
    skillOverlap: 0.30,
    titleMatch: 0.20,
    recency: 0.15,
    location: 0.10,
    experience: 0.10,
    salary: 0.05,
    keyword: 0.10,
  };

  const skillScore = computeSkillOverlap(job.skills, profile.skills);
  const titleScore = computeTitleMatch(job.title, profile.titles);
  const recencyRaw = computeRecencyBoost(job.postedAt); // 0-25
  const recencyScore = recencyRaw / 25;
  const locationScore = computeLocationMatch(
    job.remote,
    job.location,
    profile.preferredRemote,
    profile.preferredLocations,
  );
  const experienceScore = computeExperienceMatch(job.experienceLevel, profile.experienceLevel);
  const salaryScore = computeSalaryMatch(job.salary, profile.targetSalaryMin, profile.targetSalaryMax);
  const keywordScore = computeKeywordScore(job, profile);

  const raw =
    skillScore * weights.skillOverlap +
    titleScore * weights.titleMatch +
    recencyScore * weights.recency +
    locationScore * weights.location +
    experienceScore * weights.experience +
    salaryScore * weights.salary +
    keywordScore * weights.keyword;

  return Math.round(Math.min(100, raw * 100));
}

export function scoreJobs(jobs: Job[], profile: ResumeProfile | null): Job[] {
  return jobs.map(job => ({
    ...job,
    relevanceScore: scoreJob(job, profile),
  }));
}
