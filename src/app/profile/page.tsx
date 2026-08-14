'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Upload, Plus, X, Check, Save, Brain,
  Code, MapPin, DollarSign, Briefcase, Loader2,
} from 'lucide-react';
import { ResumeProfile } from '@/lib/types';
import { COMMON_SKILLS, EXPERIENCE_LEVEL_LABELS, INDUSTRY_LABELS, DEFAULT_PROFILE } from '@/config/defaults';
import { useToast } from '@/components/ToastProvider';

export default function ProfilePage() {
  const [profile, setProfile] = useState<ResumeProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error, info } = useToast();

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(p => { if (p) setProfile(p); })
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      success('Profile saved! Jobs are being re-scored based on your profile.', 'Profile Updated');
    } catch {
      error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await fetch('/api/profile/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        success(
          `Extracted ${data.extracted.skills.length} skills, ${data.extracted.titles.length} roles — ${data.extracted.wordCount} words processed`,
          'Resume Parsed!'
        );
      }
    } catch {
      error('Failed to parse resume');
    } finally {
      setUploading(false);
    }
  }

  function addSkill() {
    const s = newSkill.trim();
    if (s && !profile.skills.includes(s)) {
      setProfile(p => ({ ...p, skills: [...p.skills, s] }));
      setNewSkill('');
    }
  }

  function removeSkill(skill: string) {
    setProfile(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }));
  }

  function addTitle() {
    const t = newTitle.trim();
    if (t && !profile.titles.includes(t)) {
      setProfile(p => ({ ...p, titles: [...p.titles, t] }));
      setNewTitle('');
    }
  }

  function toggleRemote(value: string) {
    const current = profile.preferredRemote as string[];
    setProfile(p => ({
      ...p,
      preferredRemote: current.includes(value)
        ? current.filter(v => v !== value) as any
        : [...current, value] as any,
    }));
  }

  function toggleIndustry(value: string) {
    const current = profile.preferredIndustries as string[];
    setProfile(p => ({
      ...p,
      preferredIndustries: current.includes(value)
        ? current.filter(v => v !== value) as any
        : [...current, value] as any,
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="page-header pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <p className="text-sm text-slate-400 mt-1">
              Your profile powers AI-based job relevance scoring
            </p>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-primary">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Profile</>}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-4xl">
        {/* Resume Upload */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-static p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Resume Upload</h2>
            <span className="badge badge-skill ml-auto">Auto-extracts Skills & Titles</span>
          </div>
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
              dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/10 hover:border-white/20'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileUpload(file);
            }}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-indigo-400" />
                <p className="text-slate-400 text-sm">Parsing your resume…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload size={32} className="text-slate-600" />
                <div>
                  <p className="text-slate-300 text-sm font-medium">Drop your resume here</p>
                  <p className="text-slate-600 text-xs mt-1">Supports .txt, .pdf (as text)</p>
                </div>
                <span className="btn-secondary text-xs px-4 py-2">Browse Files</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skills */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-4">
              <Code size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Skills</h2>
              <span className="text-xs text-slate-500 ml-auto">{profile.skills.length} added</span>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                className="input-field"
                placeholder="Add skill…"
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
              />
              <button onClick={addSkill} className="btn-primary px-3"><Plus size={14} /></button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {profile.skills.map(skill => (
                <span key={skill} className="badge badge-skill flex items-center gap-1.5 pl-3 pr-2">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="hover:text-rose-400">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            {/* Quick-add common skills */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-slate-600 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SKILLS.filter(s => !profile.skills.includes(s)).slice(0, 12).map(s => (
                  <button key={s} onClick={() => setProfile(p => ({ ...p, skills: [...p.skills, s] }))}
                    className="badge badge-skill cursor-pointer hover:border-indigo-500/40 hover:text-indigo-300 transition-colors">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Target Roles & Experience */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Target Roles</h2>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                className="input-field"
                placeholder="Add target role…"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTitle()}
              />
              <button onClick={addTitle} className="btn-primary px-3"><Plus size={14} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {profile.titles.map(t => (
                <span key={t} className="badge badge-skill flex items-center gap-1.5 pl-3 pr-2">
                  {t}
                  <button onClick={() => setProfile(p => ({ ...p, titles: p.titles.filter(x => x !== t) }))}
                    className="hover:text-rose-400"><X size={10} /></button>
                </span>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-text">Years of Experience</label>
                <input
                  type="number"
                  min={0} max={30}
                  className="input-field"
                  value={profile.experienceYears}
                  onChange={e => setProfile(p => ({ ...p, experienceYears: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label-text">Experience Level</label>
                <select className="select-field" value={profile.experienceLevel}
                  onChange={e => setProfile(p => ({ ...p, experienceLevel: e.target.value as any }))}>
                  {Object.entries(EXPERIENCE_LEVEL_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Location Preferences */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Location Preferences</h2>
            </div>
            <div className="mb-4">
              <label className="label-text">Preferred Locations</label>
              <input
                className="input-field"
                placeholder="e.g. Remote, San Francisco, London"
                value={profile.preferredLocations.join(', ')}
                onChange={e => setProfile(p => ({
                  ...p,
                  preferredLocations: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                }))}
              />
            </div>
            <div>
              <label className="label-text">Work Type</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'remote',  label: '🌐 Remote' },
                  { value: 'hybrid',  label: '🏢 Hybrid' },
                  { value: 'onsite',  label: '📍 On-site' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleRemote(value)}
                    className={`badge cursor-pointer transition-all ${
                      (profile.preferredRemote as string[]).includes(value)
                        ? 'badge-remote bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'badge-skill'
                    }`}
                  >
                    {(profile.preferredRemote as string[]).includes(value) && <Check size={10} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Salary */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Salary Range</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-text">Minimum ($)</label>
                <input type="number" step={1000} min={0}
                  className="input-field"
                  placeholder="100000"
                  value={profile.targetSalaryMin ?? ''}
                  onChange={e => setProfile(p => ({ ...p, targetSalaryMin: Number(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <label className="label-text">Maximum ($)</label>
                <input type="number" step={1000} min={0}
                  className="input-field"
                  placeholder="180000"
                  value={profile.targetSalaryMax ?? ''}
                  onChange={e => setProfile(p => ({ ...p, targetSalaryMax: Number(e.target.value) || undefined }))}
                />
              </div>
            </div>
          </motion.div>

          {/* Industries */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card-static p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Preferred Industries</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(INDUSTRY_LABELS).map(([value, label]) => {
                const isSelected = (profile.preferredIndustries as string[]).includes(value);
                return (
                  <button key={value} onClick={() => toggleIndustry(value)}
                    className={`badge cursor-pointer py-2.5 px-3 justify-start transition-all ${
                      isSelected ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'badge-skill'
                    }`}>
                    {isSelected && <Check size={11} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
