'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { JobsQueryParams, RemoteType, ExperienceLevel, Industry, JobType, JobSource } from '@/lib/types';
import { EXPERIENCE_LEVEL_LABELS, INDUSTRY_LABELS, SOURCE_LABELS } from '@/config/defaults';

interface FilterPanelProps {
  params: JobsQueryParams;
  onChange: (params: Partial<JobsQueryParams>) => void;
  onReset: () => void;
  total: number;
}

function FilterSection({ title, children, defaultOpen = true }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5 pb-4 mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full mb-3"
      >
        <span className="label-text mb-0">{title}</span>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FilterPanel({ params, onChange, onReset, total }: FilterPanelProps) {
  const remoteOptions: { value: RemoteType; label: string; emoji: string }[] = [
    { value: 'remote',  label: 'Remote',  emoji: '🌐' },
    { value: 'hybrid',  label: 'Hybrid',  emoji: '🏢' },
    { value: 'onsite',  label: 'On-site', emoji: '📍' },
  ];

  const levelOptions = Object.entries(EXPERIENCE_LEVEL_LABELS) as [ExperienceLevel, string][];
  const industryOptions = Object.entries(INDUSTRY_LABELS) as [Industry, string][];
  const sourceOptions = Object.entries(SOURCE_LABELS) as [JobSource, string][];

  const jobTypeOptions: { value: JobType; label: string }[] = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract',  label: 'Contract' },
    { value: 'internship',label: 'Internship' },
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Best Match' },
    { value: 'date',      label: 'Most Recent' },
    { value: 'salary',    label: 'Highest Salary' },
    { value: 'company',   label: 'Company A–Z' },
  ];

  const hasFilters = !!(params.q || params.location || params.remote || params.level ||
    params.industry || params.source || params.minSalary || params.jobType || params.isNew);

  return (
    <div className="filter-panel">
      <div className="glass-card-static p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-indigo-400" />
            <span className="text-sm font-semibold text-white">Filters</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{total} jobs</span>
            {hasFilters && (
              <button onClick={onReset} className="btn-ghost text-xs px-2 py-1 text-rose-400">
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search jobs, skills, companies…"
            value={params.q ?? ''}
            onChange={e => onChange({ q: e.target.value || undefined, page: 1 })}
            className="input-field pl-9"
          />
        </div>

        {/* Sort */}
        <FilterSection title="Sort By">
          <select
            value={params.sort ?? 'relevance'}
            onChange={e => onChange({ sort: e.target.value as any })}
            className="select-field"
          >
            {sortOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterSection>

        {/* New only toggle */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5">
          <span className="text-sm text-slate-300 font-medium">New Jobs Only</span>
          <button
            onClick={() => onChange({ isNew: params.isNew ? undefined : true, page: 1 })}
            className={`relative w-10 h-5 rounded-full transition-colors ${params.isNew ? 'bg-indigo-500' : 'bg-white/10'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${params.isNew ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Remote type */}
        <FilterSection title="Work Type">
          <div className="space-y-1">
            {remoteOptions.map(({ value, label, emoji }) => (
              <label key={value} className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={params.remote === value}
                  onChange={() => onChange({ remote: params.remote === value ? undefined : value, page: 1 })}
                />
                {emoji} {label}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Experience Level */}
        <FilterSection title="Experience Level">
          <div className="space-y-1">
            {levelOptions.map(([value, label]) => (
              <label key={value} className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={params.level === value}
                  onChange={() => onChange({ level: params.level === value ? undefined : value, page: 1 })}
                />
                {label}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Industry */}
        <FilterSection title="Industry" defaultOpen={false}>
          <div className="space-y-1">
            {industryOptions.map(([value, label]) => (
              <label key={value} className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={params.industry === value}
                  onChange={() => onChange({ industry: params.industry === value ? undefined : value, page: 1 })}
                />
                {label}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Job Type */}
        <FilterSection title="Job Type" defaultOpen={false}>
          <div className="space-y-1">
            {jobTypeOptions.map(({ value, label }) => (
              <label key={value} className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={params.jobType === value}
                  onChange={() => onChange({ jobType: params.jobType === value ? undefined : value, page: 1 })}
                />
                {label}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Salary */}
        <FilterSection title="Min Salary" defaultOpen={false}>
          <input
            type="range"
            min={0}
            max={200000}
            step={10000}
            value={params.minSalary ?? 0}
            onChange={e => onChange({ minSalary: Number(e.target.value) || undefined, page: 1 })}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Any</span>
            <span className="text-indigo-400 font-medium">
              {params.minSalary ? `$${(params.minSalary / 1000).toFixed(0)}k+` : 'Any'}
            </span>
          </div>
        </FilterSection>

        {/* Source */}
        <FilterSection title="Source" defaultOpen={false}>
          <div className="space-y-1">
            {sourceOptions.filter(([v]) => v !== 'custom').map(([value, label]) => (
              <label key={value} className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={params.source === value}
                  onChange={() => onChange({ source: params.source === value ? undefined : value as JobSource, page: 1 })}
                />
                {label}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Location */}
        <FilterSection title="Location" defaultOpen={false}>
          <input
            type="text"
            placeholder="e.g. San Francisco, London…"
            value={params.location ?? ''}
            onChange={e => onChange({ location: e.target.value || undefined, page: 1 })}
            className="input-field"
          />
        </FilterSection>
      </div>
    </div>
  );
}
