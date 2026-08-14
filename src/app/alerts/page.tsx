'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Clock, Zap, Edit2, X, Check } from 'lucide-react';
import { AlertConfig, AlertFrequency } from '@/lib/types';
import { INDUSTRY_LABELS, EXPERIENCE_LEVEL_LABELS } from '@/config/defaults';
import { useToast } from '@/components/ToastProvider';

const FREQ_LABELS: Record<AlertFrequency, string> = {
  '15min': 'Every 15 minutes',
  '30min': 'Every 30 minutes',
  '1hour': 'Every hour',
  '6hours': 'Every 6 hours',
  '12hours': 'Every 12 hours',
  'daily': 'Daily',
};

function AlertCard({ alert, onToggle, onDelete }: {
  alert: AlertConfig;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`glass-card p-5 ${!alert.isActive ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">{alert.name}</h3>
            {alert.isActive && (
              <span className="badge badge-new text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Clock size={11} /> {FREQ_LABELS[alert.frequency]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(alert.id, !alert.isActive)}
            className="btn-ghost p-2"
            title={alert.isActive ? 'Disable' : 'Enable'}
          >
            {alert.isActive
              ? <ToggleRight size={20} className="text-indigo-400" />
              : <ToggleLeft size={20} className="text-slate-600" />}
          </button>
          <button onClick={() => onDelete(alert.id)} className="btn-ghost p-2 text-slate-600 hover:text-rose-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {alert.keywords.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {alert.keywords.map(k => (
                <span key={k} className="badge badge-skill">{k}</span>
              ))}
            </div>
          </div>
        )}
        {alert.locations.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Locations</p>
            <div className="flex flex-wrap gap-1.5">
              {alert.locations.map(l => (
                <span key={l} className="badge badge-remote">{l}</span>
              ))}
            </div>
          </div>
        )}
        {alert.industries.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Industries</p>
            <div className="flex flex-wrap gap-1.5">
              {alert.industries.map(ind => (
                <span key={ind} className="badge badge-skill capitalize">
                  {INDUSTRY_LABELS[ind as keyof typeof INDUSTRY_LABELS] ?? ind}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CreateAlertModal({ onClose, onCreate }: { onClose: () => void; onCreate: (a: Partial<AlertConfig>) => void }) {
  const [form, setForm] = useState({
    name: '',
    keywords: '',
    excludeKeywords: '',
    locations: '',
    frequency: '30min' as AlertFrequency,
    remote: [] as string[],
    industries: [] as string[],
    experienceLevels: [] as string[],
  });

  function handleSubmit() {
    onCreate({
      name: form.name || 'My Alert',
      keywords: form.keywords.split(',').map(s => s.trim()).filter(Boolean),
      excludeKeywords: form.excludeKeywords.split(',').map(s => s.trim()).filter(Boolean),
      locations: form.locations.split(',').map(s => s.trim()).filter(Boolean),
      frequency: form.frequency,
      remote: form.remote as any,
      industries: form.industries as any,
      experienceLevels: form.experienceLevels as any,
      isActive: true,
      sources: ['remotive', 'remoteok', 'arbeitnow', 'themuse', 'jobicy', 'hn-hiring'],
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="relative glass-card-static w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Create Alert</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-text">Alert Name</label>
            <input className="input-field" placeholder="e.g. Senior React Jobs"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label-text">Keywords (comma-separated)</label>
            <input className="input-field" placeholder="e.g. react, typescript, senior"
              value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} />
          </div>
          <div>
            <label className="label-text">Exclude Keywords</label>
            <input className="input-field" placeholder="e.g. 10+ years, php, wordpress"
              value={form.excludeKeywords} onChange={e => setForm(f => ({ ...f, excludeKeywords: e.target.value }))} />
          </div>
          <div>
            <label className="label-text">Locations (comma-separated)</label>
            <input className="input-field" placeholder="e.g. Remote, San Francisco, London"
              value={form.locations} onChange={e => setForm(f => ({ ...f, locations: e.target.value }))} />
          </div>
          <div>
            <label className="label-text">Scan Frequency</label>
            <select className="select-field" value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value as AlertFrequency }))}>
              {Object.entries(FREQ_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Work Type</label>
            <div className="flex gap-2 flex-wrap">
              {['remote', 'hybrid', 'onsite'].map(v => (
                <label key={v} className="custom-checkbox">
                  <input type="checkbox" checked={form.remote.includes(v)}
                    onChange={e => setForm(f => ({
                      ...f,
                      remote: e.target.checked ? [...f.remote, v] : f.remote.filter(x => x !== v),
                    }))} />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label-text">Industries</label>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(INDUSTRY_LABELS).map(([v, l]) => (
                <label key={v} className="custom-checkbox text-xs">
                  <input type="checkbox" checked={form.industries.includes(v)}
                    onChange={e => setForm(f => ({
                      ...f,
                      industries: e.target.checked ? [...f.industries, v] : f.industries.filter(x => x !== v),
                    }))} />
                  {l}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary flex-1 justify-center">
            <Bell size={14} /> Create Alert
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { success, error } = useToast();

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts');
      setAlerts(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAlerts(); }, []);

  async function toggleAlert(id: string, isActive: boolean) {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    const updated = { ...alert, isActive };
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    setAlerts(prev => prev.map(a => a.id === id ? updated : a));
    success(isActive ? 'Alert activated' : 'Alert paused');
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
    setAlerts(prev => prev.filter(a => a.id !== id));
    success('Alert deleted');
  }

  async function createAlert(data: Partial<AlertConfig>) {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const newAlert = await res.json();
    setAlerts(prev => [...prev, newAlert]);
    setShowCreate(false);
    success('Alert created! You\'ll be notified when matching jobs appear.', 'Alert Active');
  }

  const activeCount = alerts.filter(a => a.isActive).length;

  return (
    <div className="min-h-screen">
      <div className="page-header pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Job Alerts</h1>
            <p className="text-sm text-slate-400 mt-1">
              {activeCount} active alert{activeCount !== 1 ? 's' : ''} · {alerts.length} total
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={15} /> New Alert
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Info banner */}
        <div className="glass-card-static p-4 mb-6 flex items-start gap-3 border-indigo-500/20 bg-indigo-500/5">
          <Zap size={18} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">Automated Scanning</p>
            <p className="text-xs text-slate-400 mt-0.5">
              The system automatically scans configured sources at the specified intervals. 
              You'll receive in-app toast notifications when matching positions are found.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="glass-card-static h-48 skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {alerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onToggle={toggleAlert}
                  onDelete={deleteAlert}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="glass-card-static p-16 text-center max-w-md mx-auto">
            <Bell size={40} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No alerts yet</h3>
            <p className="text-slate-500 text-sm mb-4">Create an alert to get notified when matching jobs appear</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={14} /> Create Your First Alert
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateAlertModal onClose={() => setShowCreate(false)} onCreate={createAlert} />
        )}
      </AnimatePresence>
    </div>
  );
}
