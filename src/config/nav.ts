import {
  LayoutDashboard, Briefcase, KanbanSquare, Bell, User, BarChart3, Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/jobs',          label: 'Job Board',     icon: Briefcase },
  { href: '/applications',  label: 'Applications',  icon: KanbanSquare },
  { href: '/alerts',        label: 'Alerts',        icon: Bell },
  { href: '/profile',       label: 'My Profile',    icon: User },
  { href: '/analytics',     label: 'Analytics',     icon: BarChart3 },
  { href: '/account',       label: 'Account',       icon: Settings },
];
