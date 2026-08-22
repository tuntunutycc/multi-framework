# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1 — install dependencies and build the Astro SSR bundle
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# libc6-compat helps native modules (e.g. sharp) build on Alpine
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2 — production runtime (dist + production node_modules only)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

RUN apk add --no-cache libc6-compat \
  && addgroup -g 1001 -S nodejs \
  && adduser -S astro -u 1001 -G nodejs

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=astro:nodejs /app/dist ./dist

USER astro

EXPOSE 4321

# @astrojs/node standalone entry (see package.json "start" script)
CMD ["node", "./dist/server/entry.mjs"]
