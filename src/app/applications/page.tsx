'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KanbanSquare, Plus, Pencil, Trash2, ExternalLink, Clock, ChevronRight } from 'lucide-react';
import { ApplicationRecord, ApplicationStatus, Job } from '@/lib/types';
import { useToast } from '@/components/ToastProvider';
import { formatDistanceToNow } from 'date-fns';

const COLUMNS: { status: ApplicationStatus; label: string; color: string; emoji: string }[] = [
  { status: 'bookmarked',   label: 'Bookmarked',   color: '#818cf8', emoji: '🔖' },
  { status: 'applied',      label: 'Applied',      color: '#22d3ee', emoji: '📨' },
  { status: 'interviewing', label: 'Interviewing', color: '#fbbf24', emoji: '🎯' },
  { status: 'offer',        label: 'Offer',        color: '#34d399', emoji: '🎉' },
  { status: 'rejected',     label: 'Rejected',     color: '#fb7185', emoji: '❌' },
];

interface AppWithJob extends ApplicationRecord {
  job?: Job;
}

function KanbanCard({ app, onUpdate, onDelete }: {
  app: AppWithJob;
  onUpdate: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [showNoteEdit, setShowNoteEdit] = useState(false);
  const [note, setNote] = useState(app.notes);

  async function saveNote() {
    await fetch(`/api/applications/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: note }),
    });
    setShowNoteEdit(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="kanban-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{app.job?.title ?? 'Unknown Role'}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{app.job?.company ?? '—'}</p>
        </div>
        <button
          onClick={() => onDelete(app.id)}
          className="btn-ghost p-1 text-slate-600 hover:text-rose-400 flex-shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {app.appliedAt && (
        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
          <Clock size={10} /> Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
        </p>
      )}

      {showNoteEdit ? (
        <div className="mt-3">
          <textarea
            className="input-field text-xs resize-none h-16"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add notes…"
          />
          <div className="flex gap-2 mt-1">
            <button onClick={saveNote} className="btn-primary text-xs py-1 px-3">Save</button>
            <button onClick={() => setShowNoteEdit(false)} className="btn-ghost text-xs py-1 px-2">Cancel</button>
          </div>
        </div>
      ) : (
        app.notes && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{app.notes}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <button onClick={() => setShowNoteEdit(v => !v)} className="btn-ghost text-xs p-1 text-slate-600">
          <Pencil size={11} />
        </button>
        {app.job?.applyUrl && (
          <a href={app.job.applyUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs p-1 text-indigo-400">
            <ExternalLink size={11} />
          </a>
        )}
        <select
          value={app.status}
          onChange={e => onUpdate(app.id, e.target.value as ApplicationStatus)}
          className="text-xs bg-transparent border border-white/10 rounded px-1 py-0.5 text-slate-400 cursor-pointer"
        >
          {COLUMNS.map(c => (
            <option key={c.status} value={c.status}>{c.label}</option>
          ))}
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>
    </motion.div>
  );
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppWithJob[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const [appsRes, jobsRes] = await Promise.all([
        fetch('/api/applications'),
        fetch('/api/jobs?limit=2000'),
      ]);
      const appsData: ApplicationRecord[] = await appsRes.json();
      const jobsData = await jobsRes.json();
      const jobMap = new Map<string, Job>((jobsData.jobs ?? []).map((j: Job) => [j.id, j]));
      setApps(appsData.map(a => ({ ...a, job: jobMap.get(a.jobId) })));
      setJobs(jobsData.jobs ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function updateStatus(id: string, status: ApplicationStatus) {
    await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    success('Status updated!');
  }

  async function deleteApp(id: string) {
    await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    setApps(prev => prev.filter(a => a.id !== id));
    success('Application removed');
  }

  const totalByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.status] = apps.filter(a => a.status === col.status).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen">
      <div className="page-header pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Applications</h1>
            <p className="text-sm text-slate-400 mt-1">
              {apps.length} tracked · {totalByStatus['interviewing'] ?? 0} interviewing · {totalByStatus['offer'] ?? 0} offers
            </p>
          </div>
          <div className="flex items-center gap-2">
            {COLUMNS.map(col => (
              <div key={col.status} className="text-center px-3">
                <div className="text-lg font-bold" style={{ color: col.color }}>{totalByStatus[col.status] ?? 0}</div>
                <div className="text-xs text-slate-600">{col.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="kanban-board">
            {COLUMNS.map(col => (
              <div key={col.status} className="kanban-column skeleton" style={{ height: 300 }} />
            ))}
          </div>
        ) : (
          <>
            {apps.length === 0 ? (
              <div className="glass-card-static p-16 text-center max-w-md mx-auto">
                <KanbanSquare size={40} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">No applications yet</h3>
                <p className="text-slate-500 text-sm mb-4">Browse jobs and bookmark or apply to start tracking</p>
                <a href="/jobs" className="btn-primary inline-flex">
                  Browse Jobs <ChevronRight size={15} />
                </a>
              </div>
            ) : (
              <div className="kanban-board">
                {COLUMNS.map(col => {
                  const colApps = apps.filter(a => a.status === col.status);
                  return (
                    <div key={col.status} className="kanban-column">
                      <div className="flex items-center gap-2 mb-4">
                        <span>{col.emoji}</span>
                        <span className="text-sm font-semibold" style={{ color: col.color }}>{col.label}</span>
                        <span className="ml-auto text-xs text-slate-600 bg-white/5 rounded-full px-2 py-0.5">
                          {colApps.length}
                        </span>
                      </div>
                      <AnimatePresence>
                        {colApps.map(app => (
                          <KanbanCard
                            key={app.id}
                            app={app}
                            onUpdate={updateStatus}
                            onDelete={deleteApp}
                          />
                        ))}
                      </AnimatePresence>
                      {colApps.length === 0 && (
                        <div className="text-center py-8 text-slate-700 text-xs border border-dashed border-white/5 rounded-lg">
                          No applications
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
