# Database + Auth + Account Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Job Radar's single-file JSON store with Postgres (via Prisma), add email/password authentication (Auth.js v5), and build an account management surface (profile settings, change password, delete account, forgot/reset password).

**Architecture:** Postgres is the new source of truth, accessed through a small set of domain-specific data-access modules under `src/lib/db/` (jobs, applications, alerts, users) that replace the current `src/lib/store.ts`. Auth.js handles sessions via a Credentials provider (JWT strategy, no session table). Because a job's relevance score is inherently relative to *whose* profile it's being matched against, scoring moves from "computed once at aggregation time and stored on the job" to "computed at request time against the calling user's profile" — jobs stay a single shared/global pool; only `Application`, `Alert`, and per-user profile fields (folded onto `User`) are scoped by `userId`.

**Tech Stack:** Next.js 14 (App Router), Prisma ORM + Postgres, Auth.js v5 (next-auth) Credentials provider, bcryptjs, Resend (password-reset email), Zod (already a dependency, used for request validation).

**Spec:** `docs/superpowers/specs/2026-08-14-database-auth-accounts-design.md`

## Global Constraints

- Database: hosted Postgres via Prisma. For local development/testing in this plan, a local Postgres is already running (started via `brew services start postgresql@17`) with a dev database created: `job_radar_dev`, reachable at `postgresql://yashvardhan@localhost:5432/job_radar_dev` (no password — local trust auth). Use this exact connection string for local `DATABASE_URL` unless the environment has moved on.
- Auth: Auth.js v5 (`next-auth`), Credentials provider only (email + password), JWT session strategy. No OAuth.
- Password hashing: `bcryptjs` (pure JS — avoids native-module build issues in the `node:20-alpine` Docker image). Bcrypt has a hard 72-byte input limit — password validation caps at 72 characters everywhere.
- No data migration from the old `data/store.json` — new accounts start empty (already decided; the file itself was untracked from git in commit `4c28c6e`).
- Jobs remain a global/shared table, populated by the existing aggregator (`src/lib/aggregator.ts`, source fetchers under `src/lib/sources/`) — unchanged fetch/dedup logic, only the persistence layer changes.
- No automated test suite exists in this repo and none is being introduced by this plan (confirmed in the spec) — verification is `npx tsc --noEmit`, `npm run lint`, `npm run build`, a real local Postgres for exercising Prisma queries, and curl-driven end-to-end flows (with a cookie jar for session-based checks) rather than a formal test framework.
- Every new/modified API route under `src/app/api/` (except `/api/auth/*`, `/api/health`, `/api/jobs/refresh`, `/api/events`) requires a valid session and scopes its data to `session.user.id`.

---

### Task 1: Prisma schema, client singleton, local migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Modify: `package.json` (dependencies + scripts)
- Modify: `.env` (local only, already git-ignored) and `.env.example`

**Interfaces:**
- Produces: the Prisma Client (`import { prisma } from '@/lib/prisma'`), and the generated `@prisma/client` types (`User`, `Job`, `Application`, `Alert`, `PasswordResetToken`, `JobView`, `ScanRecord`) — consumed by every later task.

- [ ] **Step 1: Install dependencies**

```bash
npm install prisma @prisma/client
npm install next-auth@beta bcryptjs
npm install --save-dev @types/bcryptjs
```

(`prisma` and `@prisma/client` land in regular `dependencies`, not `devDependencies` — the production Docker image needs the `prisma` CLI at container start to run `prisma migrate deploy`, per Task 12.)

- [ ] **Step 2: Add npm scripts**

In `package.json`, add to `"scripts"`:
```json
"postinstall": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:studio": "prisma studio"
```

- [ ] **Step 3: Write the Prisma schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  name            String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  skills               String[] @default([])
  titles               String[] @default([])
  experienceYears      Int?
  experienceLevel      String?
  preferredLocations   String[] @default([])
  preferredRemote      String[] @default([])
  preferredIndustries  String[] @default([])
  preferredJobTypes    String[] @default([])
  targetSalaryMin      Int?
  targetSalaryMax      Int?
  resumeText           String?
  profileUpdatedAt     DateTime?

  applications    Application[]
  alerts          Alert[]
  resetTokens     PasswordResetToken[]
  jobViews        JobView[]
}

model PasswordResetToken {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String    @unique
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime  @default(now())

  @@index([userId])
}

model Job {
  id                String    @id @default(cuid())
  title             String
  company           String
  companyLogo       String?
  description       String
  responsibilities  String[]
  requirements      String[]
  skills            String[]
  location          String
  remote            String
  jobType           String
  experienceLevel   String
  industry          String
  salaryMin         Int?
  salaryMax         Int?
  salaryCurrency    String?
  salaryPeriod      String?
  applyUrl          String
  deadline          DateTime?
  postedAt          DateTime
  source            String
  sourceId          String?
  dedupeKey         String    @unique
  createdAt         DateTime  @default(now())

  applications      Application[]
  views             JobView[]

  @@index([postedAt])
  @@index([source])
}

model JobView {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  viewedAt  DateTime @default(now())

  @@unique([userId, jobId])
}

model Application {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobId             String
  job               Job       @relation(fields: [jobId], references: [id], onDelete: Cascade)
  status            String
  notes             String    @default("")
  appliedAt         DateTime?
  interviewDate     DateTime?
  offerAmount       Int?
  rejectionReason   String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@unique([userId, jobId])
  @@index([userId])
}

model Alert {
  id                 String    @id @default(cuid())
  userId             String
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name               String
  keywords           String[]
  excludeKeywords    String[]
  locations          String[]
  remote             String[]
  experienceLevels   String[]
  industries         String[]
  minSalary          Int?
  maxSalary          Int?
  sources            String[]
  frequency          String
  isActive           Boolean   @default(true)
  lastTriggered      DateTime?
  createdAt          DateTime  @default(now())

  @@index([userId])
}

model ScanRecord {
  id         String    @id @default(cuid())
  timestamp  DateTime  @default(now())
  source     String
  jobsFound  Int
  newJobs    Int
  duration   Int
  error      String?
}
```

- [ ] **Step 4: Create the Prisma client singleton**

```ts
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```
(Standard Next.js pattern — avoids creating a new `PrismaClient` per hot-reload in dev, which exhausts Postgres connections.)

- [ ] **Step 5: Set the local `DATABASE_URL` and run the initial migration**

```bash
echo 'DATABASE_URL="postgresql://yashvardhan@localhost:5432/job_radar_dev"' >> .env
npx prisma generate
npx prisma migrate dev --name init
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors (the generated `@prisma/client` types resolve).

Run: `/opt/homebrew/opt/postgresql@17/bin/psql postgresql://yashvardhan@localhost:5432/job_radar_dev -c '\dt'`
Expected: lists all 7 tables — `User`, `PasswordResetToken`, `Job`, `JobView`, `Application`, `Alert`, `ScanRecord` (Prisma migration naming may prefix/pluralize per its defaults — confirm the tables exist, exact casing doesn't matter for this check).

- [ ] **Step 7: Add the new env vars to `.env.example`**

Append to `.env.example`:
```
# ── Database (required) ───────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/job_radar
```

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/prisma.ts package.json package-lock.json .env.example
git commit -m "feat: add Prisma schema and Postgres client for multi-user data model"
```
(`.env` stays untracked — it's already git-ignored.)

---

### Task 2: Auth.js foundation — config, route handler, middleware, session provider

**Files:**
- Create: `src/lib/auth.config.ts`
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`
- Create: `src/types/next-auth.d.ts`
- Create: `src/components/AuthSessionProvider.tsx`
- Modify: `src/app/layout.tsx` (wrap children in the session provider)
- Modify: `.env` and `.env.example` (NEXTAUTH_SECRET, NEXTAUTH_URL)

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma.ts` (Task 1).
- Produces: `auth()` (server-side session getter), `signIn`/`signOut` (server actions re-exported from `src/lib/auth.ts`), `handlers` (`{ GET, POST }` for the route) — consumed by Tasks 3–11. Client components use `next-auth/react`'s own `signIn`/`signOut`/`useSession`, which only need `AuthSessionProvider` mounted (this task).

Auth.js v5's Credentials provider uses `bcryptjs` + Prisma, neither of which run on the Edge runtime that Next.js middleware uses by default. Splitting into `auth.config.ts` (edge-safe: page routing + the `authorized` callback, no providers) and `auth.ts` (Node-only: the actual Credentials provider) is the officially recommended pattern for exactly this case — `middleware.ts` only ever imports `auth.config.ts`.

- [ ] **Step 1: Write the edge-safe config**

```ts
// src/lib/auth.config.ts
import type { NextAuthConfig } from 'next-auth';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/api/health'];

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicPath = PUBLIC_PATHS.some(p => nextUrl.pathname.startsWith(p));

      if (isPublicPath) {
        if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/signup')) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
  providers: [],
};
```

- [ ] **Step 2: Write the full Node-runtime config**

```ts
// src/lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { prisma } from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // JWT sessions have no server-side session table to invalidate on
      // account deletion, so a deleted user's existing cookie would otherwise
      // keep authenticating until the token naturally expires. Check the user
      // still exists on every session read and strip `user` if not — every
      // route in this plan already guards on `if (!session?.user)`, so this
      // makes that guard correctly reject a deleted user without any
      // per-route changes.
      const exists = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { id: true },
      });
      if (!exists) {
        return { ...session, user: undefined } as typeof session;
      }
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Add the Auth.js route handler**

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Add the middleware**

```ts
// src/middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 5: Add the session type augmentation**

```ts
// src/types/next-auth.d.ts
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}
```

- [ ] **Step 6: Add the client-side session provider**

```tsx
// src/components/AuthSessionProvider.tsx
'use client';

import { SessionProvider } from 'next-auth/react';

export default function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 7: Mount it in the root layout**

In `src/app/layout.tsx`, wrap the existing body content:
```tsx
import AuthSessionProvider from '@/components/AuthSessionProvider';
// ... existing imports (ToastProvider, Sidebar, MobileNav)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthSessionProvider>
          <ToastProvider>
            <div className="app-shell">
              <Sidebar />
              <MobileNav />
              <main className="main-content">
                {children}
              </main>
            </div>
          </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` locally**

```bash
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env
echo 'NEXTAUTH_URL=http://localhost:3010' >> .env
```
(Port `3010` is this plan's convention for local verification — check it's free with `lsof -ti:3010` before starting `next dev` in later verification steps; pick a different free port if it's taken and use that consistently for the rest of this plan's manual checks.)

Append to `.env.example`:
```
# ── Auth (required) ────────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

Run (from the project root, with `DATABASE_URL`/`NEXTAUTH_SECRET`/`NEXTAUTH_URL` already in `.env`):
```bash
PORT=3010 npm run dev &
sleep 4
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3010/
```
Expected: a `307` (or `302`) redirect toward `/login` — confirms middleware is protecting the root route now that no session exists. Stop the dev server afterward (`kill %1` or the equivalent job-control command) — don't leave it running into the next task's verification, to avoid port/`.next` collisions.

- [ ] **Step 10: Commit**

```bash
git add src/lib/auth.config.ts src/lib/auth.ts src/app/api/auth src/middleware.ts src/types/next-auth.d.ts src/components/AuthSessionProvider.tsx src/app/layout.tsx .env.example
git commit -m "feat: add Auth.js credentials-based authentication foundation"
```

---

### Task 3: Signup — API route and page

**Files:**
- Create: `src/app/api/auth/signup/route.ts`
- Create: `src/app/signup/page.tsx`

**Interfaces:**
- Consumes: `prisma` (Task 1), `signIn` from `next-auth/react` (client-side, available once Task 2's `AuthSessionProvider` is mounted).
- Produces: nothing new consumed by later tasks — this is a leaf feature.

- [ ] **Step 1: Write the signup API route**

```ts
// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const signupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('[API:auth/signup] Error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the signup page**

```tsx
// src/app/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Radar } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        router.push('/login');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card-static p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <Radar size={20} className="text-radar-accent" />
          <span className="text-sm font-bold text-white">Job Radar</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
        <p className="text-sm text-slate-400 mb-6">Start tracking jobs that match you.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text">Name</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input type="password" required minLength={8} className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-4 text-center">
          Already have an account? <Link href="/login" className="text-radar-accent">Log in</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
PORT=3010 npm run dev &
sleep 4
curl -s -X POST http://localhost:3010/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test1@example.com","password":"testpass123"}'
```
Expected: `201` with `{"id":"...","email":"test1@example.com","name":"Test User"}`.

Run: `/opt/homebrew/opt/postgresql@17/bin/psql postgresql://yashvardhan@localhost:5432/job_radar_dev -c "SELECT email, \"passwordHash\" FROM \"User\";"`
Expected: one row, `passwordHash` starting with `$2` (bcrypt).

Re-run the same curl `POST` once more.
Expected: `409` (duplicate email correctly rejected).

Stop the dev server (`kill %1`).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/signup src/app/signup
git commit -m "feat: add signup API route and page"
```

---

### Task 4: Login page

**Files:**
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `signIn` from `next-auth/react`, the test user created in Task 3's verification (`test1@example.com` / `testpass123`) for this task's own verification.

- [ ] **Step 1: Write the login page**

```tsx
// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Radar } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('Incorrect email or password');
        return;
      }
      router.push('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card-static p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <Radar size={20} className="text-radar-accent" />
          <span className="text-sm font-bold text-white">Job Radar</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Log in</h1>
        <p className="text-sm text-slate-400 mb-6">Welcome back.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text">Email</label>
            <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input type="password" required className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <div className="flex items-center justify-between mt-4 text-xs">
          <Link href="/forgot-password" className="text-slate-500 hover:text-slate-300">Forgot password?</Link>
          <Link href="/signup" className="text-radar-accent">Create account</Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
PORT=3010 npm run dev &
sleep 4

# Fetch a CSRF token and cookie jar (Auth.js credentials sign-in requires this dance even via curl)
curl -s -c /tmp/jobradar-cookies.txt http://localhost:3010/api/auth/csrf > /tmp/csrf.json
CSRF=$(node -e "console.log(require('/tmp/csrf.json').csrfToken)")

curl -s -b /tmp/jobradar-cookies.txt -c /tmp/jobradar-cookies.txt \
  -X POST http://localhost:3010/api/auth/callback/credentials \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "email=test1@example.com" \
  --data-urlencode "password=testpass123" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "json=true"

curl -s -b /tmp/jobradar-cookies.txt -o /dev/null -w "%{http_code}\n" http://localhost:3010/
```
Expected: the final request returns `200` (not a redirect to `/login`) — the session cookie from the login flow authenticates the request to the protected root route.

Stop the dev server (`kill %1`). Keep `/tmp/jobradar-cookies.txt` — later tasks' verification reuses this authenticated cookie jar.

- [ ] **Step 3: Commit**

```bash
git add src/app/login
git commit -m "feat: add login page"
```

---

### Task 5: Jobs domain → Prisma, per-user scoring

**Files:**
- Create: `src/lib/db/jobs.ts`
- Create: `src/lib/db/users.ts` (only `getUserProfile` in this task — Task 8 adds `updateUserProfile` to this same file)
- Modify: `src/lib/aggregator.ts` (drop scoring; use the new jobs data-access module)
- Modify: `src/app/api/jobs/route.ts`
- Modify: `src/app/api/jobs/[id]/route.ts`
- Modify: `src/app/api/events/route.ts`

**Interfaces:**
- Consumes: `prisma` (Task 1), `auth` (Task 2), `scoreJobs`/`scoreJob` from `src/lib/scorer.ts` (unchanged), `deduplicateJobs`/`deduplicateJobsWithin` from `src/lib/deduplicator.ts` (unchanged).
- Produces: `getAllJobs()`, `getJobById(id)`, `upsertFetchedJobs(jobs)`, `getLastRefreshed()`, `addScanRecord(record)`, `markJobViewed(userId, jobId)`, `getViewedJobIds(userId, jobIds)`, `toJob(row, extra)` from `src/lib/db/jobs.ts`; `getUserProfile(userId)` from `src/lib/db/users.ts` — consumed by Tasks 8, 9.

- [ ] **Step 1: Write the jobs data-access module**

```ts
// src/lib/db/jobs.ts
import { prisma } from '@/lib/prisma';
import { Job, JobSource } from '@/lib/types';
import type { Job as PrismaJob } from '@prisma/client';

export function toJob(
  row: PrismaJob,
  extra: { relevanceScore: number; isNew: boolean; viewedAt?: string }
): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    companyLogo: row.companyLogo ?? undefined,
    description: row.description,
    responsibilities: row.responsibilities,
    requirements: row.requirements,
    skills: row.skills,
    location: row.location,
    remote: row.remote as Job['remote'],
    jobType: row.jobType as Job['jobType'],
    experienceLevel: row.experienceLevel as Job['experienceLevel'],
    industry: row.industry as Job['industry'],
    salary:
      row.salaryMin != null || row.salaryMax != null
        ? {
            min: row.salaryMin ?? undefined,
            max: row.salaryMax ?? undefined,
            currency: row.salaryCurrency ?? 'USD',
            period: (row.salaryPeriod as 'hourly' | 'monthly' | 'annual' | null) ?? 'annual',
          }
        : undefined,
    applyUrl: row.applyUrl,
    deadline: row.deadline?.toISOString(),
    postedAt: row.postedAt.toISOString(),
    source: row.source as JobSource,
    sourceId: row.sourceId ?? undefined,
    relevanceScore: extra.relevanceScore,
    isNew: extra.isNew,
    viewedAt: extra.viewedAt,
    dedupeKey: row.dedupeKey,
  };
}

export async function getAllJobs(limit = 2000): Promise<PrismaJob[]> {
  return prisma.job.findMany({
    orderBy: { postedAt: 'desc' },
    take: limit,
  });
}

export async function getJobById(id: string): Promise<PrismaJob | null> {
  return prisma.job.findUnique({ where: { id } });
}

export async function upsertFetchedJobs(jobs: Job[]): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;

  for (const job of jobs) {
    const existing = await prisma.job.findUnique({ where: { dedupeKey: job.dedupeKey } });
    const data = {
      title: job.title,
      company: job.company,
      companyLogo: job.companyLogo,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      skills: job.skills,
      location: job.location,
      remote: job.remote,
      jobType: job.jobType,
      experienceLevel: job.experienceLevel,
      industry: job.industry,
      salaryMin: job.salary?.min,
      salaryMax: job.salary?.max,
      salaryCurrency: job.salary?.currency,
      salaryPeriod: job.salary?.period,
      applyUrl: job.applyUrl,
      deadline: job.deadline ? new Date(job.deadline) : null,
      postedAt: new Date(job.postedAt),
      source: job.source,
      sourceId: job.sourceId,
      dedupeKey: job.dedupeKey,
    };

    if (existing) {
      await prisma.job.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.job.create({ data });
      added++;
    }
  }

  return { added, updated };
}

export async function getLastRefreshed(): Promise<string | null> {
  const latest = await prisma.scanRecord.findFirst({ orderBy: { timestamp: 'desc' } });
  return latest?.timestamp.toISOString() ?? null;
}

export async function addScanRecord(record: {
  source: string;
  jobsFound: number;
  newJobs: number;
  duration: number;
  error?: string;
}): Promise<void> {
  await prisma.scanRecord.create({ data: record });
}

export async function markJobViewed(userId: string, jobId: string): Promise<void> {
  await prisma.jobView.upsert({
    where: { userId_jobId: { userId, jobId } },
    create: { userId, jobId },
    update: { viewedAt: new Date() },
  });
}

export async function getViewedJobIds(userId: string, jobIds: string[]): Promise<Map<string, string>> {
  const views = await prisma.jobView.findMany({
    where: { userId, jobId: { in: jobIds } },
  });
  return new Map(views.map(v => [v.jobId, v.viewedAt.toISOString()]));
}
```

- [ ] **Step 2: Write the users data-access module (profile read only, for scoring)**

```ts
// src/lib/db/users.ts
import { prisma } from '@/lib/prisma';
import { ResumeProfile } from '@/lib/types';

export async function getUserProfile(userId: string): Promise<ResumeProfile | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return {
    skills: user.skills,
    titles: user.titles,
    experienceYears: user.experienceYears ?? 0,
    experienceLevel: (user.experienceLevel as ResumeProfile['experienceLevel']) ?? 'mid',
    preferredLocations: user.preferredLocations,
    preferredRemote: user.preferredRemote as ResumeProfile['preferredRemote'],
    preferredIndustries: user.preferredIndustries as ResumeProfile['preferredIndustries'],
    preferredJobTypes: user.preferredJobTypes as ResumeProfile['preferredJobTypes'],
    targetSalaryMin: user.targetSalaryMin ?? undefined,
    targetSalaryMax: user.targetSalaryMax ?? undefined,
    resumeText: user.resumeText ?? undefined,
    updatedAt: (user.profileUpdatedAt ?? user.updatedAt).toISOString(),
  };
}
```

- [ ] **Step 3: Update the aggregator**

Replace the top of `src/lib/aggregator.ts` (imports) — remove the `./store` import and the `getNewJobsSince` export (dead code — confirmed unused anywhere via `grep -rn "getNewJobsSince" src/`), stop scoring:

```ts
import { Job, ScanRecord } from './types';
import { fetchRemotiveJobs } from './sources/remotive';
import { fetchAdzunaJobs } from './sources/adzuna';
import { fetchHNHiringJobs } from './sources/hn-hiring';
import { fetchRemoteOKJobs } from './sources/remoteok';
import { fetchArbeitnowJobs } from './sources/arbeitnow';
import { fetchTheMuseJobs } from './sources/themuse';
import { fetchJobicyJobs } from './sources/jobicy';
import { fetchRSSFeed, PRESET_RSS_FEEDS } from './sources/rss-parser';
import { deduplicateJobs, deduplicateJobsWithin } from './deduplicator';
import { getAllJobs, upsertFetchedJobs, addScanRecord, toJob } from './db/jobs';

export interface AggregationResult {
  totalFetched: number;
  newJobs: number;
  updated: number;
  sources: Record<string, { fetched: number; error?: string }>;
  duration: number;
}

type SourceFetcher = () => Promise<Job[]>;

const SOURCES: { name: string; fetch: SourceFetcher }[] = [
  { name: 'remotive', fetch: () => fetchRemotiveJobs(60) },
  { name: 'remoteok', fetch: () => fetchRemoteOKJobs(60) },
  { name: 'arbeitnow', fetch: () => fetchArbeitnowJobs(1) },
  { name: 'themuse', fetch: () => fetchTheMuseJobs(1, 50) },
  { name: 'jobicy', fetch: () => fetchJobicyJobs(50) },
  { name: 'hn-hiring', fetch: () => fetchHNHiringJobs(40) },
  { name: 'adzuna', fetch: () => fetchAdzunaJobs('software engineer developer', 'us', 1) },
];

export async function runAggregation(): Promise<AggregationResult> {
  const startTime = Date.now();
  const sourceResults: Record<string, { fetched: number; error?: string }> = {};
  const allFetched: Job[] = [];

  await Promise.allSettled(
    SOURCES.map(async ({ name, fetch }) => {
      try {
        const jobs = await fetch();
        allFetched.push(...jobs);
        sourceResults[name] = { fetched: jobs.length };
        console.log(`[${name}] Fetched ${jobs.length} jobs`);
      } catch (e) {
        sourceResults[name] = { fetched: 0, error: String(e) };
        console.error(`[${name}] Failed:`, e);
      }
    })
  );

  for (const feedConfig of PRESET_RSS_FEEDS) {
    try {
      const rssJobs = await fetchRSSFeed(feedConfig);
      allFetched.push(...rssJobs);
      sourceResults[`rss:${feedConfig.sourceName}`] = { fetched: rssJobs.length };
    } catch (e) {
      sourceResults[`rss:${feedConfig.sourceName}`] = { fetched: 0, error: String(e) };
    }
  }

  const totalFetched = allFetched.length;
  const dedupedIncoming = deduplicateJobsWithin(allFetched);

  const existingRows = await getAllJobs();
  const existing = existingRows.map(row => toJob(row, { relevanceScore: 0, isNew: false }));
  const trulyNew = deduplicateJobs(dedupedIncoming, existing);

  const { added, updated } = await upsertFetchedJobs([
    ...trulyNew,
    ...dedupedIncoming.filter(j => !trulyNew.includes(j)),
  ]);

  const duration = Date.now() - startTime;

  await addScanRecord({
    source: 'custom',
    jobsFound: totalFetched,
    newJobs: added,
    duration,
  });

  console.log(
    `[Aggregator] Done in ${duration}ms — fetched: ${totalFetched}, deduplicated to: ${dedupedIncoming.length}, new: ${added}, updated: ${updated}`
  );

  return { totalFetched, newJobs: added, updated, sources: sourceResults, duration };
}
```

(`ScanRecord` import from `./types` is now unused in this file if nothing else references it — check with `grep -n "ScanRecord" src/lib/aggregator.ts` after this edit and drop the import if so.)

- [ ] **Step 4: Update `src/app/api/jobs/route.ts`**

Replace the imports and `GET` handler, keep `filterJobs`/`sortJobs` unchanged:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllJobs, getLastRefreshed, getViewedJobIds, toJob } from '@/lib/db/jobs';
import { getUserProfile } from '@/lib/db/users';
import { scoreJobs } from '@/lib/scorer';
import { Job, JobsQueryParams, PaginatedJobsResponse } from '@/lib/types';
import { DEFAULT_PAGE_SIZE } from '@/config/defaults';

function filterJobs(jobs: Job[], params: JobsQueryParams): Job[] {
  // unchanged from the existing implementation
  return jobs.filter(job => {
    if (params.q) {
      const q = params.q.toLowerCase();
      const searchText = `${job.title} ${job.company} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
      if (!searchText.includes(q)) return false;
    }
    if (params.location) {
      const loc = params.location.toLowerCase();
      if (!job.location.toLowerCase().includes(loc)) return false;
    }
    if (params.remote && job.remote !== params.remote) return false;
    if (params.level && job.experienceLevel !== params.level) return false;
    if (params.industry && job.industry !== params.industry) return false;
    if (params.source && job.source !== params.source) return false;
    if (params.minSalary && job.salary) {
      if ((job.salary.min ?? 0) < params.minSalary) return false;
    }
    if (params.jobType && job.jobType !== params.jobType) return false;
    if (params.isNew !== undefined && job.isNew !== params.isNew) return false;
    return true;
  });
}

function sortJobs(jobs: Job[], sort: string = 'relevance', order: string = 'desc'): Job[] {
  const sorted = [...jobs].sort((a, b) => {
    switch (sort) {
      case 'date':
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      case 'salary':
        return (b.salary?.min ?? 0) - (a.salary?.min ?? 0);
      case 'company':
        return a.company.localeCompare(b.company);
      case 'relevance':
      default:
        return b.relevanceScore - a.relevanceScore;
    }
  });
  return order === 'asc' ? sorted.reverse() : sorted;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const params: JobsQueryParams = {
      q: searchParams.get('q') || undefined,
      location: searchParams.get('location') || undefined,
      remote: (searchParams.get('remote') as any) || undefined,
      level: (searchParams.get('level') as any) || undefined,
      industry: (searchParams.get('industry') as any) || undefined,
      source: (searchParams.get('source') as any) || undefined,
      minSalary: searchParams.get('minSalary') ? Number(searchParams.get('minSalary')) : undefined,
      jobType: (searchParams.get('jobType') as any) || undefined,
      sort: (searchParams.get('sort') as any) || 'relevance',
      order: (searchParams.get('order') as any) || 'desc',
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? DEFAULT_PAGE_SIZE),
      isNew: searchParams.get('isNew') === 'true' ? true : undefined,
    };

    let rows = await getAllJobs();
    if (rows.length === 0) {
      const { runAggregation } = await import('@/lib/aggregator');
      await runAggregation();
      rows = await getAllJobs();
    }

    const viewedMap = await getViewedJobIds(userId, rows.map(r => r.id));
    const profile = await getUserProfile(userId);
    const unscored = rows.map(row =>
      toJob(row, {
        relevanceScore: 0,
        isNew: !viewedMap.has(row.id),
        viewedAt: viewedMap.get(row.id),
      })
    );
    const jobs = scoreJobs(unscored, profile);

    const filtered = filterJobs(jobs, params);
    const sorted = sortJobs(filtered, params.sort, params.order);
    const total = sorted.length;
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const paginated = sorted.slice((page - 1) * limit, page * limit);

    const response: PaginatedJobsResponse = {
      jobs: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      lastRefreshed: await getLastRefreshed(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API:jobs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Update `src/app/api/jobs/[id]/route.ts`**

```ts
// src/app/api/jobs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getJobById, markJobViewed, toJob } from '@/lib/db/jobs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = await getJobById(params.id);
    if (!row) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    await markJobViewed(session.user.id, params.id);
    return NextResponse.json(toJob(row, { relevanceScore: 0, isNew: false }));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Update `src/app/api/events/route.ts`**

Replace the `getJobs`/`isNew`-based polling (which was global-store-shaped and doesn't map to per-user `isNew` any more) with a simple "new jobs arrived" signal based on job creation time, which is what this endpoint is actually for (a live "new listings found" toast, not per-user read state):

```ts
// src/app/api/events/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

      let lastChecked = new Date();

      const interval = setInterval(async () => {
        try {
          const newCount = await prisma.job.count({ where: { createdAt: { gt: lastChecked } } });
          const now = new Date();
          if (newCount > 0) {
            const total = await prisma.job.count();
            const payload = JSON.stringify({ newJobs: newCount, total });
            controller.enqueue(encoder.encode(`event: new-jobs\ndata: ${payload}\n\n`));
          }
          lastChecked = now;
        } catch {
          clearInterval(interval);
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 0 errors, only pre-existing unrelated warnings.

```bash
PORT=3010 npm run dev &
sleep 4
curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/jobs | node -e "
  let d=''; process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    const r = JSON.parse(d);
    console.log('total:', r.total, 'first job relevanceScore:', r.jobs[0]?.relevanceScore, 'isNew:', r.jobs[0]?.isNew);
  });
"
```
Expected: `total` > 0 (the empty-store branch triggers a real aggregation against the live job source APIs — this may take a few seconds), and the first job has a numeric `relevanceScore` and `isNew: true` (never viewed by this user).

```bash
JOB_ID=$(curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/jobs | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).jobs[0].id))")
curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/jobs/$JOB_ID > /dev/null
curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/jobs | node -e "
  let d=''; process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    const r = JSON.parse(d);
    const j = r.jobs.find(j => j.id === '$JOB_ID');
    console.log('isNew after viewing:', j.isNew);
  });
"
```
Expected: `isNew after viewing: false` — confirms `JobView` tracking works.

Stop the dev server (`kill %1`).

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/jobs.ts src/lib/db/users.ts src/lib/aggregator.ts src/app/api/jobs src/app/api/events
git commit -m "feat: migrate jobs domain to Prisma with per-user relevance scoring"
```

---

### Task 6: Applications domain → Prisma

**Files:**
- Create: `src/lib/db/applications.ts`
- Modify: `src/app/api/applications/route.ts`
- Modify: `src/app/api/applications/[id]/route.ts`

**Interfaces:**
- Consumes: `prisma` (Task 1), `auth` (Task 2).
- Produces: `getApplicationsForUser(userId)`, `upsertApplication(userId, input)`, `updateApplication(userId, id, patch)`, `deleteApplication(userId, id)` — used only by this task's routes.

- [ ] **Step 1: Write the applications data-access module**

```ts
// src/lib/db/applications.ts
import { prisma } from '@/lib/prisma';
import { ApplicationRecord, ApplicationStatus } from '@/lib/types';
import type { Application as PrismaApplication } from '@prisma/client';

function toApplication(row: PrismaApplication): ApplicationRecord {
  return {
    id: row.id,
    jobId: row.jobId,
    status: row.status as ApplicationStatus,
    notes: row.notes,
    appliedAt: row.appliedAt?.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    interviewDate: row.interviewDate?.toISOString(),
    offerAmount: row.offerAmount ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
  };
}

export async function getApplicationsForUser(userId: string): Promise<ApplicationRecord[]> {
  const rows = await prisma.application.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return rows.map(toApplication);
}

// Upsert (not create) keyed on [userId, jobId]: the schema enforces one application
// row per job per user, so re-bookmarking/re-quick-applying to the same job updates
// its existing kanban row instead of erroring on a unique-constraint violation.
export async function upsertApplication(
  userId: string,
  input: { jobId: string; status?: ApplicationStatus; notes?: string }
): Promise<ApplicationRecord> {
  const now = new Date();
  const row = await prisma.application.upsert({
    where: { userId_jobId: { userId, jobId: input.jobId } },
    create: {
      userId,
      jobId: input.jobId,
      status: input.status ?? 'bookmarked',
      notes: input.notes ?? '',
      appliedAt: input.status === 'applied' ? now : null,
    },
    update: {
      status: input.status ?? 'bookmarked',
      appliedAt: input.status === 'applied' ? now : undefined,
    },
  });
  return toApplication(row);
}

export async function updateApplication(
  userId: string,
  id: string,
  patch: Partial<ApplicationRecord>
): Promise<ApplicationRecord | null> {
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const row = await prisma.application.update({
    where: { id },
    data: {
      status: patch.status,
      notes: patch.notes,
      interviewDate: patch.interviewDate ? new Date(patch.interviewDate) : undefined,
      offerAmount: patch.offerAmount,
      rejectionReason: patch.rejectionReason,
      appliedAt: patch.status === 'applied' && !existing.appliedAt ? new Date() : undefined,
    },
  });
  return toApplication(row);
}

export async function deleteApplication(userId: string, id: string): Promise<boolean> {
  const result = await prisma.application.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
```

- [ ] **Step 2: Update `src/app/api/applications/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getApplicationsForUser, upsertApplication } from '@/lib/db/applications';
import { ApplicationStatus } from '@/lib/types';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const applications = await getApplicationsForUser(session.user.id);
    return NextResponse.json(applications);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const app = await upsertApplication(session.user.id, {
      jobId: body.jobId,
      status: (body.status as ApplicationStatus) || 'bookmarked',
      notes: body.notes || '',
    });
    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update `src/app/api/applications/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateApplication, deleteApplication } from '@/lib/db/applications';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const updated = await updateApplication(session.user.id, params.id, body);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const deleted = await deleteApplication(session.user.id, params.id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 0 errors.

```bash
PORT=3010 npm run dev &
sleep 4
JOB_ID=$(curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/jobs | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).jobs[0].id))")

APP=$(curl -s -b /tmp/jobradar-cookies.txt -X POST http://localhost:3010/api/applications \
  -H 'Content-Type: application/json' -d "{\"jobId\":\"$JOB_ID\",\"status\":\"bookmarked\"}")
echo "$APP"
APP_ID=$(echo "$APP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")

curl -s -b /tmp/jobradar-cookies.txt -X PATCH http://localhost:3010/api/applications/$APP_ID \
  -H 'Content-Type: application/json' -d '{"status":"applied"}'

curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/applications
```
Expected: the POST returns `201` with a `bookmarked` application; the PATCH returns `200` with `status: "applied"` and a populated `appliedAt`; the final GET lists it.

```bash
curl -s -b /tmp/jobradar-cookies.txt -X DELETE http://localhost:3010/api/applications/$APP_ID
curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/applications
```
Expected: `{"success":true}` then an empty array.

Stop the dev server (`kill %1`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/applications.ts src/app/api/applications
git commit -m "feat: migrate applications domain to Prisma with per-user scoping"
```

---

### Task 7: Alerts domain → Prisma

**Files:**
- Create: `src/lib/db/alerts.ts`
- Modify: `src/app/api/alerts/route.ts`

**Interfaces:**
- Consumes: `prisma` (Task 1), `auth` (Task 2).
- Produces: `getAlertsForUser`, `createAlert`, `updateAlert`, `deleteAlert` — used only by this task's route.

- [ ] **Step 1: Write the alerts data-access module**

```ts
// src/lib/db/alerts.ts
import { prisma } from '@/lib/prisma';
import { AlertConfig } from '@/lib/types';
import type { Alert as PrismaAlert } from '@prisma/client';

function toAlert(row: PrismaAlert): AlertConfig {
  return {
    id: row.id,
    name: row.name,
    keywords: row.keywords,
    excludeKeywords: row.excludeKeywords,
    locations: row.locations,
    remote: row.remote as AlertConfig['remote'],
    experienceLevels: row.experienceLevels as AlertConfig['experienceLevels'],
    industries: row.industries as AlertConfig['industries'],
    minSalary: row.minSalary ?? undefined,
    maxSalary: row.maxSalary ?? undefined,
    sources: row.sources as AlertConfig['sources'],
    frequency: row.frequency as AlertConfig['frequency'],
    isActive: row.isActive,
    lastTriggered: row.lastTriggered?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAlertsForUser(userId: string): Promise<AlertConfig[]> {
  const rows = await prisma.alert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return rows.map(toAlert);
}

export async function createAlert(userId: string, input: Omit<AlertConfig, 'id' | 'createdAt'>): Promise<AlertConfig> {
  const row = await prisma.alert.create({
    data: {
      userId,
      name: input.name,
      keywords: input.keywords,
      excludeKeywords: input.excludeKeywords,
      locations: input.locations,
      remote: input.remote,
      experienceLevels: input.experienceLevels,
      industries: input.industries,
      minSalary: input.minSalary,
      maxSalary: input.maxSalary,
      sources: input.sources,
      frequency: input.frequency,
      isActive: input.isActive,
    },
  });
  return toAlert(row);
}

export async function updateAlert(
  userId: string,
  id: string,
  patch: Partial<AlertConfig>
): Promise<AlertConfig | null> {
  const existing = await prisma.alert.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const row = await prisma.alert.update({
    where: { id },
    data: {
      name: patch.name,
      keywords: patch.keywords,
      excludeKeywords: patch.excludeKeywords,
      locations: patch.locations,
      remote: patch.remote,
      experienceLevels: patch.experienceLevels,
      industries: patch.industries,
      minSalary: patch.minSalary,
      maxSalary: patch.maxSalary,
      sources: patch.sources,
      frequency: patch.frequency,
      isActive: patch.isActive,
    },
  });
  return toAlert(row);
}

export async function deleteAlert(userId: string, id: string): Promise<boolean> {
  const result = await prisma.alert.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
```

- [ ] **Step 2: Update `src/app/api/alerts/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAlertsForUser, createAlert, updateAlert, deleteAlert } from '@/lib/db/alerts';
import { AlertConfig } from '@/lib/types';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const alerts = await getAlertsForUser(session.user.id);
  return NextResponse.json(alerts);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const alert = await createAlert(session.user.id, {
      name: body.name || 'New Alert',
      keywords: body.keywords || [],
      excludeKeywords: body.excludeKeywords || [],
      locations: body.locations || [],
      remote: body.remote || ['remote'],
      experienceLevels: body.experienceLevels || ['mid', 'senior'],
      industries: body.industries || ['tech'],
      minSalary: body.minSalary,
      maxSalary: body.maxSalary,
      sources: body.sources || ['remotive'],
      frequency: body.frequency || '30min',
      isActive: body.isActive ?? true,
    });
    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const updated = await updateAlert(session.user.id, body.id, body as Partial<AlertConfig>);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleted = await deleteAlert(session.user.id, id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 0 errors.

```bash
PORT=3010 npm run dev &
sleep 4
ALERT=$(curl -s -b /tmp/jobradar-cookies.txt -X POST http://localhost:3010/api/alerts \
  -H 'Content-Type: application/json' -d '{"name":"Test Alert","keywords":["react"]}')
echo "$ALERT"
ALERT_ID=$(echo "$ALERT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")

curl -s -b /tmp/jobradar-cookies.txt -X PATCH http://localhost:3010/api/alerts \
  -H 'Content-Type: application/json' -d "{\"id\":\"$ALERT_ID\",\"isActive\":false}"

curl -s -b /tmp/jobradar-cookies.txt "http://localhost:3010/api/alerts?id=$ALERT_ID" -X DELETE
curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/alerts
```
Expected: create returns `201`; patch returns `200` with `isActive: false`; delete returns `{"success":true}`; final GET no longer includes it.

Stop the dev server (`kill %1`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/alerts.ts src/app/api/alerts
git commit -m "feat: migrate alerts domain to Prisma with per-user scoping"
```

---

### Task 8: Profile domain → Prisma, remove `store.ts`

**Files:**
- Modify: `src/lib/db/users.ts` (add `updateUserProfile`)
- Modify: `src/app/api/profile/route.ts`
- Modify: `src/app/api/profile/upload/route.ts`
- Delete: `src/lib/store.ts`
- Modify: `src/lib/types.ts` (remove the now-unused `StoreData` interface)

**Interfaces:**
- Consumes: `getUserProfile` (Task 5), `prisma`, `auth`.
- Produces: `updateUserProfile(userId, profile)` on `src/lib/db/users.ts`.

By this task, every consumer of `src/lib/store.ts` (confirmed via `grep -rln "from '@/lib/store'" src/` at plan-writing time: `jobs/route.ts`, `jobs/[id]/route.ts`, `applications/route.ts`, `applications/[id]/route.ts`, `alerts/route.ts`, `stats/route.ts`, `events/route.ts`, `profile/route.ts`, `profile/upload/route.ts`, `aggregator.ts`) will have been migrated except the two profile routes this task handles — so this task both finishes the migration and deletes the now-dead file.

- [ ] **Step 1: Add `updateUserProfile` to the users data-access module**

Append to `src/lib/db/users.ts`:
```ts
import { ResumeProfile } from '@/lib/types'; // already imported at the top of this file — do not duplicate the import

export async function updateUserProfile(
  userId: string,
  profile: Partial<ResumeProfile>
): Promise<ResumeProfile | null> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      skills: profile.skills,
      titles: profile.titles,
      experienceYears: profile.experienceYears,
      experienceLevel: profile.experienceLevel,
      preferredLocations: profile.preferredLocations,
      preferredRemote: profile.preferredRemote,
      preferredIndustries: profile.preferredIndustries,
      preferredJobTypes: profile.preferredJobTypes,
      targetSalaryMin: profile.targetSalaryMin,
      targetSalaryMax: profile.targetSalaryMax,
      resumeText: profile.resumeText,
      profileUpdatedAt: new Date(),
    },
  });
  return getUserProfile(userId);
}
```
(The `import { ResumeProfile } ...` line above is a note, not a second import statement — `src/lib/db/users.ts` already imports `ResumeProfile` from Task 5's Step 2. Just append the `updateUserProfile` function itself.)

- [ ] **Step 2: Update `src/app/api/profile/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserProfile, updateUserProfile } from '@/lib/db/users';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await getUserProfile(session.user.id);
  return NextResponse.json(profile);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const profile = await updateUserProfile(session.user.id, {
      skills: body.skills || [],
      titles: body.titles || [],
      experienceYears: body.experienceYears || 0,
      experienceLevel: body.experienceLevel || 'mid',
      preferredLocations: body.preferredLocations || [],
      preferredRemote: body.preferredRemote || ['remote'],
      preferredIndustries: body.preferredIndustries || ['tech'],
      preferredJobTypes: body.preferredJobTypes || ['full-time'],
      targetSalaryMin: body.targetSalaryMin,
      targetSalaryMax: body.targetSalaryMax,
      resumeText: body.resumeText,
    });
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
```
(The old "re-score all jobs" block is gone entirely — scoring is computed at read time in `/api/jobs`/`/api/stats` now, so saving a profile no longer needs to touch any job rows.)

- [ ] **Step 3: Update `src/app/api/profile/upload/route.ts`**

Replace the `saveProfile` import/call and add auth:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateUserProfile } from '@/lib/db/users';
import { ResumeProfile } from '@/lib/types';
import { COMMON_SKILLS } from '@/config/defaults';

// ── extractSkills / extractExperienceYears / inferExperienceLevel / extractTitles: unchanged ──

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const skills = extractSkills(text);
    const experienceYears = extractExperienceYears(text);
    const experienceLevel = inferExperienceLevel(experienceYears);
    const titles = extractTitles(text);

    const profile = await updateUserProfile(session.user.id, {
      skills: skills.length > 0 ? skills : ['JavaScript', 'Python', 'React'],
      titles: titles.length > 0 ? titles : ['Software Engineer'],
      experienceYears,
      experienceLevel,
      preferredLocations: ['Remote'],
      preferredRemote: ['remote', 'hybrid'],
      preferredIndustries: ['tech'],
      preferredJobTypes: ['full-time'],
      resumeText: text.slice(0, 5000),
    });

    return NextResponse.json({
      profile,
      extracted: { skills, titles, experienceYears, experienceLevel, wordCount: text.split(/\s+/).length },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to parse resume' }, { status: 500 });
  }
}
```
(Keep the existing `extractSkills`/`extractExperienceYears`/`inferExperienceLevel`/`extractTitles` function bodies exactly as they are in the current file — only the imports and the `POST` handler body change.)

- [ ] **Step 4: Delete the old store and its now-dead type**

```bash
rm src/lib/store.ts
```

In `src/lib/types.ts`, delete the `StoreData` interface (the `─── Store Shape ───` section) — it has no remaining consumers once `store.ts` is gone.

- [ ] **Step 5: Verify**

Run: `grep -rn "from '@/lib/store'" src/`
Expected: no output (nothing references the deleted file).

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 0 errors.

```bash
PORT=3010 npm run dev &
sleep 4
curl -s -b /tmp/jobradar-cookies.txt -X POST http://localhost:3010/api/profile \
  -H 'Content-Type: application/json' \
  -d '{"skills":["TypeScript","React"],"titles":["Frontend Engineer"],"experienceLevel":"senior","experienceYears":6}'
curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/profile
```
Expected: both return the updated profile with `skills: ["TypeScript","React"]`, `experienceLevel: "senior"`.

```bash
curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/jobs | node -e "
  let d=''; process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => console.log('score after profile update:', JSON.parse(d).jobs[0]?.relevanceScore));
"
```
Expected: a relevance score reflecting the new profile (confirms query-time scoring picks up the just-saved profile immediately, with no separate rescore step).

Stop the dev server (`kill %1`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/users.ts src/app/api/profile src/lib/types.ts
git rm src/lib/store.ts
git commit -m "feat: migrate profile domain to Prisma, remove file-based store"
```

---

### Task 9: Stats route → per-user + global mix

**Files:**
- Modify: `src/app/api/stats/route.ts`

**Interfaces:**
- Consumes: `getAllJobs`/`toJob` (Task 5), `getApplicationsForUser` (Task 6), `getUserProfile` (Task 5), `scoreJobs` (unchanged), `auth` (Task 2).

Jobs are global — `totalJobs`, `newToday`, `topSkills`, `jobsBySource`, `jobsByIndustry` reflect the whole shared pool. Applications, match rate, and the recent-high-score list are inherently per-user.

- [ ] **Step 1: Rewrite the route**

```ts
// src/app/api/stats/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllJobs, toJob } from '@/lib/db/jobs';
import { getApplicationsForUser } from '@/lib/db/applications';
import { getUserProfile } from '@/lib/db/users';
import { scoreJobs } from '@/lib/scorer';
import { DashboardStats, ApplicationStatus } from '@/lib/types';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = session.user.id;
    const rows = await getAllJobs();
    const rawJobs = rows.map(row => toJob(row, { relevanceScore: 0, isNew: false }));
    const profile = await getUserProfile(userId);
    const jobs = scoreJobs(rawJobs, profile);
    const applications = await getApplicationsForUser(userId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const newToday = jobs.filter(j => new Date(j.postedAt).getTime() >= todayStart).length;
    const applied = applications.filter(a => a.status === 'applied').length;
    const interviewing = applications.filter(a => a.status === 'interviewing').length;
    const highScoreJobs = jobs.filter(j => j.relevanceScore >= 60).length;
    const matchRate = jobs.length > 0 ? Math.round((highScoreJobs / jobs.length) * 100) : 0;

    const skillCount = new Map<string, number>();
    for (const job of jobs) {
      for (const skill of job.skills) {
        skillCount.set(skill, (skillCount.get(skill) ?? 0) + 1);
      }
    }
    const topSkills = Array.from(skillCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    const sourceCount = new Map<string, number>();
    for (const job of jobs) {
      sourceCount.set(job.source, (sourceCount.get(job.source) ?? 0) + 1);
    }
    const jobsBySource = Array.from(sourceCount.entries()).map(([source, count]) => ({ source, count }));

    const industryCount = new Map<string, number>();
    for (const job of jobs) {
      industryCount.set(job.industry, (industryCount.get(job.industry) ?? 0) + 1);
    }
    const jobsByIndustry = Array.from(industryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([industry, count]) => ({ industry, count }));

    const statusOrder: ApplicationStatus[] = ['bookmarked', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'];
    const statusCount = new Map<ApplicationStatus, number>();
    for (const a of applications) {
      statusCount.set(a.status, (statusCount.get(a.status) ?? 0) + 1);
    }
    const applicationFunnel = statusOrder
      .filter(s => statusCount.has(s))
      .map(s => ({ status: s, count: statusCount.get(s) ?? 0 }));

    const recentHighScoreJobs = jobs
      .filter(j => j.relevanceScore >= 70)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    const stats: DashboardStats = {
      totalJobs: jobs.length,
      newToday,
      applied,
      interviewing,
      matchRate,
      topSkills,
      jobsBySource,
      jobsByIndustry,
      applicationFunnel,
      recentHighScoreJobs,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API:stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 0 errors.

```bash
PORT=3010 npm run dev &
sleep 4
curl -s -b /tmp/jobradar-cookies.txt http://localhost:3010/api/stats
```
Expected: `200` with a populated `DashboardStats` object — `totalJobs` > 0, `topSkills`/`jobsBySource`/`jobsByIndustry` non-empty.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3010/api/stats
```
Expected: `401` (no cookie jar — confirms the route now requires auth, where it previously required none).

Stop the dev server (`kill %1`).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stats
git commit -m "feat: scope dashboard stats to the requesting user, keep job pool global"
```

---

### Task 10: Account page, sign-out, nav wiring

**Files:**
- Create: `src/app/api/account/password/route.ts`
- Create: `src/app/api/account/route.ts`
- Create: `src/app/account/page.tsx`
- Modify: `src/config/nav.ts` (add an "Account" entry)
- Modify: `src/components/Sidebar.tsx` (add a sign-out button)
- Modify: `src/components/MobileNav.tsx` (add a sign-out button)

**Interfaces:**
- Consumes: `auth`, `signOut` (server, from `@/lib/auth` — not used directly here since sign-out is client-triggered via `next-auth/react`'s `signOut`), `prisma`.

The existing `/profile` page (job-matching preferences: skills, titles, salary — already migrated to per-user storage in Task 8) stays as-is; `/account` is specifically for login/security identity, matching the spec's "profile settings, change password, delete account" scope while avoiding a redundant rebuild of the preferences UI that already exists.

- [ ] **Step 1: Write the change-password route**

```ts
// src/app/api/account/password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API:account/password] Error:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the delete-account route**

```ts
// src/app/api/account/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API:account] Error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Write the account page**

```tsx
// src/app/account/page.tsx
'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { KeyRound, Trash2, LogOut } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function AccountPage() {
  const { data: session } = useSession();
  const { success, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || 'Failed to change password');
        return;
      }
      success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await fetch('/api/account', { method: 'DELETE' });
      await signOut({ callbackUrl: '/login' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="page-header pb-6">
        <h1 className="text-2xl font-bold text-white">Account</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your login and security settings</p>
      </div>

      <div className="p-8 max-w-xl space-y-6">
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Signed in as</h2>
          <p className="text-sm text-slate-300">{session?.user?.name || '—'}</p>
          <p className="text-xs text-slate-500 mt-1">{session?.user?.email}</p>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-secondary mt-4 text-xs">
            <LogOut size={13} /> Sign out
          </button>
        </div>

        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <KeyRound size={15} /> Change Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="label-text">Current password</label>
              <input
                type="password"
                required
                className="input-field"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label-text">New password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input-field"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={passwordSaving} className="btn-primary text-xs">
              {passwordSaving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </div>

        <div className="glass-card-static p-6 border border-rose-500/20">
          <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Trash2 size={15} className="text-rose-400" /> Delete Account
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Permanently deletes your account and all your bookmarks, applications, and alerts. This cannot be undone.
          </p>
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <button onClick={handleDeleteAccount} disabled={deleting} className="btn-danger text-xs">
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button onClick={() => setConfirmingDelete(false)} className="btn-ghost text-xs">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmingDelete(true)} className="btn-danger text-xs">
              Delete account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add "Account" to the shared nav list**

In `src/config/nav.ts`, add `Settings` (or another appropriate icon) to the `lucide-react` import and append an entry to `navItems`:
```ts
import {
  LayoutDashboard, Briefcase, KanbanSquare, Bell, User, BarChart3, Settings,
} from 'lucide-react';

// ... NavItem interface unchanged ...

export const navItems: NavItem[] = [
  { href: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/jobs',          label: 'Job Board',     icon: Briefcase },
  { href: '/applications',  label: 'Applications',  icon: KanbanSquare },
  { href: '/alerts',        label: 'Alerts',        icon: Bell },
  { href: '/profile',       label: 'My Profile',    icon: User },
  { href: '/analytics',     label: 'Analytics',     icon: BarChart3 },
  { href: '/account',       label: 'Account',       icon: Settings },
];
```

- [ ] **Step 5: Add a sign-out button to `Sidebar.tsx`**

Add the import `import { signOut } from 'next-auth/react';` and `LogOut` to the existing `lucide-react` import, then add a sign-out button in the sidebar's footer area (near the existing "Scan Now" button block):
```tsx
<button
  onClick={() => signOut({ callbackUrl: '/login' })}
  className="btn-ghost w-full justify-center text-xs mt-2"
>
  <LogOut size={14} /> Sign out
</button>
```

- [ ] **Step 6: Add the same sign-out button to `MobileNav.tsx`**

Inside the drawer's `<nav>` block, after the mapped `navItems` links, add:
```tsx
<button
  onClick={() => signOut({ callbackUrl: '/login' })}
  className="nav-item w-full text-left"
>
  <LogOut size={18} />
  <span>Sign out</span>
</button>
```
Add the `signOut` import from `next-auth/react` and `LogOut` from `lucide-react` to this file's imports.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 0 errors.

```bash
PORT=3010 npm run dev &
sleep 4
curl -s -b /tmp/jobradar-cookies.txt -X PATCH http://localhost:3010/api/account/password \
  -H 'Content-Type: application/json' -d '{"currentPassword":"wrongpass","newPassword":"newpass1234"}'
```
Expected: `400` with `"Current password is incorrect"`.

```bash
curl -s -b /tmp/jobradar-cookies.txt -X PATCH http://localhost:3010/api/account/password \
  -H 'Content-Type: application/json' -d '{"currentPassword":"testpass123","newPassword":"newpass1234"}'
```
Expected: `200` with `{"success":true}`.

Repeat Task 4's login curl sequence (fresh CSRF token + cookie jar) with the NEW password (`newpass1234`) instead of `testpass123`.
Expected: login still succeeds — confirms the password change took effect.

Stop the dev server (`kill %1`). Do not run the delete-account verification yet — the same test user (`test1@example.com`) is reused by Task 13's full end-to-end pass, which explicitly covers delete-account at the very end.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/account src/app/account src/config/nav.ts src/components/Sidebar.tsx src/components/MobileNav.tsx
git commit -m "feat: add account page with password change, delete account, and sign-out"
```

---

### Task 11: Forgot password / reset password (Resend)

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/app/api/account/forgot-password/route.ts`
- Create: `src/app/api/account/reset-password/route.ts`
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/app/reset-password/page.tsx`
- Modify: `.env.example` (RESEND_API_KEY, RESEND_FROM_EMAIL)

**Interfaces:**
- Consumes: `prisma` (Task 1).
- Produces: `sendPasswordResetEmail(to, resetUrl)` — used only by the forgot-password route.

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Write the email helper (with a dev/no-key fallback)**

```ts
// src/lib/email.ts
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || 'Job Radar <onboarding@resend.dev>';

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — password reset link for ${to}: ${resetUrl}`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Job Radar password',
    html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}
```

- [ ] **Step 3: Write the forgot-password route**

```ts
// src/app/api/account/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

    // Always return success, regardless of whether the email is registered —
    // don't let this endpoint be used to enumerate accounts.
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API:account/forgot-password] Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Write the reset-password route**

```ts
// src/app/api/account/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API:account/reset-password] Error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Write the forgot-password page**

```tsx
// src/app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Radar } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/account/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card-static p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <Radar size={20} className="text-radar-accent" />
          <span className="text-sm font-bold text-white">Job Radar</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-slate-400 mt-4">
            If an account exists for that email, a reset link has been sent.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-6">We'll email you a link to reset it.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Email</label>
                <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
        <p className="text-xs text-slate-500 mt-4 text-center">
          <Link href="/login" className="text-radar-accent">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write the reset-password page**

```tsx
// src/app/reset-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Radar } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card-static p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <Radar size={20} className="text-radar-accent" />
          <span className="text-sm font-bold text-white">Job Radar</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Set a new password</h1>
        {done ? (
          <p className="text-sm text-slate-400 mt-4">Password updated — redirecting to login…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="label-text">New password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input-field"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}
        <p className="text-xs text-slate-500 mt-4 text-center">
          <Link href="/login" className="text-radar-accent">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Add the new env vars to `.env.example`**

```
# ── Resend (optional, for password-reset emails) ──────────────────────────────
# Free signup at: https://resend.com — without this, reset links are logged to
# the server console instead of emailed.
RESEND_API_KEY=
RESEND_FROM_EMAIL=Job Radar <onboarding@resend.dev>
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 0 errors.

```bash
PORT=3010 npm run dev > /tmp/jobradar-dev.log 2>&1 &
sleep 4
curl -s -X POST http://localhost:3010/api/account/forgot-password \
  -H 'Content-Type: application/json' -d '{"email":"test1@example.com"}'
grep "password reset link for test1@example.com" /tmp/jobradar-dev.log
```
Expected: the curl returns `{"success":true}`; the dev-server log contains a line with a `token=...` URL (no `RESEND_API_KEY` is set locally, so the dev fallback logs it instead of emailing).

```bash
TOKEN=$(grep "password reset link for test1@example.com" /tmp/jobradar-dev.log | tail -1 | sed -n 's/.*token=\([a-f0-9]*\).*/\1/p')
curl -s -X POST http://localhost:3010/api/account/reset-password \
  -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN\",\"newPassword\":\"resetpass123\"}"

# Reusing the same token again must fail (single-use)
curl -s -X POST http://localhost:3010/api/account/reset-password \
  -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN\",\"newPassword\":\"anotherpass123\"}"
```
Expected: the first call returns `{"success":true}`; the second returns `400` ("invalid or has expired") — confirms single-use enforcement.

Verify login now works with `resetpass123` (repeat Task 4's CSRF+cookie-jar login sequence).

Stop the dev server (`kill %1`).

- [ ] **Step 9: Commit**

```bash
git add src/lib/email.ts src/app/api/account/forgot-password src/app/api/account/reset-password src/app/forgot-password src/app/reset-password .env.example package.json package-lock.json
git commit -m "feat: add forgot-password/reset-password flow via Resend"
```

---

### Task 12: Deployment configuration

**Files:**
- Modify: `Dockerfile`
- Modify: `fly.toml`
- Modify: `railway.toml`
- Create: `src/app/api/health/route.ts`
- Modify: `src/lib/auth.config.ts` (add `/api/health` to public paths — already present from Task 2's Step 1; verify, don't duplicate)

**Interfaces:** none — this task only touches deployment plumbing and one trivial new route.

`railway.toml`'s `healthcheckPath` currently points at `/api/stats`, which Task 9 made auth-required — an unauthenticated healthcheck request would now get `401` and Railway would think the deploy is unhealthy. This task adds a real public healthcheck endpoint and repoints it there.

- [ ] **Step 1: Add the health check route**

```ts
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
```

- [ ] **Step 2: Confirm it's already public in the middleware config**

Open `src/lib/auth.config.ts` and confirm `PUBLIC_PATHS` already includes `'/api/health'` (it was added in Task 2, Step 1). If it's missing for any reason, add it now.

- [ ] **Step 3: Update the Dockerfile for Prisma migrations**

Replace `Dockerfile` in full:
```dockerfile
# ─── Job Radar — Dockerfile ───────────────────────────────────────────────────
# Multi-stage build for minimal production image

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema/migrations + the CLI itself, needed to run migrations at container start
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```
(Dropped the old `RUN mkdir -p /app/data && chown nextjs:nodejs /app/data` line — that directory backed the now-removed file store and has no remaining purpose.)

- [ ] **Step 4: Remove the now-unused data volume from `fly.toml`**

In `fly.toml`, delete the `[mounts]` block:
```toml
[mounts]
  source = "job_radar_data"
  destination = "/app/data"
```

- [ ] **Step 5: Update `railway.toml`**

Replace `railway.toml` in full:
```toml
# Railway deployment config
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npx prisma migrate deploy && npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```
(Dropped the `[[volumes]]` block for the same reason as `fly.toml`.)

- [ ] **Step 6: Verify with a real Docker build**

```bash
docker build -t job-radar-test .
```
Expected: the build completes successfully through all three stages (this does not require a live `DATABASE_URL` — `npm run build`'s Next.js build doesn't hit the database, and the `prisma migrate deploy` in `CMD` only runs at container start, not at build time).

Optionally, confirm the container starts and the migration step runs against the local dev database:
```bash
docker run --rm -e DATABASE_URL="postgresql://yashvardhan@host.docker.internal:5432/job_radar_dev" \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -e NEXTAUTH_URL="http://localhost:3020" \
  -p 3020:3000 job-radar-test &
sleep 5
curl -s http://localhost:3020/api/health
```
Expected: `{"status":"ok"}`. Stop the container afterward (`docker stop` on its container ID, findable via `docker ps`).

- [ ] **Step 7: Commit**

```bash
git add Dockerfile fly.toml railway.toml src/app/api/health
git commit -m "feat: wire Prisma migrations into deployment, add public healthcheck route"
```

---

### Task 13: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Static checks**

```bash
npx tsc --noEmit -p tsconfig.json && echo "TSC CLEAN"
npm run lint
npm run build
```
Expected: all three succeed. Watch for a live `npm run dev` sharing this same directory before running `npm run build` — stop it first if one is running, to avoid a `.next`-directory collision.

- [ ] **Step 2: Full end-to-end account lifecycle**

```bash
PORT=3010 npm run dev > /tmp/jobradar-dev.log 2>&1 &
sleep 4
rm -f /tmp/e2e-cookies.txt

# Signup
curl -s -X POST http://localhost:3010/api/auth/signup -H 'Content-Type: application/json' \
  -d '{"name":"E2E User","email":"e2e@example.com","password":"e2epassword1"}'

# Login (CSRF dance)
curl -s -c /tmp/e2e-cookies.txt http://localhost:3010/api/auth/csrf > /tmp/e2e-csrf.json
CSRF=$(node -e "console.log(require('/tmp/e2e-csrf.json').csrfToken)")
curl -s -b /tmp/e2e-cookies.txt -c /tmp/e2e-cookies.txt -X POST http://localhost:3010/api/auth/callback/credentials \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "email=e2e@example.com" --data-urlencode "password=e2epassword1" \
  --data-urlencode "csrfToken=$CSRF" --data-urlencode "json=true"

# Authenticated smoke test across every migrated route
curl -s -o /dev/null -w "GET  /                  %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/
curl -s -o /dev/null -w "GET  /api/jobs           %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/api/jobs
curl -s -o /dev/null -w "GET  /api/stats          %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/api/stats
curl -s -o /dev/null -w "GET  /api/applications   %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/api/applications
curl -s -o /dev/null -w "GET  /api/alerts         %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/api/alerts
curl -s -o /dev/null -w "GET  /api/profile        %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/api/profile
curl -s -o /dev/null -w "GET  /jobs               %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/jobs
curl -s -o /dev/null -w "GET  /applications       %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/applications
curl -s -o /dev/null -w "GET  /alerts             %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/alerts
curl -s -o /dev/null -w "GET  /profile            %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/profile
curl -s -o /dev/null -w "GET  /analytics          %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/analytics
curl -s -o /dev/null -w "GET  /account            %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/account
```
Expected: every line shows `200`.

```bash
# Unauthenticated requests must be rejected
curl -s -o /dev/null -w "GET  / (no cookie)       %{http_code}\n" http://localhost:3010/
curl -s -o /dev/null -w "GET  /api/jobs (no cookie) %{http_code}\n" http://localhost:3010/api/jobs
```
Expected: both `307`/`302` or `401` (page routes redirect via middleware; API routes return `401` from their own session check) — not `200`.

```bash
# Delete the account, then confirm the session no longer authorizes anything
curl -s -b /tmp/e2e-cookies.txt -X DELETE http://localhost:3010/api/account
curl -s -o /dev/null -w "GET /api/jobs after delete %{http_code}\n" -b /tmp/e2e-cookies.txt http://localhost:3010/api/jobs
```
Expected: the DELETE returns `{"success":true}`; the follow-up request returns `401` with the "Unauthorized" JSON, not stale job data. This is expected to pass cleanly: Task 2's `session` callback already checks user existence on every session read and strips `session.user` if the account no longer exists, so every route's existing `if (!session?.user)` guard rejects it without any route needing its own existence check. If this request unexpectedly returns `200`, that means the `session` callback's existence check (Task 2, Step 2) isn't wired correctly — go back and fix it there rather than patching individual routes.

Stop the dev server (`kill %1`).

- [ ] **Step 3: Confirm the pre-existing UI still renders against the new backend**

This repeats the same manual-browser-check limitation noted in the earlier Apple-design redesign work: if no browser-automation tool is available in this environment, note that explicitly rather than claiming it was checked, and ask the human partner to spot-check `/`, `/jobs`, `/applications`, `/alerts`, `/profile`, `/analytics`, `/account`, `/login`, `/signup` in an actual browser at `http://localhost:3010` (or whichever port is free) — particularly the kanban board's drag-and-drop (from the earlier redesign work) still functioning now that `PATCH /api/applications/[id]` is Prisma-backed.

- [ ] **Step 4: Final repo-wide sanity checks**

```bash
grep -rn "from '@/lib/store'" src/ && echo "FOUND — should be empty" || echo "CLEAN"
grep -rn "useMock\|'mock'" src/ && echo "FOUND — should be empty" || echo "CLEAN"
```
Expected: both report "CLEAN".

No commit for this task unless Step 2 surfaces a real gap in the `session` callback's existence check — in that case, fix it in `src/lib/auth.ts`, commit with a message describing the fix, and re-run this task's Step 2 before considering the plan complete.
