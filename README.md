# Multi-Framework

A **multi-tenant SaaS website builder** delivered as a single **Astro SSR** monolith. One codebase powers platform administration, per-tenant CMS dashboards, and public tenant websites — similar in product shape to Shopify or Wix, but self-hosted with a file-based SQLite database.

Tenant admins authenticate at a central `/login`, manage content in `/admin`, and publish to a public URL at `/{tenant-slug}`. All tenant copy, block data, and theme tokens live in **SQLite** (`site_content`, `tenants.theme_config`). Public pages are rendered by generic Astro block components — not hardcoded per industry.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | **Node.js** ≥ 22.12.0 |
| Framework | **Astro 7** (SSR), `@astrojs/node` standalone adapter |
| Admin UI | **React 19** islands (`client:load`) — gallery, about, features, contact editors |
| Public UI | **Astro** components (minimal client JS) |
| Styling | **Tailwind CSS v4** + tenant theme CSS variables |
| Database | **SQLite** via `better-sqlite3` + **Drizzle ORM** |
| Auth | **bcryptjs** password hashes, HTTP-only session cookie |
| Validation | **Zod** at API and block boundaries |
| Tests | **Vitest** + in-memory SQLite |
| Container | **Docker** multi-stage build (Node 22 Alpine) |

---

## Prerequisites

- **Node.js** ≥ 22.12.0 and **npm** 10+ (local development)
- **Docker** 24+ (optional; recommended for production / LXC deployments)
- No external database server — SQLite is a single file on disk

---

## Quick start

```bash
git clone https://github.com/tuntunutycc/multi-framework.git
cd multi-framework

npm install
cp .env.example .env

npm run db:push    # sync Drizzle schema → ./data/sqlite.db
npm run seed       # Super Admin + Riverside demo tenant
npm run dev        # http://localhost:4321
```

### Demo credentials (after seed)

| Role | Email | Password | Destination |
|------|-------|----------|-------------|
| Super Admin | `admin@mydomain.com` | `password123` | `/super-admin` |
| Tenant Admin | `admin@riverside.example` | `password123` | `/admin` → `/riverside` |

### Important `.env` note

Do **not** set `NODE_ENV=production` in `.env` while running `npm run dev`. That breaks React admin islands. Production sets `NODE_ENV=production` automatically via Docker or `npm start`.

---

## Application routes

```
/login          →  Central authentication (no admin chrome)
/super-admin    →  Platform owner: provision tenants
/admin          →  Tenant-scoped CMS (session tenant_id)
/{tenant-slug}  →  Public website (DB-driven blocks)
```

**Public homepage block order:** Hero → About → Features → Gallery → Contact (sections with content only).

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Astro development server |
| `npm run build` | Production SSR bundle → `dist/` |
| `npm start` | Run `node ./dist/server/entry.mjs` |
| `npm run db:push` | Push schema to SQLite (dev/provisioning) |
| `npm run db:migrate` | Apply SQL migrations from `src/db/migrations/` |
| `npm run db:generate` | Generate migration after `schema.ts` changes |
| `npm run seed` | Upsert Super Admin + Riverside demo data |
| `npm test` | Vitest (auth, tenant isolation, map embed helpers) |

---

## Documentation

| Document | Audience | Contents |
|----------|----------|----------|
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Developers & maintainers | Routing, database model, block pipeline, auth, uploads |
| **[docs/QA_DEPLOYMENT.md](docs/QA_DEPLOYMENT.md)** | QA & DevOps | Test scenarios, Docker deployment, volumes, env vars |
| [docs/QA_TESTING.md](docs/QA_TESTING.md) | QA (detailed) | Full manual test cases with pass matrix |
| [docs/USAGE.md](docs/USAGE.md) | Operators | Day-to-day usage, troubleshooting |

---

## Project structure

```
src/
  pages/
    login.astro                 # Central login
    admin/index.astro           # Tenant CMS dashboard
    super-admin/index.astro     # Platform tenant provisioning
    [tenant]/index.astro        # Public homepage renderer
    api/auth/                   # Login, logout
    api/admin/                  # Tenant-scoped mutations
    api/super-admin/            # Tenant creation (super admin only)
  components/
    admin/                      # React islands (GalleryEditor, AboutEditor, …)
    public/blocks/              # Generic Astro blocks (HeroBlock, …)
  db/                           # Drizzle schema, client, migrations, seed
  services/                     # Tenant-scoped data access
  lib/                          # Auth, DB helpers, Zod, theme, uploads
data/sqlite.db                  # SQLite file (gitignored; created by db:push)
public/uploads/                 # Tenant image uploads (gitignored)
tests/                          # Vitest
Dockerfile                      # Multi-stage production image
.env.example                    # Environment template
```

---

## Production & Docker (summary)

```bash
docker build -t multi-framework:latest .
docker run -d -p 4321:4321 \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/public/uploads:/app/public/uploads" \
  --env-file .env \
  multi-framework:latest
```

Run `npm run db:push` and `npm run seed` once against the mounted `./data` volume before first use. Full instructions: **[docs/QA_DEPLOYMENT.md](docs/QA_DEPLOYMENT.md)**.

---

## License

Private / internal — confirm with the repository owner before redistribution.
