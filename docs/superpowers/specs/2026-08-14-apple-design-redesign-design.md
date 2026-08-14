# Apple-design redesign — Job Radar

Date: 2026-08-14

## Goal

Redesign the feel and look of Job Radar (a Next.js dashboard for aggregating, scoring, and tracking job listings) by applying the principles from the `apple-design` skill (Apple's *Designing Fluid Interfaces*, typography, and materials guidance). This is a visual and motion systems overhaul, not a feature or data-model change.

## Scope decisions

- **Theme**: keep the existing dark base. Reskin the *materials* (surfaces, blur, shadows, borders) to Apple's dark-mode language rather than switching to light or building a light/dark toggle.
- **Accent color**: replace the current indigo→violet gradient (`#6366f1` → `#8b5cf6`) with a single flat accent, **radar green `#30D158`** (Apple system green). No UI gradients except the sidebar radar-logo sweep, which stays as the one signature brand/delight moment and also switches to flat green (no gradient).
- **Success color collision**: the app already uses emerald green for semantic "success" states (`badge-remote`, `badge-salary`, `status-offer`, the sidebar "Monitoring Active" indicator). Since the new accent is also green, these must not share a hue. Success semantics move to **mint/teal `#66D4CF`**. Accent green is reserved exclusively for primary actions, active states, brand, and the top end of the relevance score.
- **Typography**: drop the Google Fonts request entirely (both Inter and JetBrains Mono — grep confirmed JetBrains Mono is loaded but never referenced anywhere in the codebase). Replace with a native `system-ui` font stack. Apply Apple's size-specific tracking/leading rules instead of one fixed `letter-spacing`/`line-height` for all text.
- **Extra interaction scope** (beyond pure reskin, explicitly opted into):
  - **Mobile nav drawer**: today, `<768px` sets `.sidebar { display: none }` with nothing replacing it — there is no way to navigate the app on mobile. Add a compact translucent top bar with a menu button, and a spring-driven slide-in drawer with scrim, swipe-to-dismiss, rubber-band resistance at the edge.
  - **Kanban drag-and-drop** (Applications page): today, status changes happen via a `<select>` in each `KanbanCard`. Add real pointer-tracked drag-and-drop between the 5 status columns (1:1 tracking, `setPointerCapture`, drop-target highlighting, rubber-band at board edges). The `<select>` stays as a keyboard-accessible fallback — this is additive, not a replacement (Apple's "agency" principle: offer choices, don't force a single path).
- **Explicitly out of scope**: no new pages, no API/data-model changes (kanban DnD calls the existing `PATCH /api/applications/:id`), Recharts remains the charting library (just recolored to the new token palette), no light-mode/theme toggle.

## 1. Design tokens & materials

Replace the current flat two-tier surface system (`--bg-card` / `--bg-card-hover`) with a layered depth scale, and remove all accent-colored glow/halo effects in favor of neutral shadows + hairline borders.

- `--surface-0`: page background (near-black, replaces `--bg-primary`).
- `--surface-1`: heavier translucent material for structural chrome that content scrolls under — sidebar, mobile drawer, sticky page header, toasts. Stronger `backdrop-filter: blur(20px) saturate(180%)` and a deeper shadow, per the skill's "bigger/structural surfaces read as thicker" rule.
- `--surface-2`: lighter, thinner material for cards (`glass-card`, `stat-card`, `kanban-card`, `kanban-column`) — replaces today's `--bg-card`.
- `--accent`: `#30D158` (radar green), flat. No `--accent-light`/`--accent-dark`/`--violet` gradient partners as UI-wide tokens.
- `--success`: `#66D4CF` (mint/teal) — replaces emerald across `badge-remote`, `badge-salary`, `status-offer`, monitoring-active indicator, and StatsCard's positive-trend color.
- `--warning` (`#f59e0b`), `--danger` (`#f43f5e`) stay as-is — they don't collide with the new accent.
- Remove `box-shadow: 0 0 20px rgba(accent, 0.4)`-style glow from: `.btn-primary:hover`, `.glass-card:hover`, ScoreRing's `drop-shadow` filter, `.animate-glow` keyframe. Replace with a neutral soft elevation shadow (`0 4px 16px rgba(0,0,0,0.3)`) plus a hairline border that brightens toward the accent on hover/focus.
- Sticky `.page-header`'s hard `border-bottom: 1px solid var(--border)` becomes a scroll-edge fade (small gradient mask where content meets the floating header) instead of a fixed line.
- Corner radii increase slightly (cards 16px→18px, buttons/inputs 10px→12px, kanban columns 16px→18px) for a softer, more "continuous corner" feel. No true squircle masking — plain `border-radius` is enough at this fidelity.

## 2. Typography

- `src/app/globals.css`: remove the `@import url('https://fonts.googleapis.com/...')` line. `src/app/layout.tsx`: remove the `<link rel="preconnect">` and stylesheet `<link>` tags for Google Fonts.
- `tailwind.config.ts`: `fontFamily.sans` becomes `['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']` (standard system-ui stack). Drop the `mono` entry (JetBrains Mono is unused — confirmed via repo-wide grep).
- Define a small type scale as CSS custom properties or Tailwind text utilities, each pairing size with its own tracking/leading (not one global value):
  - Display/stat numbers (24–28px): `letter-spacing: -0.02em`, `line-height: 1.1`.
  - Section headings (14–15px, e.g. card titles): `letter-spacing: -0.01em`, `line-height: 1.3`.
  - Body/labels (13–14px): `letter-spacing: 0`, `line-height: 1.5`.
  - Micro/uppercase labels (10–11px, e.g. `.label-text`, badges): `letter-spacing: 0.03em` (slightly tighter than today's `0.05em`, still positive), `line-height: 1.4`.

## 3. Motion system

- New `src/lib/motion.ts` exporting two shared Framer Motion spring presets:
  - `springSettle`: critically damped (`damping: 1.0` equivalent via Framer's `bounce: 0`, `duration: 0.35`) — default for anything that appears/settles without prior gesture input (page sections, modals, stat cards, nav pill).
  - `springMomentum`: slightly underdamped (`bounce: 0.2`, `duration: 0.35`) — reserved for elements released from a gesture (kanban card drop, drawer swipe release, toast swipe-dismiss).
- Press feedback moves to `whileTap={{ scale: 0.97 }}` (fires on pointer-down) on buttons and interactive cards, replacing the current hover-driven `translateY(-1px)` + glow-shadow pattern.
- Hover-only affordances (lift, border brighten) get scoped under `@media (hover: hover)` so touch devices don't retain a "stuck hover" state.
- Respect `prefers-reduced-motion: reduce`: gate spring/slide/drawer animations behind a check (Framer Motion's `useReducedMotion` hook) and fall back to short opacity cross-fades, no overshoot, no drawer slide (drawer just fades in place).
- Respect `prefers-reduced-transparency: reduce`: a CSS media block raises `--surface-1`/`--surface-2` opacity and drops `backdrop-filter` to `none`.
- Toast entrance changes from a plain slide to a "materialize" (blur + scale + opacity animate together) per the skill's materials guidance.

## 4. Component changes

- **`Sidebar.tsx`**: becomes a `--surface-1` translucent material. Active nav-item pill keeps its `layoutId` but animates via `springSettle` instead of Framer's default tween. Radar logo sweep recolored flat green, gradient removed.
- **New mobile nav drawer** (new component, e.g. `MobileNav.tsx`, wired into `layout.tsx`): compact translucent top bar (`--surface-1`) shown only `<768px` with a menu button; tapping opens a spring-driven slide-in drawer (reuses `Sidebar`'s nav list) with a dimming scrim behind it, swipe-to-dismiss with rubber-band resistance at the drag boundary, closes automatically on route change.
- **Buttons** (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`): flat accent fill (no gradient) on primary, hover lift/glow removed, `whileTap` press scale added at the call sites that matter most (primary actions), hairline border brighten kept for secondary/ghost.
- **Cards** (`JobCard`, `StatsCard`, `glass-card`/`glass-card-static`): hover lift (`translateY`) and glow-shadow removed; replaced with hairline-border brighten + a subtle spring scale under `@media (hover: hover)`. `StatsCard`'s icon chip backgrounds simplified (single flat tint instead of two opacity layers).
- **`ScoreRing.tsx`**: drop the `drop-shadow` glow filter on the progress arc; animate `strokeDashoffset` with `springSettle` instead of a fixed `easeOut` tween. Score-color thresholds keep their meaning (≥80 success/mint, ≥60 accent/green, ≥40 warning/amber, else muted) — since success is now mint and accent is now green, the ≥80 and ≥60 tiers become visually distinct instead of both being "indigo-ish."
- **Badges** (`.badge-*`, `.status-*`): flattened opacity levels (less "glowing chip," more "tinted pill"); all emerald usages (`badge-remote`, `badge-salary`, `status-offer`, monitoring-active dot) recolor to the new `--success` mint; `badge-new`/`badge-score`/nav active state recolor to the new `--accent` green.
- **`ToastProvider.tsx`**: materialize-style entrance (see §3); info-toast icon/border recolors from indigo to the new accent green.
- **`FilterPanel.tsx`**: no structural change, inherits new tokens/typography/radii. Toggle switch thumb transition left as-is (CSS transition on a small, non-gesture control — low value to convert to a spring).
- **Applications page kanban** (`src/app/applications/page.tsx`): add real drag-and-drop —
  - Pointer-down on a `KanbanCard` starts a drag using Pointer Events + `setPointerCapture`, tracking 1:1 with the pointer (skill §2–3).
  - Columns highlight as a valid drop target while a card is dragged over them.
  - Dragging past the board's scrollable edge applies rubber-band resistance (skill §9) rather than a hard stop.
  - On drop, call the existing status-update handler (same `PATCH /api/applications/:id` call the `<select>` already uses) — no API change.
  - The `<select>` stays in place as a keyboard-operable fallback for the same status change.
  - Respect `prefers-reduced-motion`: dragging still works (it's user-initiated, not decorative), but the settle/return-to-column animation on a cancelled drag uses a short cross-fade instead of a bouncy spring.

## 5. Files touched (expected)

- `src/app/globals.css` — token overhaul, remove Google Fonts import, remove glow effects, new type scale, scroll-edge fade, new radii.
- `tailwind.config.ts` — font family, color tokens, remove now-unused gradient/shadow entries tied to the old accent.
- `src/app/layout.tsx` — remove Google Fonts `<link>` tags, mount the new mobile nav drawer.
- `src/lib/motion.ts` — new file, shared spring presets.
- `src/components/Sidebar.tsx`, `src/components/MobileNav.tsx` (new), `src/components/JobCard.tsx`, `src/components/StatsCard.tsx`, `src/components/ScoreRing.tsx`, `src/components/ToastProvider.tsx`, `src/components/FilterPanel.tsx`, `src/components/SourceBadge.tsx`.
- `src/app/page.tsx`, `src/app/jobs/page.tsx`, `src/app/applications/page.tsx` (+ kanban drag logic), `src/app/alerts/page.tsx`, `src/app/analytics/page.tsx`, `src/app/profile/page.tsx` — recolor chart palettes and any inline styles referencing the old indigo/violet hexes; no structural changes except Applications' kanban.

## 6. Verification

No test suite exists in this repo (`package.json` only defines `dev`/`build`/`start`/`lint`). Verification is manual:

- Run the dev server and visually check all 6 pages (Dashboard, Job Board, Applications, Alerts, Analytics, Profile) at desktop width.
- Check mobile width (`<768px`): confirm the new drawer opens/closes/swipes correctly and the app is fully navigable.
- Exercise kanban drag-and-drop across all 5 columns, plus the `<select>` fallback.
- Toggle `prefers-reduced-motion` and `prefers-reduced-transparency` in devtools and confirm graceful fallbacks.
- Run `npm run lint` and `npm run build` to catch type/lint regressions from the token/config changes.
