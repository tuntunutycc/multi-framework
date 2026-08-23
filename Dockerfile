# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1 — Build: install dependencies and build the Astro SSR bundle
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# better-sqlite3 needs native build toolchain on Alpine
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Stage 2 — Runner: production image with node_modules + dist
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
ENV SQLITE_PATH=/app/data/sqlite.db
ENV UPLOADS_DIR=/app/public/uploads

RUN apk add --no-cache libc6-compat \
  && addgroup -g 1001 -S nodejs \
  && adduser -S astro -u 1001 -G nodejs

COPY --from=builder --chown=astro:nodejs /app/package.json ./
COPY --from=builder --chown=astro:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/src/db/migrations ./src/db/migrations

RUN mkdir -p /app/data /app/public/uploads \
  && chown -R astro:nodejs /app/data /app/public

# Persist SQLite + uploads via bind mounts / named volumes at runtime:
#   -v ./data:/app/data
#   -v ./public/uploads:/app/public/uploads
# Schema + seed are applied on the host (or a one-off job) before first boot:
#   npm run db:push && npm run seed
# The production image does not include tsx/drizzle-kit.
VOLUME ["/app/data", "/app/public/uploads"]

USER astro

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
