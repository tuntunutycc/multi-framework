# Multi-Framework — How to Run & Use

**Status check (23 Aug 2026):** App healthy on `http://127.0.0.1:4331`  
Live checks: login, admin CMS, public site, image upload, gallery publish, auth guards — **all passed**. Automated tests (`npm test`): **6/6 passed**.

---

## What this project is

A **multi-tenant SaaS website builder** in one Astro SSR app:

```
/login        →  Sign in (bcrypt password, session tied to tenant)
/admin        →  Edit your site (text, gallery, theme)
/[tenant]     →  Public website (e.g. /riverside)
```

Data is stored in a **SQLite file** (`./data/sqlite.db`). No separate database server.

---

## Requirements

- Node.js **≥ 22.12.0**
- npm 10+
- macOS / Linux (or Proxmox LXC with Node)

---

## First-time setup

```bash
cd multi-framework
npm install
cp .env.example .env
npm run db:migrate    # create/apply tables (or npm run db:push)
npm run seed          # Super Admin + Riverside demo tenant
```

### Important `.env` notes

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite file path (default `./data/sqlite.db`; alias: `SQLITE_PATH`) |
| `HOST` / `PORT` | Server bind (dev often `127.0.0.1:4321`) |
| `SESSION_SECRET` | Set a long random value in production (reserved for future signed cookies) |
| `UPLOADS_DIR` | Tenant upload root (default `./public/uploads`) |

**Do not set `NODE_ENV=production` in `.env` while using `npm run dev`.**  
That breaks the admin Gallery editor (`_jsxDEV is not a function`). Production is set automatically by Docker / `npm start`.

---

## How to run

### Development (recommended for editing)

```bash
npm run dev
```

Open the URL Astro prints (usually `http://localhost:4321`).

If another Astro process is already running:

```bash
npm run dev -- --port 4331 --host 127.0.0.1 --force
```

### Production build

```bash
npm run build
npm start
# → node ./dist/server/entry.mjs
```

### Tests

```bash
npm test
```

Uses in-memory SQLite (no need for `data/sqlite.db`).

### Database commands

```bash
npm run db:generate   # after changing src/db/schema.ts
npm run db:push       # sync schema to DATABASE_URL / SQLITE_PATH (quick init)
npm run db:migrate    # apply SQL migrations from src/db/migrations/
npm run seed          # upsert Super Admin + Riverside demo (alias: db:seed)
```

---

## Demo login

| Role | Email | Password | Lands on |
|------|-------|----------|----------|
| **Super admin** (platform owner) | `admin@mydomain.com` | `password123` | `/super-admin` |
| Tenant admin (Riverside demo) | `admin@riverside.example` | `password123` | `/admin` → public `/riverside` |

There is **no public sign-up**. Only the super admin can register new tenants.

---

## How to use (tenant admin)

### 0. Super admin (platform owner)

1. Sign in as `admin@mydomain.com` / `password123`
2. You land on `/super-admin`
3. Fill **Register new tenant**: name, slug, admin email, temporary password
4. Submit → customer appears in the list; their public site is `/{slug}`
5. Give the customer their email + temp password (they use `/login` → `/admin`)

Middleware blocks non–super-admins from `/super-admin` (redirect to `/admin`).

### 1. Sign in (tenant admin)

1. Open `/login`
2. Enter the demo email + password
3. You are redirected to `/admin`

Wrong password → stays on login with an error.  
Visiting `/admin` without a session → redirect to `/login`.

### 2. Edit hero (text & image)

On `/admin` under **Text and image**:

- Title, subtitle
- Image URL + alt text
- **Save content**

There is **no** “Schedule a visit” button anymore (CTA removed).

Refresh `/riverside` to see changes.

### 3. Manage gallery (photos)

Under **Gallery**:

1. Drop or choose an image → it uploads and appears in the grid
2. Optional: **Edit** caption / **Delete**
3. Click **Publish gallery** when you see “Unpublished changes”
4. Use **View public site →** after a successful publish

Uploaded files land in `public/uploads/tenant-{id}/` and are served at `/uploads/...`.

### 4. Theme colors

Under **Theme**, pick primary / secondary / background / foreground → **Save theme**.  
Public site uses CSS variables (`bg-primary`, etc.).

### 5. Sign out

Use **Sign out** in the admin layout (posts to `/api/auth/logout`).

---

## Public site

| URL | What you see |
|-----|----------------|
| `/riverside` | Demo school homepage: Hero + Gallery |
| `/login` | Central login (no admin chrome) |
| `/` | Simple portal / links |

Public pages are **generic blocks** driven by the database — not hardcoded per industry.

---

## Docker / Proxmox LXC (optional)

```bash
docker build -t multi-framework:latest .
docker run -d -p 4321:4321 \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/public/uploads:/app/public/uploads" \
  --env-file .env \
  multi-framework:latest
```

Mount volumes so the SQLite file and uploads survive container rebuilds.  
Run `db:migrate` + `db:seed` once against the mounted data directory before first use (or from a host with the same `SQLITE_PATH`).

---

## Project map (quick)

```
src/pages/login.astro          Login UI
src/pages/admin/index.astro    Dashboard (hero + gallery + theme)
src/pages/[tenant]/index.astro Public homepage
src/pages/api/auth|admin/      Login, logout, save, upload
src/components/public/blocks/  HeroBlock, GalleryBlock
src/components/admin/          GalleryEditor (React island)
src/db/                        SQLite schema, migrate, seed
data/sqlite.db                 Local database file (gitignored)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Gallery editor blank / `_jsxDEV` error | Remove `NODE_ENV=production` from `.env`; restart `npm run dev` |
| `no such table: tenants` | Run `npm run db:migrate` (also auto-runs on DB connect) |
| Login always fails | Re-seed: `npm run db:seed` |
| Port already in use | `npm run dev -- --port 4331 --force` |
| Public gallery not updating | Click **Publish gallery**, then hard-refresh `/riverside` |
| Uploaded image 404 | Confirm file under `public/uploads/` and URL starts with `/uploads/` |

---

## Health checklist (what we verified)

- [x] `/login` loads  
- [x] Valid credentials → `/admin`  
- [x] Invalid credentials rejected  
- [x] `/admin` requires session  
- [x] Hero CMS fields present; CTA fields gone  
- [x] Image upload + `/uploads/...` serve  
- [x] Gallery publish → visible on `/riverside`  
- [x] SQLite file present  
- [x] `npm test` — 6 passed  
