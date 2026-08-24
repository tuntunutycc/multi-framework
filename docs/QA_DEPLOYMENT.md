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
| **Gallery upload** | Stage image → caption → **Add to Gallery** → **Publish gallery** | Image appears on public site only after publish |
| **Gallery delete** | **Delete** an item in the gallery grid → **Publish gallery** | Item removed from editor and public gallery |
| **Contact** | Fill address/phone/email/hours + Maps URL → **Save contact** | Contact section visible; map embeds or links correctly |
| **Theme** | Change primary color → **Save theme** | Public CSS variables update |

Detailed step tables (including gallery staging B1–B8): **[QA_TESTING.md](./QA_TESTING.md)**.

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
| Gallery staging → publish → delete | ☐ |
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

**Initialize database on the host** (required before first container start):

```bash
npm install
npm run db:push
npm run seed
```

This creates `./data/sqlite.db` on the host, which will be bind-mounted into the container.

> **Important:** The production Docker image runs only `node ./dist/server/entry.mjs`. It does **not** include `tsx` or `drizzle-kit`, so `npm run db:push` / `npm run seed` must run on the host (or a separate init container with the full repo + Node toolchain). Runtime still auto-applies SQL migrations from `src/db/migrations` on DB connect.
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
| `SESSION_SECRET` | Yes (set in prod) | long random string | Reserved for future signed-cookie hardening; set a strong value now |
| `UPLOADS_DIR` | Yes | `./public/uploads` | Must match volume mount |
| `HOST` | No | `0.0.0.0` | Bind address |
| `PORT` | No | `4321` | Exposed port |
| `PUBLIC_SITE_URL` | Recommended | `https://app.example.com` | Public HTTPS URL (Cloudflare hostname). Feeds `security.allowedDomains` so CSRF / Origin checks work behind the tunnel |
| `ALLOWED_HOSTS` | Optional | `app.example.com,*.example.com` | Extra host patterns for `X-Forwarded-Host` trust |
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
- Expose the app on `127.0.0.1:4321` (or `0.0.0.0:4321`) for Cloudflare Tunnel — **do not** open port 4321 to the public internet

---

### 2.9.1 Cloudflare Tunnel Deployment (LXC / Local Server)

This section is the **canonical playbook** for exposing Multi-Framework on a Proxmox LXC (or any local Linux server) via [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) (`cloudflared`). Cloudflare terminates HTTPS; the origin stays on private HTTP.

**Architecture**

```
Internet (HTTPS)
    → Cloudflare edge
    → cloudflared (on LXC)
    → http://127.0.0.1:4321  (Astro SSR / Node)
         → ./data/sqlite.db
         → ./public/uploads/
```

**App notes for DevOps**

- Public tenant sites are path-based: `https://your-domain/riverside` (slug), **not** Host-header routing.
- Set `PUBLIC_SITE_URL` to the **exact public HTTPS origin** so Astro’s `security.allowedDomains` trusts Cloudflare’s `X-Forwarded-Host` / `X-Forwarded-Proto` (required for login/admin form CSRF).
- Tunnel origin protocol must be **HTTP** to Node. Do not point the tunnel at HTTPS on the LXC unless you terminate TLS yourself.

---

#### A. Prerequisites

1. **App running on the LXC** (production):

   ```bash
   cd /path/to/multi-framework
   npm install
   cp .env.example .env
   # edit .env (see section B)
   npm run db:push
   npm run seed
   npm run build
   npm start
   # or: systemd unit that runs: node ./dist/server/entry.mjs
   ```

2. Confirm the origin responds locally:

   ```bash
   curl -sf -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4321/login
   # expect: 200
   ```

3. **Install `cloudflared` on the LXC** (Debian/Ubuntu example):

   ```bash
   # Official Cloudflare package repo (Debian/Ubuntu)
   sudo mkdir -p --mode=0755 /usr/share/keyrings
   curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
     | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

   echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' \
     | sudo tee /etc/apt/sources.list.d/cloudflared.list

   sudo apt-get update
   sudo apt-get install -y cloudflared
   cloudflared --version
   ```

   **Alternative (binary download)** if apt is unavailable:

   ```bash
   # Example for linux amd64 — pick the asset matching your arch from GitHub Releases
   curl -L --output cloudflared.deb \
     https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   cloudflared --version
   ```

4. You need a **Cloudflare account** and a zone (domain) already added to Cloudflare for a **permanent** named tunnel. Quick tunnels (section C) do not require a custom domain.

---

#### B. Environment setup (required before public access)

Edit `.env` on the LXC so the public URL matches what browsers will use.

**Local / LXC-only testing (no tunnel yet):**

```bash
PUBLIC_SITE_URL=http://127.0.0.1:4321
HOST=0.0.0.0
PORT=4321
```

**Behind Cloudflare Tunnel (production hostname):**

```bash
# MUST be https + the hostname users type in the browser
PUBLIC_SITE_URL=https://app.example.com
HOST=0.0.0.0
PORT=4321
SESSION_SECRET=replace-with-a-long-random-secret
DATABASE_URL=./data/sqlite.db
UPLOADS_DIR=./public/uploads
```

Optional extra host patterns (wildcards supported by Astro):

```bash
ALLOWED_HOSTS=app.example.com,*.example.com
```

After changing `PUBLIC_SITE_URL` / `ALLOWED_HOSTS`, **rebuild and restart** the Node app (`npm run build && npm start` or restart systemd). `astro.config.mjs` reads these at build/config time for `security.allowedDomains`.

---

#### C. Quick Tunnel (temporary testing)

Use this to smoke-test the app from the internet **without** creating a named tunnel or DNS record. Cloudflare assigns a random `*.trycloudflare.com` URL.

1. Ensure the app is listening on `127.0.0.1:4321`.
2. In a second SSH session on the LXC, run:

   ```bash
   cloudflared tunnel --url http://127.0.0.1:4321
   ```

   Or without a global install:

   ```bash
   npx --yes cloudflared tunnel --url http://127.0.0.1:4321
   ```

3. Copy the printed HTTPS URL (e.g. `https://random-words-xxxx.trycloudflare.com`).
4. **Temporarily** set that origin in `.env`, rebuild/restart:

   ```bash
   PUBLIC_SITE_URL=https://random-words-xxxx.trycloudflare.com
   ```

5. Open the URL → `/login` → smoke-test login and `/riverside`.

**Caveats:** Quick tunnels are ephemeral, not for production, and the hostname changes every run. Prefer a permanent tunnel (section D) for QA sign-off and go-live.

---

#### D. Permanent Tunnel (production)

Replace placeholders:

| Placeholder | Example |
|-------------|---------|
| `<TUNNEL_NAME>` | `multi-framework-lxc` |
| `<HOSTNAME>` | `app.example.com` |
| `<ACCOUNT>` | Your Cloudflare Zero Trust / dashboard account |

##### D.1 Authenticate

On the LXC (needs a browser for the OAuth flow — use SSH port-forward or run `login` from a machine that can open the URL):

```bash
cloudflared tunnel login
```

This opens a Cloudflare login page. Authorize the domain you will route. Credentials are stored under `~/.cloudflared/` (typically `cert.pem`).

##### D.2 Create the tunnel

```bash
cloudflared tunnel create <TUNNEL_NAME>
```

Note the **Tunnel ID** (UUID) printed in the output. A credentials JSON file is written, e.g.:

```text
~/.cloudflared/<TUNNEL_ID>.json
```

##### D.3 Route DNS to the tunnel

Attach a hostname in your Cloudflare zone to this tunnel:

```bash
cloudflared tunnel route dns <TUNNEL_NAME> <HOSTNAME>
```

Example:

```bash
cloudflared tunnel route dns multi-framework-lxc app.example.com
```

This creates a CNAME in Cloudflare DNS pointing `<HOSTNAME>` at the tunnel. Confirm in the Cloudflare DNS UI.

##### D.4 Configure `config.yml`

Create the config file (paths must match the credentials file from D.2):

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

**Example `/etc/cloudflared/config.yml`:**

```yaml
# Replace <TUNNEL_ID> with the UUID from `cloudflared tunnel create`
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/<TUNNEL_ID>.json

# Optional: restrict to IPv4
# protocol: http2

ingress:
  # Public hostname → Astro SSR origin (HTTP only)
  - hostname: app.example.com
    service: http://127.0.0.1:4321
    originRequest:
      # Cloudflare already terminates TLS; origin is plain HTTP
      noTLSVerify: true
      connectTimeout: 30s
      # Helps Astro see original scheme/host for CSRF + redirects
      httpHostHeader: app.example.com

  # Catch-all (required)
  - service: http_status:404
```

Copy credentials into place (adjust ownership for the service user):

```bash
# From the user that ran `tunnel create`:
sudo cp ~/.cloudflared/<TUNNEL_ID>.json /etc/cloudflared/<TUNNEL_ID>.json
sudo cp ~/.cloudflared/cert.pem /etc/cloudflared/cert.pem
sudo chmod 600 /etc/cloudflared/<TUNNEL_ID>.json /etc/cloudflared/cert.pem
```

Validate config:

```bash
cloudflared tunnel --config /etc/cloudflared/config.yml ingress validate
```

Dry-run / foreground test:

```bash
cloudflared tunnel --config /etc/cloudflared/config.yml run <TUNNEL_NAME>
```

In another terminal:

```bash
curl -sf -o /dev/null -w "%{http_code}\n" https://app.example.com/login
# expect: 200
```

Confirm `.env` has:

```bash
PUBLIC_SITE_URL=https://app.example.com
```

Then rebuild/restart the Node app.

##### D.5 Install as a system service

With a valid `/etc/cloudflared/config.yml` and credentials file:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

Useful service commands:

```bash
sudo journalctl -u cloudflared -f
sudo systemctl restart cloudflared
sudo systemctl stop cloudflared
```

**Order of operations at boot:** start the Astro app **before** or **with** `cloudflared` so ingress does not 502 while Node is down. Prefer a systemd `After=` / `Requires=` relationship if both are units.

Example fragment for the app unit (`/etc/systemd/system/multi-framework.service`):

```ini
[Unit]
Description=Multi-Framework Astro SSR
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/multi-framework
EnvironmentFile=/path/to/multi-framework/.env
ExecStart=/usr/bin/node ./dist/server/entry.mjs
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

Then ensure `cloudflared.service` starts after the app (optional override):

```bash
sudo systemctl edit cloudflared
```

```ini
[Unit]
After=multi-framework.service
Wants=multi-framework.service
```

---

#### E. Post-deploy checklist (Cloudflare)

| Step | Command / check | Pass |
|------|-----------------|------|
| Origin local | `curl http://127.0.0.1:4321/login` → 200 | ☐ |
| `.env` public URL | `PUBLIC_SITE_URL=https://<HOSTNAME>` | ☐ |
| App rebuilt after env change | `npm run build && systemctl restart multi-framework` | ☐ |
| Tunnel service | `systemctl is-active cloudflared` → `active` | ☐ |
| Public login | Browser `https://<HOSTNAME>/login` | ☐ |
| Tenant site | `https://<HOSTNAME>/riverside` | ☐ |
| Admin after login | Forms save without CSRF / “forbidden” errors | ☐ |
| Upload | Gallery/About image upload → `/uploads/...` loads | ☐ |

---

#### F. Cloudflare Tunnel troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `502` / Bad Gateway | Node not listening on 4321 | Start app; check `curl 127.0.0.1:4321/login` |
| Login / Save posts fail (“Cross-site” / CSRF) | `PUBLIC_SITE_URL` wrong or app not rebuilt | Set HTTPS public host; rebuild; confirm `allowedDomains` |
| Tunnel up but DNS NXDOMAIN | Route DNS not run | `cloudflared tunnel route dns <name> <hostname>` |
| Works on trycloudflare.com, fails on custom host | `PUBLIC_SITE_URL` still points at trycloudflare URL | Update `.env` to custom HTTPS host; rebuild |
| Uploads 404 through tunnel | File missing or wrong `UPLOADS_DIR` | Confirm files under `public/uploads/` on LXC |
| Service won’t start | Bad credentials path in `config.yml` | Match `tunnel` ID + `credentials-file` path; `chmod 600` |

---

### 2.10 Security checklist (production)

| Item | Action |
|------|--------|
| `SESSION_SECRET` | Strong random value per environment |
| TLS | Terminate HTTPS at Cloudflare Tunnel (or reverse proxy); origin stays HTTP on LXC |
| `PUBLIC_SITE_URL` | Must match the public Cloudflare HTTPS hostname; rebuild app after change |
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
| Cloudflare 502 | App down or wrong origin in tunnel config | Start Node; set `service: http://127.0.0.1:4321` |
| CSRF / forbidden form POST via tunnel | `PUBLIC_SITE_URL` mismatch | Set to `https://<public-host>`; rebuild + restart |
| Tunnel DNS not resolving | Missing `tunnel route dns` | Run `cloudflared tunnel route dns <name> <hostname>` |

---

## Related documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Developer deep-dive (routing, blocks, auth)
- **[QA_TESTING.md](./QA_TESTING.md)** — Detailed manual test cases (A–G)
- **[USAGE.md](./USAGE.md)** — Operator guide and day-to-day commands
