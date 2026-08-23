# Multi-Framework

A **multi-tenant SaaS website builder** built as a single **Astro SSR** application (Shopify / Wix model). One codebase powers both the **tenant admin dashboard** and **public tenant websites**.

Tenant admins sign in at a central login, edit their site (copy, images, gallery, theme) in `/admin`, and changes appear on their public URL at `/[tenant]`. Public pages are a generic rendering engine — content lives in a **SQLite file**, not in hardcoded components.

## Architecture

```
/login       →  authenticate (bcryptjs + session scoped to users.tenant_id)
/admin       →  self-service CMS (forms → API → tenant-scoped SQLite rows)
/[tenant]    →  public site (DB → HeroBlock, GalleryBlock, theme CSS variables)
```

| Layer | Stack |
|-------|--------|
| Framework | Astro 7 (SSR), `@astrojs/node` standalone |
| UI | Tailwind CSS v4, React islands (admin only) |
| Data | Drizzle ORM + **SQLite** (`better-sqlite3`, file `./data/sqlite.db`) |
| Auth | `bcryptjs` password hashes; middleware verifies user row |
| Validation | Zod at API and component boundaries |
| Tests | Vitest + in-memory SQLite (`npm test`) |

## Requirements

- **Node.js** ≥ 22.12.0
- **npm** 10+
- No separate database server

## Local development

Full walkthrough: **[docs/USAGE.md](docs/USAGE.md)** (setup, login, gallery, Docker, troubleshooting).  
Architecture: **[docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md)** (auth, SQLite model, admin → public data flow).

```bash
npm install
cp .env.example .env
npm run db:migrate   # or: npm run db:push
npm run seed         # Super Admin + Riverside demo
npm run dev
```

| URL | Description |
|-----|-------------|
| http://localhost:4321/login | `admin@riverside.example` / `password123` |
| http://localhost:4321/admin | Tenant dashboard |
| http://localhost:4321/riverside | Public tenant site |

SQLite file: `./data/sqlite.db` (gitignored). Override with `SQLITE_PATH`.

## Tests

```bash
npm test
```

Uses an in-memory SQLite database (no file). Covers invalid/valid login and tenant-scoped `site_content` queries.

## Production build

```bash
npm run build
npm start
```

## Docker (Proxmox LXC)

Mount volumes for the SQLite file and uploads so data survives rebuilds:

```bash
docker build -t multi-framework:latest .
docker run -d -p 4321:4321 \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/public/uploads:/app/public/uploads" \
  --env-file .env \
  multi-framework:latest
```

Run migrate + seed once against the mounted data directory (or bake a first-boot script).

## Database

```bash
npm run db:generate   # after schema changes
npm run db:migrate
npm run db:seed
```

Schema: `src/db/schema.ts` — every tenant-owned query filters by `tenant_id`.

## Project structure

```
src/
  pages/login.astro          # Central login
  pages/admin/               # Tenant CMS
  pages/[tenant]/            # Public renderer
  pages/api/auth|admin/      # Server mutations
  components/public/blocks/  # Generic Astro blocks
  components/admin/          # React form islands
  db/                        # SQLite schema, client, migrations, seed
  services/                  # Tenant-scoped data access
  lib/                       # Auth, DB helpers, Zod, theme, uploads
data/sqlite.db               # Local DB file (created by migrate)
tests/                       # Vitest (auth + db isolation)
```

## License

Private / internal — confirm with repository owner before redistribution.
