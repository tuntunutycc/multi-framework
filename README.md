# Multi-Framework

A **multi-tenant SaaS website builder** built as a single **Astro SSR** application (Shopify / Wix model). One codebase powers both the **tenant admin dashboard** and **public tenant websites**.

Tenant admins sign in at a central login, edit their site (copy, images, gallery, theme) in `/admin`, and changes appear on their public URL at `/[tenant]`. Public pages are a generic rendering engine — content lives in the database, not in hardcoded components.

## Architecture

```
/login       →  authenticate (session scoped to users.tenant_id)
/admin       →  self-service CMS (forms → API → tenant-scoped data)
/[tenant]    →  public site (DB → HeroBlock, GalleryBlock, theme CSS variables)
```

| Layer | Stack |
|-------|--------|
| Framework | Astro 7 (SSR), `@astrojs/node` standalone |
| UI | Tailwind CSS v4, React islands (admin only) |
| Data | Drizzle ORM schema (`tenants`, `users`, `site_content`) |
| Validation | Zod at API and component boundaries |

**Admin vs public:** Admin uses interactive forms and `/api/admin/*`. Public routes use pure Astro blocks with typed props only — no fetch, no tenant branching in UI.

## Current state

Implemented:

- Central `/login`, tenant dashboard `/admin`, public renderer `/[tenant]`
- Session-gated middleware for admin and API routes
- Generic blocks: `HeroBlock`, `GalleryBlock`
- Dynamic theming via CSS variables from tenant theme config
- Drizzle schema and tenant-scoped query helpers
- Multi-stage **Dockerfile** for production (Proxmox LXC)

In progress / demo mode:

- Runtime still uses an **in-memory store** for local development (Postgres wiring via `DATABASE_URL` is prepared but not required to run the demo)
- Scaffold login (any email/password) — real `users.password_hash` auth pending

## Requirements

- **Node.js** ≥ 22.12.0
- **npm** 10+

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Optional: copy env template (not required for the in-memory demo)
cp .env.example .env

# 3. Start dev server
npm run dev
```

Open:

| URL | Description |
|-----|-------------|
| http://localhost:4321/login | Central sign-in |
| http://localhost:4321/admin | Tenant dashboard (after login) |
| http://localhost:4321/riverside | Sample public tenant site |

## Production build

```bash
npm run build
npm start
# → node ./dist/server/entry.mjs (default PORT=4321)
```

## Docker (Proxmox LXC)

Designed for container deployment on **Proxmox LXC** with secrets injected at runtime (not baked into the image).

```bash
docker build -t multi-framework:latest .
docker run -d -p 4321:4321 --env-file .env multi-framework:latest
```

See `.env.example` for `DATABASE_URL`, `SESSION_SECRET`, `PUBLIC_SITE_URL`, and server settings.

## Database (optional)

When enabling Postgres:

```bash
cp .env.example .env
# Set DATABASE_URL, then:
npm run db:generate
npm run db:migrate
```

Schema: `src/db/schema.ts` — all tenant-owned rows include `tenant_id`.

## Project structure

```
src/
  pages/login.astro          # Central login
  pages/admin/               # Tenant CMS
  pages/[tenant]/            # Public renderer
  pages/api/auth|admin/      # Server mutations
  components/public/blocks/  # Generic Astro blocks
  components/admin/          # React form islands
  db/                        # Drizzle schema + client
  services/                  # Tenant-scoped data access
  lib/                       # Auth, DB helpers, Zod, theme
```

## License

Private / internal — confirm with repository owner before redistribution.
