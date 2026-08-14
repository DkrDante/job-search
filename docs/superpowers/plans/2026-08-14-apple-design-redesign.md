# Apple-Design Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin Job Radar's materials, color, typography, and motion to Apple's design language (dark theme kept), and add a mobile nav drawer + kanban drag-and-drop as the two opted-in interaction upgrades.

**Architecture:** Two Tailwind palette overrides (`indigo`→green accent, `emerald`→mint success) and a `fontSize` tuple override do most of the color/typography work for free across every existing `className` in the app. A small number of files use literal hex strings (chart arrays, inline `style` props, a source-color map) and need direct edits. Two new files (`src/lib/motion.ts`, `src/components/MobileNav.tsx`) add the motion system and the mobile drawer. The Applications page gains hand-rolled pointer-based drag-and-drop (no new dependency).

**Tech Stack:** Next.js 14, React 18, Tailwind CSS 3, Framer Motion 11, Recharts, Lucide icons. No test runner exists in this repo — verification is `npm run lint`, `npm run build`, and manual browser checks (see Task 12).

## Global Constraints

- Dark theme only — no light mode, no theme toggle (per spec §"Scope decisions").
- Accent color: `#30D158` (radar green), flat — no gradients anywhere except removed entirely (even the logo sweep goes flat).
- Success semantics: `#66D4CF` (mint) — must never share a hue with accent green.
- No blue or purple/indigo/violet anywhere in the final UI (per user instruction) — including chart palettes, source-badge colors, and kanban status colors.
- No new npm dependencies.
- No API or data-model changes.
- Native `system-ui` font stack; the Google Fonts `<link>`/`@import` for Inter and JetBrains Mono is removed entirely (JetBrains Mono is confirmed unused anywhere in the codebase).

## Color reference (authoritative — use these exact values in every task below)

| Token | Hex | Old value it replaces | Used for |
|---|---|---|---|
| `--accent` | `#30D158` | `#6366f1` (indigo-500) | primary actions, active nav, brand, score ≥60 tier |
| `--accent-light` | `#5CE082` | `#818cf8` (indigo-400) | accent text-on-dark, hover-lighter |
| `--accent-dark` | `#248C40` | `#4f46e5` (indigo-600) | pressed states |
| `--success` | `#66D4CF` | `#10b981`/`#34d399` (emerald) | remote/salary badges, offer status, "New Today" stat, score ≥80 tier |
| `--warning` | `#f59e0b` | unchanged | onsite badge, interviewing status, match-rate stat, score ≥40 tier |
| `--danger` | `#f43f5e` | unchanged | error states, rejected status |
| `--neutral` | `#8E8E93` | `#8b5cf6`/`#a78bfa` (violet) | bookmarked status, "other/mock" sources |
| `--info` | `#FF9F0A` | one specific indigo hex (`adzuna` source only) | adzuna source badge, applied status |
| `--teal` | `#30B0C7` | `#06b6d4`/`#22d3ee` (cyan) | hybrid badge, remoteok/rss sources |

Tailwind's built-in `indigo` family is overridden to a green ramp and `emerald` to a mint ramp (Task 1), so every existing `text-indigo-400`, `bg-indigo-500/10`, `text-emerald-400`, etc. class in the codebase renders correctly with **no JSX changes** in the files that only use Tailwind classes for color (`Sidebar.tsx`, `FilterPanel.tsx`, `ToastProvider.tsx`, `src/app/jobs/page.tsx`, `src/app/alerts/page.tsx`, `src/app/profile/page.tsx`). Only files using literal hex strings or inline `style` props need manual edits — those are enumerated per-task below.

---

### Task 1: Design tokens, Tailwind palette overrides, typography, materials

**Files:**
- Modify: `src/app/globals.css` (full token/material rewrite)
- Modify: `tailwind.config.ts` (font family, color/fontSize overrides)
- Modify: `src/app/layout.tsx:1-22` (remove Google Fonts links)

**Interfaces:**
- Produces: CSS custom properties `--accent`, `--accent-light`, `--accent-dark`, `--success`, `--warning`, `--danger`, `--neutral`, `--info`, `--teal` on `:root`, consumed by every later task that touches `globals.css`-defined classes (badges, buttons, kanban, etc).
- Produces: Tailwind's `indigo-*` and `emerald-*` utility classes now resolve to green/mint — every later task relies on this being in place before touching component files.

- [ ] **Step 1: Rewrite the CSS variable block in `globals.css`**

Replace the entire `:root` block (lines 8–27) with:

```css
:root {
  --bg-primary: #05070a;
  --bg-secondary: #0b0d12;
  --bg-card: rgba(255, 255, 255, 0.04);
  --bg-card-hover: rgba(255, 255, 255, 0.06);
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(48, 209, 88, 0.35);
  --accent: #30D158;
  --accent-light: #5CE082;
  --accent-dark: #248C40;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
  --success: #66D4CF;
  --warning: #f59e0b;
  --danger: #f43f5e;
  --neutral: #8E8E93;
  --info: #FF9F0A;
  --teal: #30B0C7;
  --sidebar-w: 240px;
}
```

(`--violet` and `--cyan` are removed — nothing after this task references them.)

- [ ] **Step 2: Remove the Google Fonts import**

Delete line 1 of `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
```

- [ ] **Step 3: Update materials — sidebar/header get heavier translucency, cards get thinner**

In `.sidebar` (currently lines 61–72), change the background to a heavier material and keep the blur:
```css
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-w);
  height: 100vh;
  background: rgba(11, 13, 18, 0.85);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  z-index: 50;
  backdrop-filter: blur(24px) saturate(160%);
}
```

- [ ] **Step 4: Remove glow effects, flatten gradients, bump radii**

In `.glass-card:hover` (lines 91–96), remove the transform lift and the glow shadow, keep only a hairline brighten, and gate the lift under `(hover: hover)`:
```css
.glass-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}

@media (hover: hover) {
  .glass-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  }
}
```

Bump `.glass-card` and `.glass-card-static` `border-radius` from `16px` to `18px` (lines 86, 101).

In `.btn-primary` (lines 106–126), flatten the gradient and remove the glow-on-hover:
```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--accent);
  color: #05130a;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
}

.btn-primary:active {
  transform: scale(0.97);
}

@media (hover: hover) {
  .btn-primary:hover {
    background: var(--accent-light);
  }
}
```
(Text color on the primary button switches to a near-black `#05130a` — green at this brightness needs a dark foreground for contrast, unlike the old indigo which worked with white text.)

Bump `.btn-primary`, `.btn-secondary`, `.input-field`, `.select-field` `border-radius` from `10px` to `12px` (lines 114, 136, 195, 216).

In `.badge-new` (line 255), `.badge-score` (line 256), replace the indigo rgba/hex with accent green:
```css
.badge-new      { background: rgba(48,209,88,0.18);  color: var(--accent-light); border: 1px solid rgba(48,209,88,0.4); animation: pulse-badge 2s ease-in-out infinite; }
.badge-score    { background: rgba(48,209,88,0.14);  color: var(--accent-light); border: 1px solid rgba(48,209,88,0.3); }
```

In `.badge-remote` (line 252) and `.badge-salary` (line 257), replace emerald rgba/hex with mint:
```css
.badge-remote   { background: rgba(102,212,207,0.16); color: var(--success); border: 1px solid rgba(102,212,207,0.32); }
.badge-salary   { background: rgba(102,212,207,0.14); color: var(--success); border: 1px solid rgba(102,212,207,0.28); }
```

In `.badge-hybrid` (line 253), replace cyan with teal:
```css
.badge-hybrid   { background: rgba(48,176,199,0.16); color: var(--teal); border: 1px solid rgba(48,176,199,0.32); }
```

Delete the five dead `.badge-source-*` rules (lines 259–263) — confirmed via repo-wide grep that no JSX references any `badge-source-*` class name; `SourceBadge.tsx` uses inline styles instead (handled in Task 8).

In the status badges (lines 271–276), replace with:
```css
.status-bookmarked  { background: rgba(142,142,147,0.18); color: var(--neutral); }
.status-applied     { background: rgba(255,159,10,0.18);  color: var(--info); }
.status-interviewing{ background: rgba(245,158,11,0.18);  color: var(--warning); }
.status-offer       { background: rgba(102,212,207,0.18); color: var(--success); }
.status-rejected    { background: rgba(244,63,94,0.18);   color: var(--danger); }
.status-withdrawn   { background: rgba(100,116,139,0.18); color: #94a3b8; }
```

In `.job-card-new-indicator` (lines 385–393), `.stat-card::before` (lines 361–371), and `.progress-bar-fill` (lines 550–555), replace the two-stop `linear-gradient(..., var(--accent) 0%, var(--violet) 100%)` with a flat fill:
```css
/* all three become: */
background: var(--accent);
```

In `.radar-logo-ring` / `.radar-logo-sweep` (lines 439–453), no code change needed — they already reference `var(--accent)` directly, so they pick up the new green automatically.

Remove the `@keyframes glow-pulse` block and the `.animate-glow` class (lines 412–415, 424) — nothing after this task should use accent-colored box-shadow glow. Grep for `animate-glow` usage before deleting to confirm no JSX references it; if a page does use it, replace that usage with `animate-fade-up` instead (a plain fade, no glow).

- [ ] **Step 4b: Verify no JSX uses `.animate-glow`**

Run: `grep -rn "animate-glow" src/`
Expected: no output. If there is output, note the file/line for a follow-up edit (swap the className to `animate-fade-up`) before continuing.

- [ ] **Step 5: Scroll-edge fade instead of hard border under the sticky header**

Replace `.page-header` (lines 558–566):
```css
.page-header {
  padding: 32px 32px 0;
  background: rgba(11, 13, 18, 0.7);
  backdrop-filter: blur(20px) saturate(160%);
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-header::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -16px;
  height: 16px;
  background: linear-gradient(to bottom, rgba(11,13,18,0.4), transparent);
  pointer-events: none;
}
```
Note `.page-header` needs `position: relative` isn't required since it's already `position: sticky` (establishes a positioning context for the absolutely-positioned `::after`).

- [ ] **Step 6: Tighten the uppercase label tracking**

In `.label-text` (lines 230–238), change `letter-spacing: 0.05em;` to `letter-spacing: 0.03em;`.

- [ ] **Step 7: Update `tailwind.config.ts` — font stack, color overrides, fontSize tuples**

Replace the full file:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.45', letterSpacing: '-0.005em' }],
        lg: ['1.125rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      },
      colors: {
        indigo: {
          50: '#EAFBEE', 100: '#CFF6DA', 200: '#9FEBB6', 300: '#6EDD8F',
          400: '#43CD6C', 500: '#30D158', 600: '#22A344', 700: '#1B7D36',
          800: '#165F2A', 900: '#124A22',
        },
        emerald: {
          50: '#EFFBFA', 100: '#D3F3F0', 200: '#A8E7E1', 300: '#7EDBD3',
          400: '#66D4CF', 500: '#45C0BA', 600: '#349A95', 700: '#297874',
          800: '#225F5C', 900: '#1D4E4B',
        },
        radar: {
          950: '#05070a',
          900: '#0a0e10',
          850: '#0b0d12',
          800: '#111827',
          700: '#1a2340',
          600: '#1e2d4a',
          500: '#243357',
          accent: '#30D158',
          'accent-light': '#5CE082',
          'accent-dark': '#248C40',
          success: '#66D4CF',
          amber: '#f59e0b',
          rose: '#f43f5e',
          neutral: '#8E8E93',
          info: '#FF9F0A',
          teal: '#30B0C7',
        },
      },
      backgroundImage: {
        'radar-gradient': 'linear-gradient(135deg, #05070a 0%, #0b0d12 50%, #111827 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'radar-scan': 'radar-scan 2s linear infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'radar-scan': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```
(Dropped: `mono` font family, `'accent-gradient'`/`'glow-gradient'` backgroundImage entries, `'glow'`/`'glow-sm'` boxShadow entries, `pulse-slow` animation — all were only used to build the glow/gradient effects removed in Step 4. Grep in Step 9 catches any straggler usage.)

- [ ] **Step 8: Remove the Google Fonts `<link>` tags from `layout.tsx`**

In `src/app/layout.tsx`, delete lines 16–21 (the two `<link rel="preconnect">` tags and the stylesheet `<link>`), leaving:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <ToastProvider>
          <div className="app-shell">
            <Sidebar />
            <main className="main-content">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
```
(The `<head>` element and its imports become unnecessary — Next.js's `Metadata` export still handles `<title>`/`<meta>`; no manual `<head>` is needed once the font links are gone.)

- [ ] **Step 9: Verify no leftover references to removed tokens**

Run: `grep -rn "glow-gradient\|accent-gradient\|'glow'\|pulse-slow\|--violet\|--cyan\|font-mono\|animate-glow" src/`
Expected: no output. If anything is found, fix that specific reference before moving on (it means a later task's edit didn't land yet, or an unexpected usage was missed — resolve by removing/replacing it, not by re-adding the deleted token).

- [ ] **Step 10: Build check**

Run: `npm run lint && npm run build`
Expected: both succeed with no new errors. (Some pre-existing lint warnings unrelated to this change are fine; do not fix unrelated issues in this task.)

- [ ] **Step 11: Commit**

```bash
git add src/app/globals.css tailwind.config.ts src/app/layout.tsx
git commit -m "feat: replace indigo/violet theme with Apple-style green/mint materials"
```

---

### Task 2: Shared spring presets and reduced-motion/transparency helpers

**Files:**
- Create: `src/lib/motion.ts`

**Interfaces:**
- Produces: `springSettle: Transition`, `springMomentum: Transition`, `useAppleMotion(): { reduceMotion: boolean }` — consumed by Tasks 3, 4, 5, 7, 11.

- [ ] **Step 1: Write the module**

```ts
import { useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

export const springSettle: Transition = {
  type: 'spring',
  bounce: 0,
  duration: 0.35,
};

export const springMomentum: Transition = {
  type: 'spring',
  bounce: 0.2,
  duration: 0.35,
};

export function useAppleMotion() {
  const reduceMotion = useReducedMotion();
  return { reduceMotion };
}
```

- [ ] **Step 2: Add the reduced-transparency CSS fallback**

Append to `src/app/globals.css`:
```css
@media (prefers-reduced-transparency: reduce) {
  .sidebar, .page-header, .toast, .filter-panel .glass-card-static {
    backdrop-filter: none !important;
    background: rgba(11, 13, 18, 0.98) !important;
  }
}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: succeeds (this file isn't imported anywhere yet, so it can't break anything — this just confirms it type-checks).

- [ ] **Step 4: Commit**

```bash
git add src/lib/motion.ts src/app/globals.css
git commit -m "feat: add shared spring presets and reduced-motion/transparency helpers"
```

---

### Task 3: Extract shared nav config, update Sidebar

**Files:**
- Create: `src/config/nav.ts`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Produces: `navItems: { href: string; label: string; icon: LucideIcon }[]` from `src/config/nav.ts` — consumed by Task 4 (`MobileNav.tsx`).
- Consumes: `springSettle` from `src/lib/motion.ts` (Task 2).

- [ ] **Step 1: Create the shared nav config**

```ts
import {
  LayoutDashboard, Briefcase, KanbanSquare, Bell, User, BarChart3,
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
];
```

- [ ] **Step 2: Update `Sidebar.tsx` to import the shared list and use the spring preset**

Replace the local `navItems` array (lines 13–20) with:
```ts
import { navItems } from '@/config/nav';
```
(remove the now-redundant `LayoutDashboard, Briefcase, KanbanSquare, Bell, User, BarChart3` names from the `lucide-react` import on line 5–8, keeping only `Radar, RefreshCw, Zap`).

Replace the active-pill `motion.div` (lines 71–76):
```tsx
{isActive && (
  <motion.div
    layoutId="sidebar-active"
    transition={springSettle}
    className="absolute inset-0 bg-indigo-500/10 rounded-[10px] -z-10"
  />
)}
```
Add the import: `import { springSettle } from '@/lib/motion';` at the top of the file.

(No other color edits needed in this file — `text-indigo-400` on the logo icon and `bg-emerald-500/10`/`text-emerald-400` on the monitoring indicator already render correctly via Task 1's Tailwind palette override.)

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: succeeds, and running `npm run dev` then loading any page shows the sidebar's active-item pill in green.

- [ ] **Step 4: Commit**

```bash
git add src/config/nav.ts src/components/Sidebar.tsx
git commit -m "refactor: extract shared nav config, animate active pill with spring"
```

---

### Task 4: Mobile nav drawer

**Files:**
- Create: `src/components/MobileNav.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `navItems` from `src/config/nav.ts` (Task 3), `springSettle`/`springMomentum`/`useAppleMotion` from `src/lib/motion.ts` (Task 2).
- Produces: `<MobileNav />` component, mounted once in `layout.tsx` alongside `<Sidebar />`.

- [ ] **Step 1: Add the CSS for the top bar, scrim, and drawer**

Append to `src/app/globals.css`:
```css
/* ─── Mobile Nav ─────────────────────────────────────────────────────── */
.mobile-topbar {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 60;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: rgba(11, 13, 18, 0.85);
  backdrop-filter: blur(20px) saturate(160%);
  border-bottom: 1px solid var(--border);
}

.mobile-topbar-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  color: var(--text-primary);
  border: none;
}

.mobile-drawer-scrim {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 70;
}

.mobile-drawer {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: min(80vw, 300px);
  background: rgba(11, 13, 18, 0.92);
  backdrop-filter: blur(24px) saturate(160%);
  border-right: 1px solid var(--border);
  z-index: 71;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .mobile-topbar { display: flex; }
  .app-shell .sidebar { display: none; }
  .app-shell .main-content { margin-top: 56px; }
}
```

- [ ] **Step 2: Write `MobileNav.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Menu, X, Radar } from 'lucide-react';
import { navItems } from '@/config/nav';
import { springSettle, springMomentum, useAppleMotion } from '@/lib/motion';

const DRAWER_WIDTH_FALLBACK = 300; // used only before the drawer has mounted once

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { reduceMotion } = useAppleMotion();
  const x = useMotionValue(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerWidthRef = useRef(DRAWER_WIDTH_FALLBACK);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    x.set(0);
    if (open && drawerRef.current) {
      drawerWidthRef.current = drawerRef.current.offsetWidth;
    }
  }, [open, x]);

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const drawerWidth = drawerWidthRef.current;
    const shouldClose = info.offset.x < -drawerWidth * 0.3 || info.velocity.x < -500;
    if (shouldClose) {
      setOpen(false);
    } else {
      animate(x, 0, reduceMotion ? { duration: 0.15 } : { ...springSettle, velocity: info.velocity.x });
    }
  }

  return (
    <>
      <div className="mobile-topbar">
        <button className="mobile-topbar-button" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Radar size={18} className="text-radar-accent" />
          <span className="text-sm font-bold text-white">Job Radar</span>
        </div>
        <div className="w-9" />
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="mobile-drawer-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reduceMotion ? { duration: 0.15 } : springSettle}
              onClick={() => setOpen(false)}
            />
            <motion.div
              ref={drawerRef}
              className="mobile-drawer"
              style={{ x }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={reduceMotion ? { duration: 0.15 } : springSettle}
              drag={reduceMotion ? false : 'x'}
              dragConstraints={{ left: -drawerWidthRef.current, right: 0 }}
              dragElastic={{ left: 0.15, right: 0 }}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Radar size={18} className="text-radar-accent" />
                  <span className="text-sm font-bold text-white">Job Radar</span>
                </div>
                <button className="mobile-topbar-button" onClick={() => setOpen(false)} aria-label="Close navigation">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                  return (
                    <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
                      <Icon size={18} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

The drawer uses Framer Motion's own `drag="x"` + `dragConstraints` + `dragElastic` — this gives 1:1 pointer tracking and rubber-band resistance at the boundary for free (Framer Motion implements the skill's §1–§9 gesture behavior internally for `drag`-enabled elements), and `onDragEnd`'s velocity is handed to the settle spring per the skill's velocity-handoff rule (§5). Swipe-to-dismiss is the `shouldClose` check inside `handleDragEnd`.

- [ ] **Step 3: Mount `MobileNav` in `layout.tsx`**

```tsx
import MobileNav from '@/components/MobileNav';
// ...
<body>
  <ToastProvider>
    <div className="app-shell">
      <Sidebar />
      <MobileNav />
      <main className="main-content">
        {children}
      </main>
    </div>
  </ToastProvider>
</body>
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the app, resize the browser (or devtools device toolbar) to a width under 768px.
Expected: the sidebar disappears, a translucent top bar with a menu button appears, tapping it opens a left drawer with a dimming scrim, dragging the drawer left past ~30% of its width or flicking it left closes it, tapping a nav link navigates and closes the drawer.

- [ ] **Step 5: Commit**

```bash
git add src/components/MobileNav.tsx src/app/layout.tsx src/app/globals.css
git commit -m "feat: add mobile nav drawer with spring-driven swipe-to-dismiss"
```

---

### Task 5: Shared score-color utility, ScoreRing motion + color update

**Files:**
- Create: `src/lib/scoreColor.ts`
- Modify: `src/components/ScoreRing.tsx`
- Modify: `src/components/JobCard.tsx:37-40`

**Interfaces:**
- Produces: `getScoreColor(score: number): string` — consumed by `ScoreRing.tsx` and `JobCard.tsx` (replaces the duplicated ternary in both).

- [ ] **Step 1: Extract the shared utility**

```ts
export function getScoreColor(score: number): string {
  if (score >= 80) return '#66D4CF'; // success (mint)
  if (score >= 60) return '#30D158'; // accent (green)
  if (score >= 40) return '#f59e0b'; // warning (amber)
  return '#64748b'; // muted
}
```

- [ ] **Step 2: Update `JobCard.tsx`**

Replace lines 37–40:
```tsx
const scoreColor = getScoreColor(job.relevanceScore);
```
Add the import: `import { getScoreColor } from '@/lib/scoreColor';`

- [ ] **Step 3: Update `ScoreRing.tsx` — color + spring animation + remove glow**

Replace lines 1–21:
```tsx
'use client';

import { motion } from 'framer-motion';
import { getScoreColor } from '@/lib/scoreColor';
import { springSettle, useAppleMotion } from '@/lib/motion';

interface ScoreRingProps {
  score: number;
  size?: number;
  color?: string;
  showLabel?: boolean;
}

export default function ScoreRing({ score, size = 48, color, showLabel = true }: ScoreRingProps) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const { reduceMotion } = useAppleMotion();

  const ringColor = color ?? getScoreColor(score);
```

Replace the `motion.circle`'s `transition` and remove the `filter` style (lines 44–49):
```tsx
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={reduceMotion ? { duration: 0.15 } : { ...springSettle, delay: 0.1 }}
        />
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: succeeds; visually, high-scoring jobs (≥80) now show a mint ring, ≥60 shows green, and no glow halo remains around the ring.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoreColor.ts src/components/ScoreRing.tsx src/components/JobCard.tsx
git commit -m "refactor: extract shared score-color utility, animate ScoreRing with a spring"
```

---

### Task 6: StatsCard default color, button press feedback

**Files:**
- Modify: `src/components/StatsCard.tsx:17`
- Modify: `src/app/globals.css` (button/card whileTap wiring is CSS-only via `:active`, already done in Task 1 — this task adds the JS-driven press feedback on interactive cards)
- Modify: `src/components/JobCard.tsx` (add `whileTap`)

**Interfaces:**
- Consumes: nothing new.

- [ ] **Step 1: Update the default accent color prop**

In `StatsCard.tsx` line 17, change:
```tsx
  title, value, subtitle, icon: Icon, color = '#6366f1', trend, delay = 0,
```
to:
```tsx
  title, value, subtitle, icon: Icon, color = '#30D158', trend, delay = 0,
```
(The `trend` positive/negative Tailwind classes — `text-emerald-400`/`text-rose-400` — already render as mint/rose via Task 1's palette override; no change needed there.)

- [ ] **Step 2: Add press feedback to `JobCard`'s clickable root**

In `JobCard.tsx`, the outer `motion.div` (lines 70–76) gets a `whileTap`:
```tsx
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={() => onSelect?.(job)}
      className="glass-card job-card group"
    >
```
(A small `0.99` scale — this is a large card, so a subtle press is enough to register without feeling like a bounce.)

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/StatsCard.tsx src/components/JobCard.tsx
git commit -m "feat: update default accent color, add press feedback to job cards"
```

---

### Task 7: Toast "materialize" entrance

**Files:**
- Modify: `src/components/ToastProvider.tsx:66-71`

**Interfaces:**
- Consumes: `springSettle`, `useAppleMotion` from `src/lib/motion.ts` (Task 2).

- [ ] **Step 1: Replace the toast's motion props**

```tsx
import { springSettle, useAppleMotion } from '@/lib/motion';
// ...
export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { reduceMotion } = useAppleMotion();
  // ... (addToast/success/error/info/alert/icons/colors unchanged)

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, alert }}>
      {children}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
              transition={reduceMotion ? { duration: 0.15 } : springSettle}
              className={`toast border ${colors[toast.type]}`}
            >
```
(Everything else in the file — icons, colors map, close button — is unchanged. The `info`/`success`/`error`/`alert` Tailwind classes already resolve to green/mint/rose/amber via Task 1.)

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: succeeds; triggering a toast (e.g. clicking "Scan Now" in the sidebar) shows it blur/scale/fade in together rather than sliding in flat.

- [ ] **Step 3: Commit**

```bash
git add src/components/ToastProvider.tsx
git commit -m "feat: materialize toast entrance instead of a flat slide"
```

---

### Task 8: Source badge colors and emoji

**Files:**
- Modify: `src/config/defaults.ts:45-55`
- Modify: `src/components/SourceBadge.tsx:4-14`

**Interfaces:**
- Consumes: nothing new.
- Produces: updated `SOURCE_COLORS` values consumed by `analytics/page.tsx`'s legend rendering (no signature change, values only).

- [ ] **Step 1: Update `SOURCE_COLORS`**

```ts
export const SOURCE_COLORS: Record<string, string> = {
  remotive:   '#66D4CF',
  adzuna:     '#FF9F0A',
  'hn-hiring':'#f59e0b',
  remoteok:   '#30B0C7',
  arbeitnow:  '#8E8E93',
  themuse:    '#ec4899',
  jobicy:     '#f43f5e',
  rss:        '#30B0C7',
  custom:     '#94a3b8',
};
```

- [ ] **Step 2: Update `SOURCE_EMOJI` to match the new colors**

```ts
const SOURCE_EMOJI: Record<string, string> = {
  remotive:    '🟢',
  adzuna:      '🟠',
  'hn-hiring': '🟡',
  remoteok:    '⚪',
  arbeitnow:   '⚫',
  themuse:     '🩷',
  jobicy:      '🔴',
  rss:         '⬜',
  custom:      '⚙️',
};
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: succeeds; visiting the Job Board page shows no blue or purple source badges.

- [ ] **Step 4: Commit**

```bash
git add src/config/defaults.ts src/components/SourceBadge.tsx
git commit -m "fix: recolor source badges away from indigo/violet"
```

---

### Task 9: Dashboard page chart/stat colors

**Files:**
- Modify: `src/app/page.tsx:19,110,118,127,135`

**Interfaces:**
- Consumes: nothing new.

- [ ] **Step 1: Update `CHART_COLORS`**

Line 19:
```tsx
const CHART_COLORS = ['#30D158', '#FF9F0A', '#66D4CF', '#f59e0b', '#30B0C7', '#f43f5e'];
```

- [ ] **Step 2: Update the four `StatsCard` `color` props**

Line 110 (`Total Jobs`): `color="#30D158"`
Line 118 (`New Today`): `color="#66D4CF"`
Line 127 (`Applications`): stays `color="#f59e0b"` (unchanged — already amber, not indigo/violet)
Line 135 (`Match Rate`): `color="#30B0C7"` (was `#8b5cf6` violet)

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/`.
Expected: the "Jobs by Industry" bar chart and "By Source" pie chart use only green/orange/mint/amber/teal/rose, no blue or purple; the four stat card icon chips are green/mint/amber/teal.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "fix: recolor dashboard charts and stat cards away from indigo/violet"
```

---

### Task 10: Analytics page chart/status/stat colors

**Files:**
- Modify: `src/app/analytics/page.tsx:16,67-71,88-91`

**Interfaces:**
- Consumes: nothing new.

- [ ] **Step 1: Update the `COLORS` array**

Line 16:
```tsx
const COLORS = ['#30D158', '#FF9F0A', '#66D4CF', '#f59e0b', '#30B0C7', '#f43f5e', '#ec4899'];
```

- [ ] **Step 2: Update the status-color map**

Lines 67–71 (keep in sync with `applications/page.tsx`'s `COLUMNS`, updated identically in Task 11):
```tsx
    Bookmarked: '#8E8E93',
    Applied: '#FF9F0A',
    Interviewing: '#fbbf24',
    Offer: '#66D4CF',
    Rejected: '#fb7185',
```

- [ ] **Step 3: Update the four `StatsCard`-style `color` entries**

Lines 88–91:
```tsx
            { label: 'Total Jobs', value: stats?.totalJobs ?? 0, icon: Briefcase, color: '#30D158' },
            { label: 'New Today',  value: stats?.newToday ?? 0,  icon: TrendingUp, color: '#66D4CF' },
            { label: 'Applied',    value: stats?.applied ?? 0,    icon: CheckCircle2, color: '#FF9F0A' },
            { label: 'Match Rate', value: `${stats?.matchRate ?? 0}%`, icon: Target, color: '#f59e0b' },
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/analytics`.
Expected: no blue or purple anywhere on the page's charts, legends, or stat tiles.

- [ ] **Step 5: Commit**

```bash
git add src/app/analytics/page.tsx
git commit -m "fix: recolor analytics charts and status map away from indigo/violet"
```

---

### Task 11: Applications page — kanban colors + drag-and-drop

**Files:**
- Modify: `src/app/applications/page.tsx`

**Interfaces:**
- Consumes: `springSettle`, `springMomentum`, `useAppleMotion` from `src/lib/motion.ts` (Task 2).

- [ ] **Step 1: Recolor `COLUMNS`**

Replace lines 10–15:
```tsx
const COLUMNS: { status: ApplicationStatus; label: string; color: string; emoji: string }[] = [
  { status: 'bookmarked',   label: 'Bookmarked',   color: '#8E8E93', emoji: '🔖' },
  { status: 'applied',      label: 'Applied',      color: '#FF9F0A', emoji: '📨' },
  { status: 'interviewing', label: 'Interviewing', color: '#fbbf24', emoji: '🎯' },
  { status: 'offer',        label: 'Offer',        color: '#66D4CF', emoji: '🎉' },
  { status: 'rejected',     label: 'Rejected',     color: '#fb7185', emoji: '❌' },
];
```

- [ ] **Step 2: Add CSS for the drag handle and drop-target highlight**

Append to `src/app/globals.css`:
```css
.kanban-card-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--text-muted);
  cursor: grab;
  touch-action: none;
}

.kanban-card-dragging {
  cursor: grabbing;
  position: relative;
  z-index: 50;
  pointer-events: none; /* let elementFromPoint see the column underneath, not the dragged card itself */
  box-shadow: 0 12px 32px rgba(0,0,0,0.5);
}

.kanban-column-drop-target {
  border-color: var(--accent) !important;
  background: rgba(48,209,88,0.06) !important;
}
```

- [ ] **Step 3: Rewrite `KanbanCard` with pointer-driven drag**

Replace the whole `KanbanCard` function (original lines 22–104) with:

```tsx
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
      clearDropHighlights();
      setDragging(false);

      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const column = target?.closest('[data-status]') as HTMLElement | null;
      const newStatus = column?.dataset.status as ApplicationStatus | undefined;

      if (newStatus && newStatus !== app.status) {
        onUpdate(app.id, newStatus);
      }

      animate(x, 0, { ...springMomentum, velocity: velocityX });
      animate(y, 0, { ...springMomentum, velocity: velocityY });
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
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
```

Notes on this implementation:
- The drag handle (`GripVertical` icon) is the only pointer-down target for dragging, so the delete button, note editor, apply link, and `<select>` keep working exactly as before — the `<select>` remains a fully keyboard-operable fallback per the spec.
- Drop-target detection and rubber-banding use `document.elementFromPoint` / DOM `classList` directly instead of React state, so there's no re-render on every `pointermove` — this keeps the drag at native frame rate (skill §11, frame-level smoothness).
- `data-status` (added to each column in Step 4 below) is what `closest('[data-status]')` matches against.
- When `prefers-reduced-motion` is set, `handlePointerDown` does nothing — dragging is disabled and the `<select>` becomes the only way to change status, which satisfies the reduced-motion guidance (§14) by removing the gesture rather than stripping its animation (there's no sensible "static" drag).

- [ ] **Step 4: Add required imports and `data-status` to each column**

At the top of `src/app/applications/page.tsx`, update imports:
```tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { KanbanSquare, Plus, Pencil, Trash2, ExternalLink, Clock, ChevronRight, GripVertical } from 'lucide-react';
import { ApplicationRecord, ApplicationStatus, Job } from '@/lib/types';
import { useToast } from '@/components/ToastProvider';
import { formatDistanceToNow } from 'date-fns';
import { springMomentum, useAppleMotion } from '@/lib/motion';
```

Find where each column `<div className="kanban-column">` is rendered (mapping over `COLUMNS` further down in the file) and add `data-status={col.status}`:
```tsx
<div key={col.status} className="kanban-column" data-status={col.status}>
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `/applications` (create at least 2 bookmarked jobs first via the Job Board page if the board is empty).
Expected:
- Dragging a card by its grip handle tracks 1:1 with the pointer.
- Dragging over a different column highlights that column's border/background.
- Releasing over a different column updates the card's status (verify via a page refresh or the card moving to the new column).
- Dragging the card outside the board's bounds resists progressively rather than moving freely, and snaps back on release.
- The `<select>` dropdown in each card still changes status correctly on its own.
- With devtools' "Emulate CSS prefers-reduced-motion: reduce" on, dragging is disabled but the `<select>` still works.

- [ ] **Step 6: Build check**

Run: `npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add src/app/applications/page.tsx src/app/globals.css
git commit -m "feat: add pointer-based drag-and-drop to the kanban board, recolor columns"
```

---

### Task 12: Full-app verification pass

**Files:** none (verification only)

- [ ] **Step 1: Repo-wide color audit**

Run:
```bash
grep -rn "#6366f1\|#818cf8\|#4f46e5\|#8b5cf6\|#a78bfa\|#06b6d4\|#22d3ee\|text-indigo\|bg-indigo\|border-indigo\|text-violet\|bg-violet\|text-purple\|bg-purple\|text-blue-\|bg-blue-" src/
```
Expected: no output. (`text-indigo-*`/`bg-indigo-*` classes are expected to still appear in JSX — that's fine, they now render green via the Tailwind override; this grep is checking for literal *hex* leftovers and any `purple`/`blue` Tailwind class, which should be zero.) If literal hex leftovers appear, fix them using the color reference table at the top of this plan before proceeding.

- [ ] **Step 2: Lint and build**

Run: `npm run lint && npm run build`
Expected: both succeed with zero new errors.

- [ ] **Step 3: Manual browser pass — desktop**

Run: `npm run dev`, open each of: `/`, `/jobs`, `/applications`, `/alerts`, `/analytics`, `/profile` at a desktop viewport width (≥1280px).
Expected: consistent green/mint/amber/rose/teal/orange/gray palette throughout, no indigo/violet/blue/purple anywhere, cards have hairline borders with no glow halos, sidebar and page header read as translucent materials.

- [ ] **Step 4: Manual browser pass — mobile**

Resize to <768px (or use devtools' device toolbar).
Expected: sidebar is replaced by the translucent top bar + drawer from Task 4; the app is fully navigable; the drawer opens/closes/swipes correctly on every page.

- [ ] **Step 5: Reduced-motion / reduced-transparency pass**

In devtools, enable "Emulate CSS media feature prefers-reduced-motion: reduce" and reload.
Expected: page-load and hover animations become short cross-fades, no spring overshoot, kanban dragging is disabled (select-only).

Then enable "Emulate CSS media feature prefers-reduced-transparency: reduce" (Chrome DevTools Rendering tab) and reload.
Expected: sidebar/header/toasts become solid/near-solid instead of blurred-translucent.

- [ ] **Step 6: Final commit (only if Step 1's audit required fixes)**

If Step 1 required any fixes:
```bash
git add -A
git commit -m "fix: clean up remaining indigo/violet/blue/purple references"
```
If no fixes were needed, this task requires no commit.
