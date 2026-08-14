'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ChevronLeft, ChevronRight, LayoutGrid, List, Loader2, X, ExternalLink, MapPin, Clock, DollarSign, Bookmark, CheckCircle, Building2 } from 'lucide-react';
import JobCard from '@/components/JobCard';
import FilterPanel from '@/components/FilterPanel';
import ScoreRing from '@/components/ScoreRing';
import SourceBadge from '@/components/SourceBadge';
import { Job, JobsQueryParams, PaginatedJobsResponse } from '@/lib/types';
import { useToast } from '@/components/ToastProvider';
import { formatDistanceToNow } from 'date-fns';
import { EXPERIENCE_LEVEL_LABELS } from '@/config/defaults';

const DEFAULT_PARAMS: JobsQueryParams = {
  sort: 'relevance',
  order: 'desc',
  page: 1,
  limit: 20,
};

function JobDetailDrawer({ job, onClose }: { job: Job; onClose: () => void }) {
  const { success } = useToast();

  async function handleApply(status: 'bookmarked' | 'applied') {
    await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, status }),
    });
    success(status === 'applied' ? 'Marked as applied!' : 'Bookmarked!');
  }

  const salaryStr = job.salary
    ? job.salary.min && job.salary.max
      ? `$${(job.salary.min / 1000).toFixed(0)}k – $${(job.salary.max / 1000).toFixed(0)}k / year`
      : `$${((job.salary.min ?? 0) / 1000).toFixed(0)}k+ / year`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex"
      onClick={onClose}
    >
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl h-full bg-[#0d1225] border-l border-white/8 overflow-y-auto flex flex-col"
      >
        {/* Drawer header */}
        <div className="sticky top-0 bg-[#0d1225]/95 backdrop-blur border-b border-white/5 p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              {job.companyLogo ? (
                <img src={job.companyLogo} alt={job.company} className="w-9 h-9 object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : <Building2 size={22} className="text-slate-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <SourceBadge source={job.source} />
                {job.isNew && <span className="badge badge-new text-[10px]">NEW</span>}
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">{job.title}</h2>
              <p className="text-sm text-slate-400 font-medium">{job.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing score={job.relevanceScore} size={52} />
            <button onClick={onClose} className="btn-ghost p-2">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Meta chips */}
        <div className="px-6 py-4 flex flex-wrap gap-2 border-b border-white/5">
          <span className={`badge badge-${job.remote}`}>
            {job.remote === 'remote' ? '🌐 Remote' : job.remote === 'hybrid' ? '🏢 Hybrid' : '📍 On-site'}
          </span>
          <span className="badge badge-skill flex items-center gap-1"><MapPin size={11} /> {job.location}</span>
          <span className="badge badge-skill capitalize">{EXPERIENCE_LEVEL_LABELS[job.experienceLevel]}</span>
          <span className="badge badge-skill capitalize">{job.jobType}</span>
          {salaryStr && <span className="badge badge-salary"><DollarSign size={10} /> {salaryStr}</span>}
          <span className="badge badge-skill flex items-center gap-1"><Clock size={11} /> {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}</span>
          {job.deadline && (
            <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              Deadline: {new Date(job.deadline).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="p-6 flex-1">
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">About the Role</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>

          {job.responsibilities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Key Responsibilities</h3>
              <ul className="space-y-2">
                {job.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.requirements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Requirements</h3>
              <ul className="space-y-2">
                {job.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 mt-1 flex-shrink-0">✓</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.skills.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map(s => (
                  <span key={s} className="badge badge-skill">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 bg-[#0d1225]/95 backdrop-blur border-t border-white/5 p-6 flex gap-3">
          <button onClick={() => handleApply('bookmarked')} className="btn-secondary flex-1 justify-center">
            <Bookmark size={15} /> Bookmark
          </button>
          <button onClick={() => handleApply('applied')} className="btn-secondary flex-1 justify-center text-emerald-400 border-emerald-500/30">
            <CheckCircle size={15} /> Mark Applied
          </button>
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 justify-center">
            Apply Now <ExternalLink size={14} />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function JobsPage() {
  const [data, setData] = useState<PaginatedJobsResponse | null>(null);
  const [params, setParams] = useState<JobsQueryParams>(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const { success } = useToast();

  const fetchJobs = useCallback(async (p: JobsQueryParams) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      Object.entries(p).forEach(([k, v]) => { if (v !== undefined && v !== null) qs.set(k, String(v)); });
      const res = await fetch(`/api/jobs?${qs}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(params); }, [params]);

  const updateParams = useCallback((updates: Partial<JobsQueryParams>) => {
    setParams(prev => ({ ...prev, ...updates }));
  }, []);

  const resetParams = useCallback(() => setParams(DEFAULT_PARAMS), []);

  function goPage(p: number) {
    setParams(prev => ({ ...prev, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="page-header pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Job Board</h1>
            <p className="text-sm text-slate-400 mt-1">
              {data ? `${data.total.toLocaleString()} jobs found` : 'Loading…'}
              {data?.lastRefreshed && (
                <span className="ml-2 text-slate-600">· Updated {formatDistanceToNow(new Date(data.lastRefreshed), { addSuffix: true })}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 flex gap-6">
        {/* Filter Panel */}
        <FilterPanel
          params={params}
          onChange={updateParams}
          onReset={resetParams}
          total={data?.total ?? 0}
        />

        {/* Jobs list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="jobs-list">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="glass-card-static h-48 skeleton" />
              ))}
            </div>
          ) : (
            <>
              <div className="jobs-list">
                {(data?.jobs ?? []).map((job, i) => (
                  <JobCard key={job.id} job={job} index={i} onSelect={setSelectedJob} />
                ))}
              </div>

              {data?.jobs.length === 0 && (
                <div className="glass-card-static p-16 text-center">
                  <Building2 size={40} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No jobs match your filters</p>
                  <button onClick={resetParams} className="btn-secondary mt-4">Clear filters</button>
                </div>
              )}

              {/* Pagination */}
              {(data?.totalPages ?? 0) > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => goPage((params.page ?? 1) - 1)}
                    disabled={(params.page ?? 1) <= 1}
                    className="btn-secondary px-3 py-2 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {[...Array(Math.min(data?.totalPages ?? 1, 7))].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => goPage(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                          (params.page ?? 1) === p
                            ? 'bg-indigo-600 text-white'
                            : 'btn-ghost'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goPage((params.page ?? 1) + 1)}
                    disabled={(params.page ?? 1) >= (data?.totalPages ?? 1)}
                    className="btn-secondary px-3 py-2 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Job detail drawer */}
      <AnimatePresence>
        {selectedJob && (
          <JobDetailDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
