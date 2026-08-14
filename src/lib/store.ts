import fs from 'fs';
import path from 'path';
import { Job, ApplicationRecord, AlertConfig, ResumeProfile, StoreData, ScanRecord } from './types';
import { DEFAULT_PROFILE } from '../config/defaults';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDefaultStore(): StoreData {
  return {
    jobs: [],
    applications: [],
    alerts: [
      {
        id: 'default-alert',
        name: 'Software Engineer Roles',
        keywords: ['software engineer', 'developer', 'engineer', 'programmer'],
        excludeKeywords: ['10+ years', 'COBOL'],
        locations: ['Remote', 'San Francisco', 'New York', 'London'],
        remote: ['remote', 'hybrid'],
        experienceLevels: ['junior', 'mid', 'senior'],
        industries: ['tech', 'data', 'devops'],
        sources: ['remotive', 'remoteok', 'arbeitnow', 'themuse', 'jobicy', 'hn-hiring'],
        frequency: '30min',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ],
    profile: DEFAULT_PROFILE,
    lastRefreshed: null,
    scanHistory: [],
  };
}

export function readStore(): StoreData {
  ensureDataDir();
  try {
    if (!fs.existsSync(STORE_FILE)) {
      const defaultStore = getDefaultStore();
      writeStore(defaultStore);
      return defaultStore;
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(raw) as StoreData;
  } catch {
    const defaultStore = getDefaultStore();
    writeStore(defaultStore);
    return defaultStore;
  }
}

export function writeStore(data: StoreData): void {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Jobs ──────────────────────────────────────────────────────────────────────

export function getJobs(): Job[] {
  return readStore().jobs;
}

export function saveJobs(jobs: Job[]): void {
  const store = readStore();
  store.jobs = jobs;
  store.lastRefreshed = new Date().toISOString();
  writeStore(store);
}

export function upsertJobs(newJobs: Job[]): { added: number; updated: number } {
  const store = readStore();
  const existing = new Map(store.jobs.map(j => [j.dedupeKey, j]));
  let added = 0;
  let updated = 0;

  for (const job of newJobs) {
    if (existing.has(job.dedupeKey)) {
      const old = existing.get(job.dedupeKey)!;
      existing.set(job.dedupeKey, { ...old, ...job, isNew: false, id: old.id });
      updated++;
    } else {
      existing.set(job.dedupeKey, { ...job, isNew: true });
      added++;
    }
  }

  store.jobs = Array.from(existing.values())
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, 2000);
  store.lastRefreshed = new Date().toISOString();
  writeStore(store);
  return { added, updated };
}

export function markJobViewed(jobId: string): void {
  const store = readStore();
  const job = store.jobs.find(j => j.id === jobId);
  if (job) {
    job.viewedAt = new Date().toISOString();
    job.isNew = false;
    writeStore(store);
  }
}

// ─── Applications ─────────────────────────────────────────────────────────────

export function getApplications(): ApplicationRecord[] {
  return readStore().applications;
}

export function saveApplication(app: ApplicationRecord): void {
  const store = readStore();
  const idx = store.applications.findIndex(a => a.id === app.id);
  if (idx >= 0) {
    store.applications[idx] = app;
  } else {
    store.applications.unshift(app);
  }
  writeStore(store);
}

export function deleteApplication(id: string): void {
  const store = readStore();
  store.applications = store.applications.filter(a => a.id !== id);
  writeStore(store);
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export function getAlerts(): AlertConfig[] {
  return readStore().alerts;
}

export function saveAlert(alert: AlertConfig): void {
  const store = readStore();
  const idx = store.alerts.findIndex(a => a.id === alert.id);
  if (idx >= 0) {
    store.alerts[idx] = alert;
  } else {
    store.alerts.push(alert);
  }
  writeStore(store);
}

export function deleteAlert(id: string): void {
  const store = readStore();
  store.alerts = store.alerts.filter(a => a.id !== id);
  writeStore(store);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export function getProfile(): ResumeProfile | null {
  return readStore().profile;
}

export function saveProfile(profile: ResumeProfile): void {
  const store = readStore();
  store.profile = profile;
  writeStore(store);
}

// ─── Scan History ─────────────────────────────────────────────────────────────

export function addScanRecord(record: ScanRecord): void {
  const store = readStore();
  store.scanHistory.unshift(record);
  store.scanHistory = store.scanHistory.slice(0, 100);
  writeStore(store);
}

export function getLastRefreshed(): string | null {
  return readStore().lastRefreshed;
}
