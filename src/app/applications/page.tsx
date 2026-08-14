'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { KanbanSquare, Plus, Pencil, Trash2, ExternalLink, Clock, ChevronRight, GripVertical } from 'lucide-react';
import { ApplicationRecord, ApplicationStatus, Job } from '@/lib/types';
import { useToast } from '@/components/ToastProvider';
import { formatDistanceToNow } from 'date-fns';
import { springMomentum, useAppleMotion } from '@/lib/motion';

const COLUMNS: { status: ApplicationStatus; label: string; color: string; emoji: string }[] = [
  { status: 'bookmarked',   label: 'Bookmarked',   color: '#8E8E93', emoji: '🔖' },
  { status: 'applied',      label: 'Applied',      color: '#FF9F0A', emoji: '📨' },
  { status: 'interviewing', label: 'Interviewing', color: '#fbbf24', emoji: '🎯' },
  { status: 'offer',        label: 'Offer',        color: '#66D4CF', emoji: '🎉' },
  { status: 'rejected',     label: 'Rejected',     color: '#fb7185', emoji: '❌' },
];

interface AppWithJob extends ApplicationRecord {
  job?: Job;
}

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function KanbanCard({ app, onUpdate, onDelete }: {
  app: AppWithJob;
  onUpdate: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [showNoteEdit, setShowNoteEdit] = useState(false);
  const [note, setNote] = useState(app.notes);
  const [dragging, setDragging] = useState(false);
  const { reduceMotion } = useAppleMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);

  async function saveNote() {
    await fetch(`/api/applications/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: note }),
    });
    setShowNoteEdit(false);
  }

  function clearDropHighlights() {
    document.querySelectorAll('.kanban-column-drop-target').forEach(el => {
      el.classList.remove('kanban-column-drop-target');
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion) return; // fall back to the <select> only
    e.preventDefault();
    x.stop();
    y.stop();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    let lastX = e.clientX;
    let lastY = e.clientY;
    let lastT = e.timeStamp;
    let velocityX = 0;
    let velocityY = 0;

    function onMove(ev: PointerEvent) {
      const dt = ev.timeStamp - lastT;
      if (dt > 0) {
        velocityX = ((ev.clientX - lastX) / dt) * 1000; // px/s
        velocityY = ((ev.clientY - lastY) / dt) * 1000;
      }
      lastX = ev.clientX;
      lastY = ev.clientY;
      lastT = ev.timeStamp;

      const card = cardRef.current;
      if (!card) return;
      const board = card.closest('.kanban-board') as HTMLElement | null;
      let dx = ev.clientX - startX;
      let dy = ev.clientY - startY;

      if (board) {
        const boardRect = board.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        // cardRect already includes this drag's prior transform (x.get()/y.get()),
        // so back that out to get the card's untransformed layout position.
        const originLeft = cardRect.left - x.get();
        const originTop = cardRect.top - y.get();
        const originRight = cardRect.right - x.get();
        const originBottom = cardRect.bottom - y.get();

        const minDx = boardRect.left - originRight;  // dx past this pushes the card fully left of the board
        const maxDx = boardRect.right - originLeft;  // dx past this pushes the card fully right of the board
        const minDy = boardRect.top - originBottom;
        const maxDy = boardRect.bottom - originTop;

        if (dx < minDx) dx = minDx + rubberband(dx - minDx, boardRect.width);
        if (dx > maxDx) dx = maxDx + rubberband(dx - maxDx, boardRect.width);
        if (dy < minDy) dy = minDy + rubberband(dy - minDy, boardRect.height);
        if (dy > maxDy) dy = maxDy + rubberband(dy - maxDy, boardRect.height);
      }

      x.set(dx);
      y.set(dy);

      clearDropHighlights();
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const column = target?.closest('[data-status]') as HTMLElement | null;
      column?.classList.add('kanban-column-drop-target');
    }

    function onUp(ev: PointerEvent) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      clearDropHighlights();
      setDragging(false);

      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const column = target?.closest('[data-status]') as HTMLElement | null;
      const newStatus = column?.dataset.status as ApplicationStatus | undefined;

      if (newStatus && newStatus !== app.status) {
        onUpdate(app.id, newStatus);
      }

      // `framer-motion`'s exported `Transition` type (used for the `transition` prop on
      // motion components, and by springMomentum's declared type) is a different, wider
      // shape than the per-value transition type `animate()` expects internally from
      // `motion-dom`. The values are still exactly springMomentum's (bounce 0.2, duration
      // 0.35) plus the release velocity — this cast only bridges the two library-internal
      // type shapes, it doesn't change behavior.
      animate(x, 0, { ...springMomentum, velocity: velocityX } as any);
      animate(y, 0, { ...springMomentum, velocity: velocityY } as any);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ x, y }}
      className={`kanban-card ${dragging ? 'kanban-card-dragging' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="kanban-card-handle"
          onPointerDown={handlePointerDown}
          title="Drag to change status"
        >
          <GripVertical size={14} />
        </div>
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
          aria-label="Change application status"
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
                    <div key={col.status} className="kanban-column" data-status={col.status}>
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
