'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, Zap, KanbanSquare, TrendingUp, Star,
  RefreshCw, ArrowRight, Clock, Activity,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import JobCard from '@/components/JobCard';
import { DashboardStats, Job } from '@/lib/types';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { SOURCE_LABELS, INDUSTRY_LABELS } from '@/config/defaults';

const CHART_COLORS = ['#30D158', '#FF9F0A', '#66D4CF', '#f59e0b', '#30B0C7', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card-static px-3 py-2 text-xs">
        <p className="text-slate-400">{label}</p>
        <p className="text-white font-semibold">{payload[0].value} jobs</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetch('/api/jobs/refresh', { method: 'POST' });
    await loadStats();
    setRefreshing(false);
  }

  useEffect(() => { loadStats(); }, []);

  const sourceChartData = (stats?.jobsBySource ?? []).map(({ source, count }) => ({
    name: SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] ?? source,
    value: count,
  }));

  const industryChartData = (stats?.jobsByIndustry ?? [])
    .slice(0, 6)
    .map(({ industry, count }) => ({
      name: INDUSTRY_LABELS[industry as keyof typeof INDUSTRY_LABELS] ?? industry,
      jobs: count,
    }));

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="page-header pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">
              Job market intelligence at a glance
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-primary"
          >
            {refreshing ? (
              <><RefreshCw size={15} className="animate-spin" /> Scanning…</>
            ) : (
              <><Zap size={15} /> Refresh Now</>
            )}
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Stats grid */}
        {loading ? (
          <div className="stats-grid mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card-static h-32 skeleton" />
            ))}
          </div>
        ) : (
          <div className="stats-grid mb-8">
            <StatsCard
              title="Total Jobs"
              value={stats?.totalJobs.toLocaleString() ?? 0}
              subtitle="across all sources"
              icon={Briefcase}
              color="#30D158"
              delay={0}
            />
            <StatsCard
              title="New Today"
              value={stats?.newToday ?? 0}
              subtitle="posted in last 24h"
              icon={Zap}
              color="#66D4CF"
              trend={stats?.newToday && stats.newToday > 0 ? 12 : 0}
              delay={0.1}
            />
            <StatsCard
              title="Applications"
              value={stats?.applied ?? 0}
              subtitle={`${stats?.interviewing ?? 0} interviewing`}
              icon={KanbanSquare}
              color="#f59e0b"
              delay={0.2}
            />
            <StatsCard
              title="Match Rate"
              value={`${stats?.matchRate ?? 0}%`}
              subtitle="jobs score ≥ 60/100"
              icon={Star}
              color="#30B0C7"
              delay={0.3}
            />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Industry chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card-static p-6 xl:col-span-2"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white">Jobs by Industry</h2>
              <Activity size={15} className="text-slate-500" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={industryChartData} barSize={20}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="jobs" radius={[4, 4, 0, 0]}>
                  {industryChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Source pie */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card-static p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white">By Source</h2>
              <TrendingUp size={15} className="text-slate-500" />
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sourceChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [val, name]}
                  contentStyle={{ background: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {sourceChartData.map(({ name, value }, i) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-slate-400">{name}</span>
                  </div>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Top skills */}
        {stats?.topSkills && stats.topSkills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card-static p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white">Trending Skills</h2>
              <span className="text-xs text-slate-500">Based on job listings</span>
            </div>
            <div className="space-y-3">
              {stats.topSkills.map(({ skill, count }, i) => {
                const max = stats.topSkills[0].count;
                return (
                  <div key={skill} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-28 truncate">{skill}</span>
                    <div className="flex-1 progress-bar">
                      <motion.div
                        className="progress-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / max) * 100}%` }}
                        transition={{ delay: 0.4 + i * 0.05, duration: 0.6 }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* High score jobs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Star size={15} className="text-indigo-400" />
              Top Matches For You
            </h2>
            <Link href="/jobs" className="btn-ghost text-xs text-indigo-400">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="jobs-list">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="glass-card-static h-44 skeleton" />
              ))
            ) : (
              (stats?.recentHighScoreJobs ?? []).map((job, i) => (
                <JobCard key={job.id} job={job} index={i} />
              ))
            )}
          </div>
          {!loading && (stats?.recentHighScoreJobs ?? []).length === 0 && (
            <div className="glass-card-static p-10 text-center">
              <Clock size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No jobs found yet</p>
              <p className="text-slate-600 text-xs mt-1">Click &ldquo;Refresh Now&rdquo; to scan for jobs</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
