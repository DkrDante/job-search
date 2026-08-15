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

# Standalone Next.js output only bundles node_modules actually traced from app code, which
# excludes the `prisma` CLI (a devDependency never imported at runtime). Install it in its
# own clean directory so its full, correctly-resolved dependency tree (and its
# node_modules/.bin/prisma symlink) can be copied into the runner as one intact tree.
FROM node:20-alpine AS prisma-cli
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-save --legacy-peer-deps prisma@6.19.3

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

# Prisma schema/migrations + the CLI itself (and its full dependency tree), needed to run
# migrations at container start. Copied as one directory tree (not cherry-picked files) so
# node_modules/.bin/prisma's symlink to ../prisma/build/index.js survives intact.
COPY --from=builder /app/prisma ./prisma
COPY --from=prisma-cli /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
