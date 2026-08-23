# QA Testing Guide — Multi-Framework

Manual test plan for the multi-tenant SaaS website builder (Astro SSR + SQLite).

**Product flow**

```
/login → authenticate
/super-admin → platform owner creates tenants
/admin → tenant CMS (text, gallery, theme)
/[tenant] → public site (e.g. /riverside)
```

---

## 1. Setup Guide

### Requirements

- Node.js **≥ 22.12.0**
- npm 10+
- macOS or Linux

### First-time setup

From the repo root:

```bash
npm install
cp .env.example .env
npm run db:push
npm run seed
npm run dev
```

| Step | Command | What it does |
|------|---------|--------------|
| 1 | `npm install` | Install dependencies |
| 2 | `cp .env.example .env` | Local env (SQLite path, session secret, uploads dir) |
| 3 | `npm run db:push` | Sync Drizzle schema → SQLite (`./data/sqlite.db`) |
| 4 | `npm run seed` | Create Super Admin + Riverside demo tenant |
| 5 | `npm run dev` | Start Astro at the URL printed in the terminal (usually `http://localhost:4321`) |

### `.env` checklist

Confirm these exist after copying `.env.example`:

| Variable | Example | Notes |
|----------|---------|--------|
| `DATABASE_URL` | `./data/sqlite.db` | SQLite file path |
| `SESSION_SECRET` | long random string | Required for sessions |
| `UPLOADS_DIR` | `./public/uploads` | Tenant image uploads |
| `HOST` / `PORT` | `0.0.0.0` / `4321` | Server bind |

**Do not set `NODE_ENV=production` in `.env` while using `npm run dev`.**  
That breaks the Gallery editor React island (`_jsxDEV is not a function`). Production is set automatically by Docker / `npm start`.

### Seeded credentials

| Role | Email | Password | Lands on |
|------|-------|----------|----------|
| Super Admin | `admin@mydomain.com` | `password123` | `/super-admin` |
| Tenant Admin (demo) | `admin@riverside.example` | `password123` | `/admin` → public `/riverside` |

There is **no public sign-up**. Only the Super Admin can create new tenants.

### Optional: automated smoke tests

```bash
npm test
```

Uses in-memory SQLite (does not require `data/sqlite.db`).

### Port already in use

```bash
npm run dev -- --port 4331 --host 127.0.0.1 --force
```

---

## 2. Testing Scenarios

Use a private/incognito window (or clear cookies) between role switches so sessions do not leak.

Record for each case: **Pass / Fail**, browser, build URL, and a short note or screenshot.

---

### A. Super Admin Flow

**Goal:** Platform owner can sign in, create customer tenants, and sign out.

| # | Steps | Expected |
|---|--------|----------|
| A1 | Open `/login`. Enter `admin@mydomain.com` / `password123`. Submit. | Redirect to `/super-admin`. Page title/area shows platform tenants. |
| A2 | Confirm **Existing tenants** lists at least **Riverside** (`/riverside`). | Demo tenant visible; **system** slug is not listed as a customer. |
| A3 | Under **Register new tenant**, create a **School**-style workspace: | |
| | • Name: `Oakridge School` | |
| | • Slug: `oakridge` | |
| | • Admin email: `admin@oakridge.example` | |
| | • Temporary password: `TempPass99` (≥ 8 chars) | |
| | Click **Create tenant**. | Success banner: created ` /oakridge` with admin email. Tenant appears in the list. **View site** opens `/oakridge`. |
| A4 | Create a second **Business**-style workspace: | |
| | • Name: `Northwind Business` | |
| | • Slug: `northwind` | |
| | • Admin email: `admin@northwind.example` | |
| | • Temporary password: `TempPass99` | |
| | Click **Create tenant**. | Same success pattern for `/northwind`. |
| A5 | Negative checks (optional but recommended): | |
| | • Duplicate slug `oakridge` | Error: slug already taken. |
| | • Duplicate email `admin@oakridge.example` | Error: email already registered. |
| | • Password shorter than 8 characters | Rejected (client and/or server). |
| A6 | Click **Sign out** in the Super Admin chrome. | Session cleared. Visiting `/super-admin` redirects to `/login`. |

**Notes for QA**

- Tenant **type** in the DB defaults to `site` if no type field is shown; use distinct **names** (School / Business) to distinguish workspaces in this build.
- New admins are flagged for a future forced password change; login with the temporary password still works today.
- Non–super-admins who hit `/super-admin` should be redirected to `/admin` (not see the create form).

---

### B. Tenant Admin Flow

**Goal:** A newly created tenant admin can manage their own CMS (gallery + text).

Use the tenant created in **A3** (`admin@oakridge.example` / `TempPass99`), or the seeded Riverside admin if you prefer a known baseline.

| # | Steps | Expected |
|---|--------|----------|
| B1 | Open `/login`. Sign in as the new tenant admin. | Redirect to `/admin` (not `/super-admin`). Dashboard shows that tenant’s name and public URL `/{slug}`. |
| B2 | **Upload a gallery image.** Under **Gallery**, drop or choose a JPG/PNG. | Image uploads, appears in the grid, URL under `/uploads/...`. Status indicates unpublished changes. |
| B3 | Optionally set a **caption**, then click **Publish gallery**. | Success: gallery published. “View public site” / hard-refresh `/{slug}` shows the new image. |
| B4 | **Edit text.** Under **Text and image**, change **Title** and **Subtitle** to unique values (e.g. `QA Hero Title — Oakridge`). Click **Save content**. | Green “Content saved” (or equivalent). Public `/{slug}` shows the new hero text after refresh. |
| B5 | **Delete an image.** In Gallery, delete the uploaded item. Click **Publish gallery** again. | Item removed from the editor. After publish, public gallery no longer shows that image. |
| B6 | Confirm hero image URL / alt can also be edited and saved (optional). | Changes appear on the public page only after **Save content**. |

**Notes for QA**

- Gallery edits are **not** live until **Publish gallery**.
- Hero/text edits require **Save content**.
- Uploaded files live under `public/uploads/tenant-{id}/` and are served at `/uploads/...`.

---

### C. Data Isolation

**Goal:** Tenant A’s public site never shows Tenant B’s content.

Prerequisites: two tenants with **distinct** hero titles and (ideally) distinct gallery images — e.g. Oakridge vs Northwind from scenario A, or Oakridge vs seeded Riverside.

| # | Steps | Expected |
|---|--------|----------|
| C1 | While logged in as Tenant A, note the unique hero title and any gallery captions/images. | Record them for comparison. |
| C2 | Open Tenant A’s public URL in a new tab (or signed-out browser): `/{slug-a}` (e.g. `/oakridge`). | Only Tenant A hero + gallery. Brand/name matches Tenant A. |
| C3 | Open Tenant B’s public URL: `/{slug-b}` (e.g. `/northwind` or `/riverside`). | Only Tenant B content. **No** Tenant A title, images, or captions. |
| C4 | Spot-check: Tenant A’s `/uploads/tenant-…` image URL must not appear in Tenant B’s HTML. | No cross-tenant media or copy. |
| C5 | (Auth isolation) Log in as Tenant A; open `/admin`. Confirm you cannot see Tenant B’s CMS fields. Sign out; log in as Tenant B; confirm the reverse. | Each `/admin` session is scoped to that user’s `tenant_id` only. |

**Fail criteria:** Any shared copy, image, or theme that belongs to the other tenant on a public or admin surface.

---

### D. Security

**Goal:** Unauthenticated access is blocked; bad passwords are rejected.

| # | Steps | Expected |
|---|--------|----------|
| D1 | Sign out (or use a fresh private window). Visit `/admin` directly. | Redirect to `/login`. No dashboard HTML for the tenant CMS. |
| D2 | Still unauthenticated, visit `/super-admin`. | Redirect to `/login`. |
| D3 | Unauthenticated `POST` / fetch to `/api/admin/*` (optional: DevTools or curl without session cookie). | `401 Unauthorized` JSON (or redirect for browser form posts). |
| D4 | On `/login`, submit a **valid email** with a **wrong password** (e.g. `admin@mydomain.com` / `wrong-password`). | Stay on (or return to) `/login` with an invalid-credentials error. No session cookie granting `/admin`. |
| D5 | Submit empty email/password (if UI allows). | Rejected (`missing` / validation); no authenticated redirect. |
| D6 | Log in as **tenant** admin (`admin@riverside.example`). Visit `/super-admin`. | Redirect to `/admin` (forbidden for non–super-admin). Create-tenant form not usable. |
| D7 | After **Sign out**, confirm `/admin` and `/super-admin` again redirect to `/login`. | Session fully cleared. |

---

## 3. Suggested pass matrix

| Area | Case IDs | Result |
|------|----------|--------|
| Setup | Install → `db:push` → `seed` → `dev` | ☐ |
| Super Admin | A1–A6 | ☐ |
| Tenant Admin | B1–B6 | ☐ |
| Isolation | C1–C5 | ☐ |
| Security | D1–D7 | ☐ |

---

## 4. Quick URL reference

| URL | Who | Purpose |
|-----|-----|---------|
| `/login` | Public | Central login |
| `/super-admin` | Super Admin only | Register tenants |
| `/admin` | Tenant Admin | Edit hero, gallery, theme |
| `/riverside` | Public | Seeded demo school site |
| `/{slug}` | Public | That tenant’s published site |
| `/api/auth/login` | Public | Login POST |
| `/api/auth/logout` | Authed | Sign out |
| `/api/super-admin/create-tenant` | Super Admin | Create tenant + admin user |
| `/api/admin/*` | Tenant Admin | CMS mutations (session-scoped) |

---

## 5. Troubleshooting (during QA)

| Symptom | Likely fix |
|---------|------------|
| Gallery editor blank / `_jsxDEV` error | Remove `NODE_ENV=production` from `.env`; restart `npm run dev` |
| `no such table: tenants` | Re-run `npm run db:push` (or `npm run db:migrate`) |
| Login always fails after wipe | Re-run `npm run seed` |
| Public gallery not updating | Click **Publish gallery**, then hard-refresh the public URL |
| Uploaded image 404 | Confirm file under `public/uploads/` and URL starts with `/uploads/` |
| Port in use | `npm run dev -- --port 4331 --force` |

---

## 6. Out of scope / known product notes

- No self-service public registration.
- Forced password-change UX after temp password is flagged in data but may not yet block login.
- Public UI is generic blocks (Hero + Gallery); do not expect industry-specific layouts for “School” vs “Business”.
- Do not commit `.env`, `*.db`, or real uploads; those are excluded from Docker/Git for deployment safety.
