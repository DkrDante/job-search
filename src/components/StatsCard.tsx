'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: string;
  trend?: number;
  delay?: number;
}

export default function StatsCard({
  title, value, subtitle, icon: Icon, color = '#30D158', trend, delay = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card stat-card"
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend > 0 ? 'text-emerald-400 bg-emerald-400/10' :
            trend < 0 ? 'text-rose-400 bg-rose-400/10' :
            'text-slate-400 bg-slate-400/10'
          }`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm font-medium text-slate-300 mt-0.5">{title}</div>
        {subtitle && (
          <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
        )}
      </div>
    </motion.div>
  );
}
