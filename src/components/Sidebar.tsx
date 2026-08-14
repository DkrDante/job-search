'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radar, LayoutDashboard, Briefcase, KanbanSquare,
  Bell, User, BarChart3, RefreshCw, Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useToast } from './ToastProvider';

const navItems = [
  { href: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/jobs',          label: 'Job Board',     icon: Briefcase },
  { href: '/applications',  label: 'Applications',  icon: KanbanSquare },
  { href: '/alerts',        label: 'Alerts',        icon: Bell },
  { href: '/profile',       label: 'My Profile',    icon: User },
  { href: '/analytics',     label: 'Analytics',     icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { success, error } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/jobs/refresh', { method: 'POST', body: JSON.stringify({ useMock: true }) });
      const data = await res.json();
      success(`Found ${data.newJobs ?? 0} new jobs across ${Object.keys(data.sources ?? {}).length} sources`, 'Scan Complete');
    } catch {
      error('Scan failed — check your network', 'Refresh Error');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <nav className="sidebar flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="radar-logo">
            <div className="radar-logo-ring" />
            <div className="radar-logo-sweep" />
            <Radar size={18} className="absolute inset-0 m-auto text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Job Radar</h1>
            <p className="text-xs text-slate-500">Active Monitoring</p>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      <div className="mx-4 my-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-emerald-400 font-medium">Monitoring Active</span>
      </div>

      {/* Nav */}
      <div className="flex-1 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-indigo-500/10 rounded-[10px] -z-10"
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Scan button */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-primary w-full justify-center text-xs"
        >
          {refreshing ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <Zap size={14} />
              Scan Now
            </>
          )}
        </button>
        <p className="text-xs text-slate-600 text-center mt-2">Auto-scans every 30 min</p>
      </div>
    </nav>
  );
}
