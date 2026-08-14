'use client';

import { Job } from '@/lib/types';
import { motion } from 'framer-motion';
import {
  MapPin, Clock, DollarSign, ExternalLink, Bookmark, CheckCircle,
  Building2, Star, Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ScoreRing from './ScoreRing';
import SourceBadge from './SourceBadge';
import { useState } from 'react';
import { useToast } from './ToastProvider';
import { getScoreColor } from '@/lib/scoreColor';

interface JobCardProps {
  job: Job;
  onSelect?: (job: Job) => void;
  index?: number;
}

function formatSalary(salary: Job['salary']): string | null {
  if (!salary) return null;
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if (salary.min && salary.max) return `${fmt(salary.min)} – ${fmt(salary.max)}`;
  if (salary.min) return `${fmt(salary.min)}+`;
  return null;
}

export default function JobCard({ job, onSelect, index = 0 }: JobCardProps) {
  const { success, info } = useToast();
  const [bookmarked, setBookmarked] = useState(false);
  const [applying, setApplying] = useState(false);

  const salaryStr = formatSalary(job.salary);
  const postedAgo = formatDistanceToNow(new Date(job.postedAt), { addSuffix: true });

  const scoreColor = getScoreColor(job.relevanceScore);

  async function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    setBookmarked(v => !v);
    if (!bookmarked) {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, status: 'bookmarked' }),
      });
      success(`Bookmarked ${job.title} at ${job.company}`, 'Saved!');
    } else {
      info('Bookmark removed');
    }
  }

  async function handleQuickApply(e: React.MouseEvent) {
    e.stopPropagation();
    setApplying(true);
    await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, status: 'applied' }),
    });
    success(`Marked as applied to ${job.company}`, 'Application Tracked!');
    setApplying(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={() => onSelect?.(job)}
      className="glass-card job-card group"
    >
      {job.isNew && <div className="job-card-new-indicator" />}

      <div className="flex items-start gap-4">
        {/* Company Logo */}
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {job.companyLogo ? (
            <img
              src={job.companyLogo}
              alt={job.company}
              className="w-8 h-8 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Building2 size={20} className="text-slate-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {job.isNew && (
                  <span className="badge badge-new text-[10px]">
                    <Zap size={9} /> NEW
                  </span>
                )}
                <SourceBadge source={job.source} />
              </div>
              <h3 className="text-sm font-semibold text-white leading-tight truncate group-hover:text-indigo-300 transition-colors">
                {job.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{job.company}</p>
            </div>
            <ScoreRing score={job.relevanceScore} size={44} color={scoreColor} />
          </div>

          {/* Meta row */}
          <div className="flex items-center flex-wrap gap-3 mt-3">
            <span className={`badge badge-${job.remote}`}>
              {job.remote === 'remote' ? '🌐 Remote' : job.remote === 'hybrid' ? '🏢 Hybrid' : '📍 On-site'}
            </span>
            {salaryStr && (
              <span className="badge badge-salary">
                <DollarSign size={10} /> {salaryStr}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={11} /> {job.location}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={11} /> {postedAgo}
            </span>
          </div>

          {/* Skills */}
          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.skills.slice(0, 5).map(skill => (
                <span key={skill} className="badge badge-skill">{skill}</span>
              ))}
              {job.skills.length > 5 && (
                <span className="badge badge-skill text-slate-600">+{job.skills.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 capitalize">
            {job.experienceLevel} · {job.jobType}
          </span>
          {job.deadline && (
            <span className="text-xs text-amber-500">
              Deadline: {new Date(job.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleBookmark}
            className={`btn-ghost text-xs px-2 py-1.5 ${bookmarked ? 'text-indigo-400' : ''}`}
            title="Bookmark"
          >
            <Bookmark size={13} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleQuickApply}
            disabled={applying}
            className="btn-ghost text-xs px-2 py-1.5 text-emerald-400"
            title="Mark as Applied"
          >
            <CheckCircle size={13} />
          </button>
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="btn-primary text-xs px-3 py-1.5"
          >
            Apply <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
