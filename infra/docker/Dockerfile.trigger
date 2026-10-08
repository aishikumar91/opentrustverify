# Thin wrapper so VPS compose can build from the monorepo root path style.
# Actual image build lives in open-trust/Dockerfile.
FROM node:20-alpine AS deps
WORKDIR /app
COPY open-trust/package.json open-trust/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY open-trust/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_BASE_PATH=/trigger
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_BASE_PATH=/trigger

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Seed script needs pg + bcryptjs outside the Next standalone bundle.
COPY open-trust/package.json open-trust/package-lock.json ./
RUN npm ci --omit=dev \
  && chown -R nextjs:nodejs /app/node_modules

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts/seed-admin.mjs ./scripts/seed-admin.mjs
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
