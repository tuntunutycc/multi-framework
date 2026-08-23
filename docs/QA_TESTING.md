# QA Testing Guide — Multi-Framework

Manual test plan for the multi-tenant SaaS website builder (Astro SSR + SQLite).

**Product flow**

```
/login → authenticate
/super-admin → platform owner creates tenants
/admin → tenant CMS (hero, about, features, gallery, contact, theme)
/[tenant] → public site (e.g. /riverside)
```

**Public homepage block order (when content exists):**

```
Hero → About → Features → Gallery → Contact
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
That breaks the admin React islands (`_jsxDEV is not a function`). Production is set automatically by Docker / `npm start`.

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

Uses in-memory SQLite (does not require `data/sqlite.db`). Currently includes auth, DB isolation, and Google Maps embed conversion helpers.

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
| A1 | Open `/login`. Enter `admin@mydomain.com` / `password123`. Submit. | Redirect to `/super-admin`. Page shows platform tenants. |
| A2 | Confirm **Existing tenants** lists at least **Riverside** (`/riverside`). | Demo tenant visible; **system** slug is not listed as a customer. |
| A3 | Under **Register new tenant**, create a **School**-style workspace: | |
| | • Name: `Oakridge School` | |
| | • Slug: `oakridge` | |
| | • Admin email: `admin@oakridge.example` | |
| | • Temporary password: `TempPass99` (≥ 8 chars) | |
| | Click **Create tenant**. | Success banner: created `/oakridge` with admin email. Tenant appears in the list. **View site** opens `/oakridge`. |
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

- Tenant **type** in the DB defaults to `site`; use distinct **names** (School / Business) to distinguish workspaces.
- New admins are flagged for a future forced password change; login with the temporary password still works today.
- Non–super-admins who hit `/super-admin` should be redirected to `/admin`.

---

### B. Tenant Admin — Hero & Gallery

**Goal:** Tenant admin can edit the hero and manage gallery photos with the **staging** workflow.

Use the tenant from **A3** (`admin@oakridge.example` / `TempPass99`), or Riverside (`admin@riverside.example` / `password123`).

| # | Steps | Expected |
|---|--------|----------|
| B1 | Open `/login`. Sign in as tenant admin. | Redirect to `/admin`. Dashboard shows tenant name and public URL `/{slug}`. |
| B2 | **Edit hero text.** Under **Text and image**, change **Title** and **Subtitle** to unique values (e.g. `QA Hero Title — Oakridge`). Click **Save content**. | Success message. Public `/{slug}` shows new hero text after refresh. |
| B3 | **Stage a gallery upload.** Under **Gallery**, drop or choose a JPG/PNG. | Image uploads and shows a **preview in the form area only** — **not** yet in the “On your site” grid. Helper text indicates image is staged. |
| B4 | Type a **caption** in the form, then click **Add to Gallery**. | Item appears in the gallery list with caption. Form preview clears. “Unpublished changes” shown. |
| B5 | Click **Publish gallery**. | Success message with link to public site. Hard-refresh `/{slug}` shows the new image and caption. |
| B6 | **Edit** an existing gallery item caption (optional), then **Publish gallery** again. | Updated caption on public site after publish + refresh. |
| B7 | **Delete** a gallery item, then **Publish gallery**. | Item gone from editor and public gallery. |
| B8 | Click **Clear** while an image is staged (before Add to Gallery). | Staged preview and caption field reset; nothing added to list. |

**Notes for QA**

- Gallery uploads do **not** go live until **Add to Gallery** → **Publish gallery**.
- Hero edits require **Save content** (separate from gallery publish).
- Uploaded files live under `public/uploads/tenant-{id}/` and are served at `/uploads/...`.

---

### C. Tenant Admin — About Us

**Goal:** Tenant admin can edit the About section with optional image and left/right layout.

| # | Steps | Expected |
|---|--------|----------|
| C1 | On `/admin`, scroll to **About us**. Confirm seeded Riverside shows title/content (or empty for a new tenant). | Section loads without JS errors. |
| C2 | Change **Title** and **Content** to unique copy (e.g. `About Oakridge QA`). Click **Save about**. | Success message. Public `/{slug}` shows About section with new copy after refresh. |
| C3 | Upload an image via the About drop zone (or drag-and-drop). | Preview appears in the form; image URL stored in editor state. |
| C4 | Select **Image position → Right**. Click **Save about**. | Public site: on desktop, image appears on the **right**, text on the left. |
| C5 | Switch to **Image position → Left**. Save again. | Public site: image on **left**, text on **right**. |
| C6 | Click **Remove image**, save. | About section on public site shows text only (no broken image). |
| C7 | Hard-refresh public page. | About block appears **below Hero** and **above Features** (if both have content). |

**Notes for QA**

- About saves immediately via **Save about** (no separate publish step).
- Empty title + content + image = section hidden on public site.

---

### D. Tenant Admin — Services / Features

**Goal:** Tenant admin can add, edit, and remove feature cards.

| # | Steps | Expected |
|---|--------|----------|
| D1 | On `/admin`, scroll to **Services / features**. | Section title, subtitle, and feature list (or empty). |
| D2 | Click **Add New Feature**. Fill **Title** and **Description** with unique values. Click **Save features**. | Success message. Public site shows new card in a responsive grid (up to 3 columns on desktop). |
| D3 | Add a second feature with an **Icon / image URL** (e.g. `/logo.svg` or an uploaded `/uploads/...` path). Save. | Public card shows the icon/image above title. |
| D4 | Edit an existing feature’s title/description. Save. | Public site reflects changes after refresh. |
| D5 | Click **Remove** on a feature. Save. | Feature removed from public grid. |
| D6 | Set section **Title** to `QA Services` and optional **Subtitle**. Save. | Public header updates. |

**Notes for QA**

- Features save immediately via **Save features**.
- Each feature requires a stable `id` (auto-generated on add); do not duplicate IDs manually.

---

### E. Tenant Admin — Contact & Location

**Goal:** Tenant admin can edit contact details and Google Maps display.

| # | Steps | Expected |
|---|--------|----------|
| E1 | On `/admin`, scroll to **Contact & location**. | Fields: Address, Phone, Email, Opening hours, Google Maps URL. |
| E2 | Fill all contact fields with unique QA values. Click **Save contact**. | Success message. Public site shows **Contact & location** section below Gallery. |
| E3 | Paste an official **embed URL** (`https://www.google.com/maps/embed?pb=…`). Save. | Public site renders a **working iframe map** (no “refused to connect”). |
| E4 | Paste a standard **share/place URL** (e.g. `https://www.google.com/maps/place/…` or `https://maps.app.goo.gl/…`). Ensure **Address** is filled. Save. | Public site renders an **embedded map** (converted server-side), not a broken iframe. |
| E5 | Clear the Maps URL but keep Address. Save. | Contact details still show; map may embed from address fallback or hide if no map data. |
| E6 | Verify phone and email are clickable (`tel:` / `mailto:`) on the public site. | Links work on mobile/desktop. |

**Notes for QA**

- Contact saves immediately via **Save contact**.
- Share links are auto-converted when possible; embed URLs work directly.
- Opening hours support multiple lines (one per line in the textarea).

---

### F. Data Isolation

**Goal:** Tenant A’s public site never shows Tenant B’s content.

Prerequisites: two tenants with distinct hero titles, about copy, features, gallery items, and contact details.

| # | Steps | Expected |
|---|--------|----------|
| F1 | While logged in as Tenant A, note unique content across all CMS sections. | Record for comparison. |
| F2 | Open Tenant A’s public URL: `/{slug-a}` (signed out). | Only Tenant A content across Hero, About, Features, Gallery, Contact. |
| F3 | Open Tenant B’s public URL: `/{slug-b}`. | Only Tenant B content. **No** Tenant A copy, images, or captions. |
| F4 | Spot-check: Tenant A’s `/uploads/tenant-…` URLs must not appear in Tenant B’s HTML. | No cross-tenant media. |
| F5 | Log in as Tenant A → `/admin`. Confirm CMS shows only Tenant A data. Repeat for Tenant B. | Each session scoped to `tenant_id` only. |

**Fail criteria:** Any shared copy, image, or contact info from another tenant on public or admin surfaces.

---

### G. Security

**Goal:** Unauthenticated access is blocked; bad passwords are rejected.

| # | Steps | Expected |
|---|--------|----------|
| G1 | Sign out (or fresh private window). Visit `/admin` directly. | Redirect to `/login`. |
| G2 | Visit `/super-admin` unauthenticated. | Redirect to `/login`. |
| G3 | Unauthenticated `POST` to `/api/admin/*` (optional: curl without cookie). | `401 Unauthorized` JSON. |
| G4 | On `/login`, submit valid email + **wrong password**. | Stay on `/login` with error; no session. |
| G5 | Submit empty email/password (if allowed). | Rejected; no authenticated redirect. |
| G6 | Log in as tenant admin. Visit `/super-admin`. | Redirect to `/admin`. |
| G7 | After **Sign out**, `/admin` and `/super-admin` redirect to `/login`. | Session cleared. |

---

## 3. Suggested pass matrix

| Area | Case IDs | Result |
|------|----------|--------|
| Setup | Install → `db:push` → `seed` → `dev` | ☐ |
| Super Admin | A1–A6 | ☐ |
| Hero & Gallery | B1–B8 | ☐ |
| About Us | C1–C7 | ☐ |
| Features | D1–D6 | ☐ |
| Contact & Maps | E1–E6 | ☐ |
| Isolation | F1–F5 | ☐ |
| Security | G1–G7 | ☐ |

---

## 4. Quick URL reference

| URL | Who | Purpose |
|-----|-----|---------|
| `/login` | Public | Central login |
| `/super-admin` | Super Admin only | Register tenants |
| `/admin` | Tenant Admin | Full CMS dashboard |
| `/riverside` | Public | Seeded demo school site |
| `/{slug}` | Public | Tenant published homepage |
| `/api/auth/login` | Public | Login POST |
| `/api/auth/logout` | Authed | Sign out |
| `/api/super-admin/create-tenant` | Super Admin | Create tenant + admin |
| `/api/admin/pages` | Tenant Admin | Save hero (form POST) |
| `/api/admin/gallery` | Tenant Admin | Publish gallery (JSON) |
| `/api/admin/about` | Tenant Admin | Save about section (JSON) |
| `/api/admin/features` | Tenant Admin | Save features (JSON) |
| `/api/admin/contact` | Tenant Admin | Save contact (JSON) |
| `/api/admin/upload` | Tenant Admin | Image upload |
| `/api/admin/theme` | Tenant Admin | Save theme colors (form POST) |

---

## 5. Troubleshooting (during QA)

| Symptom | Likely fix |
|---------|------------|
| Admin island blank / `_jsxDEV` error | Remove `NODE_ENV=production` from `.env`; restart `npm run dev` |
| `no such table: tenants` | Re-run `npm run db:push` (or `npm run db:migrate`) |
| Login always fails after wipe | Re-run `npm run seed` |
| Public gallery not updating | **Add to Gallery** then **Publish gallery**; hard-refresh public URL |
| Uploaded image 404 | Confirm file under `public/uploads/` and URL starts with `/uploads/` |
| Map iframe “refused to connect” | Use embed URL or a share link with **Address** filled; refresh public page |
| About/Features/Contact missing on public site | Ensure fields have content and were saved; check block order on homepage |
| Port in use | `npm run dev -- --port 4331 --force` |

---

## 6. Out of scope / known product notes

- No self-service public registration.
- Forced password-change UX after temp password is flagged in data but may not yet block login.
- Public UI uses generic blocks (Hero, About, Features, Gallery, Contact) — not industry-specific layouts.
- New tenants provisioned by Super Admin get empty About/Features/Contact rows; Riverside seed includes demo content.
- Do not commit `.env`, `*.db`, or real uploads; those are excluded from Docker/Git for deployment safety.
