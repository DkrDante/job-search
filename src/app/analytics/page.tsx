'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, PieChart as PieIcon, Target,
  Award, Clock, CheckCircle2, X, Briefcase,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { DashboardStats } from '@/lib/types';
import { SOURCE_LABELS, INDUSTRY_LABELS } from '@/config/defaults';

const COLORS = ['#30D158', '#FF9F0A', '#66D4CF', '#f59e0b', '#30B0C7', '#f43f5e', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card-static px-3 py-2 text-xs shadow-xl">
        <p className="text-slate-400 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-semibold" style={{ color: p.color || p.fill || '#fff' }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const sourceData = (stats?.jobsBySource ?? []).map(({ source, count }) => ({
    name: SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] ?? source,
    jobs: count,
  }));

  const industryData = (stats?.jobsByIndustry ?? []).map(({ industry, count }) => ({
    name: INDUSTRY_LABELS[industry as keyof typeof INDUSTRY_LABELS] ?? industry,
    jobs: count,
  }));

  const funnelData = (stats?.applicationFunnel ?? []).map(({ status, count }) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    count,
  }));

  const skillsData = (stats?.topSkills ?? []).map(({ skill, count }) => ({
    skill,
    demand: count,
    fullMark: stats?.topSkills[0].count ?? 1,
  }));

  const STATUS_COLORS: Record<string, string> = {
    Bookmarked: '#8E8E93',
    Applied: '#FF9F0A',
    Interviewing: '#fbbf24',
    Offer: '#66D4CF',
    Rejected: '#fb7185',
    Withdrawn: '#94a3b8',
  };

  return (
    <div className="min-h-screen">
      <div className="page-header pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Insights across your job radar data</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Jobs', value: stats?.totalJobs ?? 0, icon: Briefcase, color: '#30D158' },
            { label: 'New Today',  value: stats?.newToday ?? 0,  icon: TrendingUp, color: '#66D4CF' },
            { label: 'Applied',    value: stats?.applied ?? 0,    icon: CheckCircle2, color: '#FF9F0A' },
            { label: 'Match Rate', value: `${stats?.matchRate ?? 0}%`, icon: Target, color: '#f59e0b' },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card-static p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">{label}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                  <Icon size={14} style={{ color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{loading ? '—' : value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Jobs by source */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-5">
              <PieIcon size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Jobs by Source</h2>
            </div>
            {loading ? <div className="h-52 skeleton rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                    dataKey="jobs" paddingAngle={4}>
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(v) => <span className="text-xs text-slate-400">{v}</span>}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Jobs by industry */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Jobs by Industry</h2>
            </div>
            {loading ? <div className="h-52 skeleton rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={industryData} layout="vertical" barSize={12}>
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(48,209,88,0.05)' }} />
                  <Bar dataKey="jobs" radius={[0, 4, 4, 0]}>
                    {industryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Application funnel */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-5">
              <Target size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Application Funnel</h2>
            </div>
            {loading ? <div className="h-52 skeleton rounded-xl" /> : funnelData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-600">
                <CheckCircle2 size={32} className="mb-2" />
                <p className="text-sm">No applications tracked yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnelData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(48,209,88,0.05)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Applications">
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Top skills radar */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card-static p-6">
            <div className="flex items-center gap-2 mb-5">
              <Award size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Top In-Demand Skills</h2>
            </div>
            {loading ? <div className="h-52 skeleton rounded-xl" /> : (
              <>
                <div className="space-y-2.5">
                  {(stats?.topSkills ?? []).slice(0, 8).map(({ skill, count }, i) => {
                    const max = stats!.topSkills[0].count;
                    return (
                      <div key={skill} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-24 truncate">{skill}</span>
                        <div className="flex-1 progress-bar">
                          <motion.div className="progress-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / max) * 100}%` }}
                            transition={{ delay: 0.35 + i * 0.05, duration: 0.6 }}
                            style={{ background: COLORS[i % COLORS.length] }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
