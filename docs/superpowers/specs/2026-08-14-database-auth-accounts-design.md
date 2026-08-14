# Database + Auth + Account Management — Design

Date: 2026-08-14

## Goal

Turn Job Radar from a single-user, file-backed tool into a proper multi-user app: real database, email/password authentication, and an account management page. This is sub-project 1 of a 4-part decomposition of a larger request ("remove mock data, add India/remote sources, real accounts + login"). The remaining sub-projects — India/remote job sources — build on top of this once it lands. Mock-data cleanup (removing the committed `data/store.json`, dead `mock` references) was trivial and already shipped directly to `main` (commit `4c28c6e`) ahead of this spec.

## Scope decisions (from brainstorming)

- **Database:** hosted Postgres, accessed via Prisma ORM. Chosen over SQLite-on-a-volume for clean multi-instance/concurrent-write behavior and because a managed Postgres (Neon/Supabase/Railway's Postgres add-on) needs no volume-mount changes to the existing Fly/Railway/Docker deploy setup — only a `DATABASE_URL` env var.
- **Auth:** Auth.js (NextAuth v5) with a Credentials provider (email + password, bcrypt-hashed), JWT session strategy. No OAuth/social login.
- **Account management page includes:** profile settings (the existing `ResumeProfile` fields, made per-user), change password, delete account, and a forgot-password/reset-via-email flow.
- **Email provider for password reset:** Resend.
- **Data migration:** none. The pre-existing single-user `data/store.json` content is not migrated — new accounts start empty. (The file itself was already removed from git tracking in the mock-data cleanup; a local/deployed copy may still exist on disk but is not read by anything after this change.)
- **Explicitly out of scope for this sub-project:** India/remote job sources (separate sub-project, built next), OAuth login, email verification on signup (only used for password reset), rate limiting / CAPTCHA on auth endpoints, "remember me" / multi-session management UI.

## 1. Data model (Prisma schema)

Replaces `data/store.json` / `StoreData` (`src/lib/types.ts`) with these Prisma models. Existing TypeScript interfaces (`Job`, `ApplicationRecord`, `AlertConfig`, `ResumeProfile`) map closely — field names below intentionally mirror them so the rest of the codebase (scorer, deduplicator, source fetchers) doesn't need to change its own shape assumptions, only its persistence calls.

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  name            String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Resume profile fields (was the singleton ResumeProfile) — one row per user, not a separate table,
  // since it's always a 1:1 and always loaded/saved together with the user.
  skills               String[] @default([])
  titles               String[] @default([])
  experienceYears      Int?
  experienceLevel      String?  // ExperienceLevel
  preferredLocations   String[] @default([])
  preferredRemote      String[] @default([]) // RemoteType[]
  preferredIndustries  String[] @default([]) // Industry[]
  preferredJobTypes    String[] @default([]) // JobType[]
  targetSalaryMin      Int?
  targetSalaryMax      Int?
  resumeText           String?
  profileUpdatedAt     DateTime?

  applications    Application[]
  alerts          Alert[]
  resetTokens     PasswordResetToken[]
}

model PasswordResetToken {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String   @unique
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime @default(now())

  @@index([userId])
}

model Job {
  id                String   @id @default(cuid())
  title             String
  company           String
  companyLogo       String?
  description       String
  responsibilities  String[]
  requirements      String[]
  skills            String[]
  location          String
  remote            String   // RemoteType
  jobType           String   // JobType
  experienceLevel   String   // ExperienceLevel
  industry          String   // Industry
  salaryMin         Int?
  salaryMax         Int?
  salaryCurrency    String?
  salaryPeriod      String?
  applyUrl          String
  deadline          DateTime?
  postedAt          DateTime
  source            String   // JobSource
  sourceId          String?
  dedupeKey         String   @unique
  createdAt         DateTime @default(now())

  applications      Application[]

  @@index([postedAt])
  @@index([source])
}
```
(`relevanceScore` and `isNew`/`viewedAt` are dropped from the persisted `Job` shape — see §2. `isNew`/`viewedAt` become per-user concepts too: "have I seen this job" only makes sense per viewer. They move onto `Application`-adjacent per-user state — see the `JobView` model below. All enum-like fields — `remote`, `jobType`, `experienceLevel`, `industry`, `source`, `status`, `frequency` — are plain `String`/`String[]` rather than Prisma `enum`s, deliberately: the existing TypeScript union types in `src/lib/types.ts` already constrain these values at the application layer, and plain strings avoid a Prisma enum migration every time a source or status value is added — which sub-project 4 (more job sources) will do.)

```prisma
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
  status            String    // ApplicationStatus
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
  remote             String[]  // RemoteType[]
  experienceLevels   String[]  // ExperienceLevel[]
  industries         String[]  // Industry[]
  minSalary          Int?
  maxSalary          Int?
  sources            String[]  // JobSource[]
  frequency          String    // AlertFrequency
  isActive           Boolean   @default(true)
  lastTriggered      DateTime?
  createdAt          DateTime  @default(now())

  @@index([userId])
}

model ScanRecord {
  id         String    @id @default(cuid())
  timestamp  DateTime  @default(now())
  source     String    // JobSource
  jobsFound  Int
  newJobs    Int
  duration   Int
  error      String?
}
```

## 2. Relevance scoring moves to query time

Today, `runAggregation()` (`src/lib/aggregator.ts`) calls `scoreJobs(jobs, profile)` once against the single global profile and stores the result on each `Job`. With per-user profiles, a job's relevance is meaningless without knowing *whose* profile it's scored against, so:

- Aggregation (`runAggregation`) no longer scores jobs at all — it only fetches, dedupes, and upserts into the shared `Job` table.
- `GET /api/jobs` and `GET /api/stats` (the two endpoints that expose `relevanceScore` / use it for sorting or "match rate") compute it per request: load the requesting user's profile fields from `User`, run the existing `scoreJob`/`scoreJobs` (`src/lib/scorer.ts`, unchanged logic) over the fetched page of jobs, and attach the score in the response — never persisted.
- This is cheap: `scoreJob` is a pure in-memory function over a handful of fields, and it only needs to run over the page of jobs actually being returned (already paginated today), not the whole table.

## 3. Auth

- **Library:** `next-auth` v5 (Auth.js), Credentials provider, JWT session strategy (no separate sessions table — keeps the data model above sufficient).
- **Signup** (`POST /api/auth/signup`, new route — not part of Auth.js's own routes): validates email/password, hashes with bcrypt, creates a `User` row, returns success (client then signs in).
- **Login:** Auth.js's built-in `signIn('credentials', ...)` flow; the Credentials provider's `authorize()` callback looks up the `User` by email and compares the bcrypt hash.
- **Route protection:** Next.js middleware (`src/middleware.ts`, new file) checks for a valid session on every route except `/login`, `/signup`, `/forgot-password`, `/reset-password`, and the Auth.js API routes themselves; unauthenticated requests redirect to `/login`.
- **Session access in API routes:** existing routes (`/api/jobs`, `/api/applications`, `/api/applications/[id]`, `/api/alerts`, `/api/profile`, `/api/profile/upload`, `/api/stats`) read the session via Auth.js's server-side session helper to get `userId`, and scope every Prisma query to that user (`where: { userId }`) instead of the current global "just read the one store" behavior. `/api/jobs` and `/api/stats` additionally left-join each returned job against `JobView` for that `userId` to derive `isNew` (no matching `JobView` row) and `viewedAt`; viewing a job's detail (`GET /api/jobs/[id]`) upserts a `JobView` row for the current user (replaces today's `markJobViewed` in `src/lib/store.ts`). `/api/jobs/refresh` and `/api/events` stay global (aggregation and any live-event stream aren't per-user concerns).
- **Password change** (`POST /api/account/password`, new route): requires current password match, then updates `passwordHash`.
- **Forgot password** (`POST /api/account/forgot-password`, new route): generates a random token, stores its hash + expiry in `PasswordResetToken`, emails a reset link via Resend.
- **Reset password** (`POST /api/account/reset-password`, new route): validates the token (unexpired, unused), updates `passwordHash`, marks the token used.
- **Delete account** (`DELETE /api/account`, new route): deletes the `User` row; `onDelete: Cascade` on `Application`/`Alert`/`PasswordResetToken`/`JobView` relations removes the user's dependent data automatically. Shared `Job`/`ScanRecord` rows are untouched.

## 4. Pages

- `src/app/login/page.tsx` (new) — email/password form, link to `/signup` and `/forgot-password`.
- `src/app/signup/page.tsx` (new) — email/password/name form.
- `src/app/forgot-password/page.tsx` (new) — email input, triggers the reset email.
- `src/app/reset-password/page.tsx` (new) — reads a token from the URL query, new-password form.
- `src/app/account/page.tsx` (new) — profile settings form (reuses the existing profile-editing UI/fields from `src/app/profile/page.tsx` where sensible), change-password form, delete-account (with a confirmation step per the apple-design skill's "Agency" principle — destructive, irreversible action).
- `Sidebar.tsx`/`MobileNav.tsx` gain an "Account" nav entry and a sign-out action; existing pages are otherwise unchanged in look/feel — this sub-project is data-layer and auth, not a further visual redesign.

## 5. Deployment

- New env vars: `DATABASE_URL` (Postgres connection string), `NEXTAUTH_SECRET` (session signing), `NEXTAUTH_URL` (canonical app URL, needed by Auth.js), `RESEND_API_KEY`. Added to `.env.example`.
- `Dockerfile`: add a `prisma migrate deploy` step (or a release-phase command in `fly.toml`/`railway.toml`, whichever this project's existing deploy convention favors — determined at implementation time by reading those files) so schema migrations run on deploy, not on every container boot.
- `package.json`: new dependencies — `prisma`, `@prisma/client`, `next-auth`, `bcryptjs` (pure-JS, avoids native-module build issues in the Docker image), `resend`.

## 6. Testing

No automated test suite exists in this repo today (confirmed at the start of the Apple-design redesign work). Verification for this sub-project is: `npx tsc --noEmit`, `npm run lint`, `npm run build`, and manual verification of signup → login → account edit → password change → logout → forgot-password → reset → login-with-new-password → delete-account, plus confirming the existing jobs/applications/alerts pages still work end-to-end against the new per-user Prisma-backed routes.
