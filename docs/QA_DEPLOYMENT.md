# QA & Deployment Guide — Multi-Framework

Operational reference for **QA engineers** and **DevOps** teams deploying the multi-tenant Astro SSR website builder.

For the full manual test case catalog (step-by-step tables and pass matrix), see **[QA_TESTING.md](./QA_TESTING.md)**.

---

## Part 1 — QA test scenarios

### 1.1 Environment setup (all testers)

```bash
npm install
cp .env.example .env
npm run db:push
npm run seed
npm run dev
```

| Check | Expected |
|-------|----------|
| `GET /login` | HTTP 200 |
| `npm test` | All tests pass |
| `.env` has no `NODE_ENV=production` during dev | Gallery/admin React islands load |

**Seeded credentials**

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@mydomain.com` | `password123` |
| Tenant Admin | `admin@riverside.example` | `password123` |

Use separate browser profiles or incognito windows when switching roles.

---

### 1.2 Scenario: Super Admin provisioning

**Objective:** Platform owner can create isolated tenant workspaces.

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Sign in at `/login` as Super Admin | Lands on `/super-admin` |
| 2 | Create tenant `oakridge` with admin email + temp password | Success banner; tenant in list |
| 3 | Click **View site** for new tenant | Public `/oakridge` loads (default blocks) |
| 4 | Sign out | `/super-admin` redirects to `/login` |
| 5 | Negative: duplicate slug or email | Error message; no duplicate row |

---

### 1.3 Scenario: Tenant CMS — full content cycle

**Objective:** Tenant admin can edit all CMS sections and see changes on the public site.

Sign in as the new tenant admin (or Riverside demo).

| Section | Steps | Pass criteria |
|---------|-------|---------------|
| **Hero** | Edit title/subtitle → **Save content** | Public hero updates after refresh |
| **About** | Edit copy, upload image, toggle left/right position → **Save about** | Split layout correct on desktop |
| **Features** | **Add New Feature**, fill title/description → **Save features** | Grid renders on public site |
| **Gallery** | Upload image (staged) → caption → **Add to Gallery** → **Publish gallery** | Image appears publicly only after publish |
| **Contact** | Fill address/phone/email/hours + Maps URL → **Save contact** | Contact section visible; map embeds or links correctly |
| **Theme** | Change primary color → **Save theme** | Public CSS variables update |

---

### 1.4 Scenario: Data isolation

**Objective:** Tenant A's content never appears on Tenant B's site or admin.

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Customize Tenant A with unique hero title, about copy, feature title | Record values |
| 2 | Open `/tenant-a` (signed out) | Only Tenant A content |
| 3 | Open `/tenant-b` or `/riverside` | **None** of Tenant A strings or `/uploads/tenant-a/…` URLs |
| 4 | Log in as Tenant A → `/admin` | CMS shows Tenant A data only |
| 5 | Log in as Tenant B → `/admin` | CMS shows Tenant B data only |

**Fail:** Any cross-tenant copy, image URL, or theme bleed.

---

### 1.5 Scenario: Security

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Visit `/admin` without session | Redirect to `/login` |
| 2 | Visit `/super-admin` without session | Redirect to `/login` |
| 3 | Wrong password on `/login` | Error; no session cookie |
| 4 | Tenant admin visits `/super-admin` | Redirect to `/admin` |
| 5 | `POST /api/admin/gallery` without cookie | `401 Unauthorized` JSON |

---

### 1.6 Automated regression

```bash
npm test
```

Run before each release candidate. Covers auth, DB tenant scoping, and Google Maps embed conversion.

---

### 1.7 QA sign-off checklist

| Area | Status |
|------|--------|
| Setup & seed | ☐ |
| Super Admin create tenant | ☐ |
| Hero / About / Features / Gallery / Contact / Theme | ☐ |
| Gallery staging → publish flow | ☐ |
| Cross-tenant isolation (public + admin) | ☐ |
| Auth guards & bad password | ☐ |
| `npm test` green | ☐ |

---

## Part 2 — DevOps deployment

### 2.1 Deployment model

- **Single container** running the Astro SSR Node server (`dist/server/entry.mjs`).
- **SQLite file** on a mounted volume (stateful data).
- **Upload directory** on a mounted volume (tenant images).
- **Secrets** injected via `--env-file` or orchestrator secrets — never baked into the image.

The `.dockerignore` excludes `.env`, `*.db`, and `public/uploads/` from the build context.

---

### 2.2 Dockerfile overview

**File:** `Dockerfile` (multi-stage)

| Stage | Base | Actions |
|-------|------|---------|
| **builder** | `node:22-alpine` | `npm install` → `npm run build` → `npm prune --omit=dev` |
| **runner** | `node:22-alpine` | Copy `dist/`, production `node_modules/`, migrations; run as non-root `astro` user |

**Runtime defaults (runner stage):**

```
NODE_ENV=production
HOST=0.0.0.0
PORT=4321
SQLITE_PATH=/app/data/sqlite.db
UPLOADS_DIR=/app/public/uploads
```

**Entrypoint:** `node ./dist/server/entry.mjs`

Native module `better-sqlite3` requires build tools in the builder stage (`python3`, `make`, `g++` on Alpine).

---

### 2.3 Build image

```bash
docker build -t multi-framework:latest .
```

Verify:

```bash
docker images multi-framework
```

---

### 2.4 First-time run (with persistence)

Create host directories for state:

```bash
mkdir -p data public/uploads
cp .env.example .env
# Edit .env: set SESSION_SECRET, PUBLIC_SITE_URL, DATABASE_URL
```

**Initialize database on the host** (recommended before first container start):

```bash
npm install
npm run db:push
npm run seed
```

This creates `./data/sqlite.db` on the host, which will be bind-mounted into the container.

**Run container:**

```bash
docker run -d \
  --name multi-framework \
  -p 4321:4321 \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/public/uploads:/app/public/uploads" \
  --env-file .env \
  multi-framework:latest
```

**Alternative:** Run `db:push` + `seed` via a one-off container exec if Node is not installed on the host:

```bash
docker run --rm \
  -v "$(pwd)/data:/app/data" \
  --env-file .env \
  multi-framework:latest \
  node -e "console.log('Run migrate/seed from CI or init container')"
```

For migrate/seed scripts, use a throwaway container with the repo mounted or a dedicated init job in your orchestrator.

---

### 2.5 Required environment variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` or `SQLITE_PATH` | Yes | `./data/sqlite.db` | Path inside container: `/app/data/sqlite.db` |
| `SESSION_SECRET` | Yes | long random string | Server-side session signing (reserved for future hardening) |
| `UPLOADS_DIR` | Yes | `./public/uploads` | Must match volume mount |
| `HOST` | No | `0.0.0.0` | Bind address |
| `PORT` | No | `4321` | Exposed port |
| `PUBLIC_SITE_URL` | Recommended | `https://app.example.com` | Canonical base for links |
| `NODE_ENV` | Auto in Docker | `production` | Set by Dockerfile runner stage |

Copy from `.env.example`. **Never commit `.env` to Git.**

---

### 2.6 Volume strategy

| Host path | Container path | Purpose |
|-----------|----------------|---------|
| `./data` | `/app/data` | SQLite database file |
| `./public/uploads` | `/app/public/uploads` | Tenant-uploaded images |

Without these mounts, **all tenant data and uploads are lost** on container recreate.

Ensure the container user (`astro`, UID 1001) can write to mounted directories:

```bash
chown -R 1001:1001 data public/uploads   # if needed on Linux host
```

---

### 2.7 Health verification

After deploy:

```bash
curl -sf http://localhost:4321/login -o /dev/null && echo "OK"
curl -sf http://localhost:4321/riverside -o /dev/null && echo "OK"
```

Sign in with seeded credentials and confirm `/admin` loads React editors.

Optional: `GET /api/admin/health` if exposed for load balancers.

---

### 2.8 Upgrades and migrations

1. **Back up** `./data/sqlite.db` and `./public/uploads`.
2. Build new image tag.
3. Stop container.
4. Run schema sync if schema changed:
   ```bash
   npm run db:migrate   # or db:push during maintenance window
   ```
5. Start new container with same volume mounts and `--env-file`.
6. Smoke-test login, admin save, public render.

Drizzle migrations live in `src/db/migrations/`. The runtime client also auto-applies migrations on DB connect.

---

### 2.9 Proxmox LXC / bare metal

Same pattern as Docker:

- Node ≥ 22.12.0
- `npm run build && npm start`
- Persist `./data/sqlite.db` and `./public/uploads` outside the deploy directory
- systemd unit with `EnvironmentFile=/path/to/.env`
- Reverse proxy (nginx/Caddy) terminating TLS in front of `:4321`

---

### 2.10 Security checklist (production)

| Item | Action |
|------|--------|
| `SESSION_SECRET` | Strong random value per environment |
| TLS | Terminate HTTPS at reverse proxy |
| `.env` | Not in image; inject at runtime |
| Upload size | 5 MB limit enforced server-side |
| Tenant isolation | Verified by QA isolation scenario |
| DB file permissions | Restrict read access on host |
| Backups | Schedule `sqlite.db` + `uploads/` snapshots |

---

### 2.11 Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `no such table: tenants` | DB not initialized | Run `db:push` / `db:migrate` + `seed` on volume |
| Admin islands blank | `NODE_ENV=production` in dev `.env` | Remove for local dev only |
| Upload 404 | Volume not mounted or wrong `UPLOADS_DIR` | Check mount + path |
| Login fails after deploy | Empty DB volume | Re-run `seed` or restore backup |
| Permission denied on upload | Volume ownership | `chown` for UID 1001 |

---

## Related documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Developer deep-dive (routing, blocks, auth)
- **[QA_TESTING.md](./QA_TESTING.md)** — Detailed manual test cases (A–G)
- **[USAGE.md](./USAGE.md)** — Operator guide and day-to-day commands
