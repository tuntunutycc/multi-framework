# Architecture — Multi-Framework

Technical reference for developers and maintainers of the multi-tenant Astro SSR website builder.

---

## 1. System overview

Multi-Framework is a **single deployable unit** (monolith) that serves three distinct surfaces from one Node process:

| Surface | Route prefix | Rendering | Data access |
|---------|--------------|-----------|-------------|
| **Authentication** | `/login`, `/api/auth/*` | Astro (static forms) | Read `users`; write session cookie |
| **Platform admin** | `/super-admin`, `/api/super-admin/*` | Astro + forms | Create `tenants`, `users`, `site_content` rows |
| **Tenant CMS** | `/admin`, `/api/admin/*` | Astro shell + **React islands** | Read/write scoped to `session.tenantId` |
| **Public renderer** | `/{tenant-slug}` | **Astro only** (no ORM in components) | Read-only by resolved `tenants.slug` |

There is **no separate admin app**, **no external CMS**, and **no tenant content in JSON/Markdown files**. The database is the single source of truth.

```
                    ┌─────────────────────────────────────┐
                    │         Astro SSR (Node)            │
                    │  middleware.ts → session gate       │
                    └─────────────────────────────────────┘
           ┌──────────────┬──────────────┬──────────────────────┐
           ▼              ▼              ▼                      ▼
      /login         /super-admin      /admin              /[tenant]
      auth only      provision         React CMS           public blocks
           │              │              │                      │
           └──────────────┴──────────────┴──────────────────────┘
                                    │
                                    ▼
                         SQLite (./data/sqlite.db)
                         public/uploads/ (disk)
```

---

## 2. Routing and separation of concerns

### 2.1 `/login` — Authentication entry

- **File:** `src/pages/login.astro`
- **Purpose:** Central sign-in for all roles. No admin navigation chrome.
- **Flow:** Form POST → `POST /api/auth/login` → `authenticateUser()` (bcrypt) → session cookie → redirect:
  - Super admin (`users.is_superadmin = true`) → `/super-admin`
  - Tenant admin → `/admin`

### 2.2 `/super-admin` — Platform owner

- **Files:** `src/pages/super-admin/index.astro`, `POST /api/super-admin/create-tenant`
- **Access:** Middleware requires `session.isSuperadmin === true`. Tenant admins are redirected to `/admin`.
- **Purpose:** Manually register customer workspaces (name, slug, admin email, temp password). No public self-sign-up.
- **Side effects:** Inserts `tenants`, `users`, and default `site_content` rows (Hero, Gallery, Contact, About, Features).

### 2.3 `/admin` — Tenant-scoped CMS

- **File:** `src/pages/admin/index.astro`
- **Access:** Middleware requires a valid session. Scope is always **`users.tenant_id`** from the verified session — never from request body or client headers.
- **UI pattern:**
  - **Hero + theme:** Astro HTML forms → `POST /api/admin/pages`, `POST /api/admin/theme`
  - **Gallery, About, Features, Contact:** React islands → `POST /api/admin/{gallery,about,features,contact}` (JSON)
  - **Images:** React upload → `POST /api/admin/upload` (multipart)
- **Constraint:** React islands must **not** import `src/db/` or the ORM. All mutations go through `/api/admin/*`.

### 2.4 `/{tenant}` — Public renderer

- **File:** `src/pages/[tenant]/index.astro`
- **Access:** Public (no session required).
- **Resolution:** `tenants.slug` → `tenants.id` → load `site_content` rows + `theme_config`.
- **Rendering:** Generic block components receive **props only** — no fetch, no secrets, no `if (siteType === 'school')` branching.
- **Block order:** Hero → About → Features → Gallery → Contact (conditional on `has*Content()` helpers).

---

## 3. Middleware and authorization

**File:** `src/middleware.ts`

| Path pattern | Unauthenticated | Tenant admin | Super admin |
|--------------|-----------------|--------------|-------------|
| `/login`, `/api/auth/*` | Allowed | Allowed | Allowed |
| `/admin`, `/api/admin/*` | → `/login` or `401` | Allowed | Allowed (own tenant CMS) |
| `/super-admin`, `/api/super-admin/*` | → `/login` | → `/admin` | Allowed |

Session resolution (`src/services/session.ts`):

1. Read `session` cookie (`userId:tenantId`).
2. Load `users` row by `userId`.
3. Reject if user missing or `tenantId` mismatch (tamper protection).
4. Attach `context.locals.session` for downstream routes.

---

## 4. Database schema (SQLite + Drizzle)

**Schema contract:** `src/db/schema.ts`  
**Runtime client:** `src/db/client.ts` (auto-applies migrations on connect)  
**Migrations:** `src/db/migrations/`

### 4.1 Entity relationship

```
tenants (1) ──< (N) users
   │
   └──< (N) site_content
```

### 4.2 `tenants`

| Column | Purpose |
|--------|---------|
| `id` | Primary key (UUID) |
| `name` | Display name |
| `type` | CMS discriminator only — **never used in public UI branches** |
| `slug` | Public URL key → `/{slug}` |
| `domain` | Logical domain label (e.g. `{slug}.localhost`) |
| `theme_config` | JSON: colors, fonts, site chrome → CSS variables on public pages |

### 4.3 `users`

| Column | Purpose |
|--------|---------|
| `id` | Primary key |
| `email` | Unique login identifier |
| `password_hash` | bcrypt hash only — never plaintext |
| `tenant_id` | FK → `tenants.id` — **one workspace per tenant admin** |
| `is_superadmin` | Platform owner flag |
| `requires_password_change` | Temp password flag (future UX) |

A tenant admin has exactly one workspace. There is no cross-tenant switcher for this role.

### 4.4 `site_content`

| Column | Purpose |
|--------|---------|
| `id` | Primary key |
| `tenant_id` | FK → `tenants.id` (indexed) |
| `block_type` | Discriminator, e.g. `HeroBlock`, `GalleryBlock` |
| `data_json` | JSONB-shaped JSON validated by Zod at service boundary |

**Unique constraint:** `(tenant_id, block_type)` — one row per block type per tenant.

### 4.5 Tenant isolation rule

Every tenant-owned query **must** filter by `tenant_id`:

```ts
// ✅ Required
await db.select().from(siteContent).where(eq(siteContent.tenantId, tenantId));

// ❌ Forbidden
await db.select().from(siteContent);
```

Admin mutations derive `tenantId` from `locals.session.tenantId` (backed by `users.tenant_id`). Public routes resolve slug → id, then query that id only.

---

## 5. Block system

Blocks are the core content abstraction. Each block type has a fixed pipeline:

```
Zod schema  →  Admin editor  →  API route  →  site_content  →  Public Astro component
```

### 5.1 Schema layer

**File:** `src/lib/schema/blocks.ts` (re-exported from `src/types/blocks.ts`)

| Block type | Schema | `site_content.block_type` |
|------------|--------|---------------------------|
| Hero | `HeroBlockSchema` | `HeroBlock` |
| About | `AboutBlockSchema` | `AboutBlock` |
| Features | `FeaturesBlockSchema` | `FeaturesBlock` |
| Gallery | `GalleryBlockSchema` | `GalleryBlock` |
| Contact | `ContactBlockSchema` | `ContactBlock` |

Each schema defines the shape of `data_json`. Optional `has*Content()` helpers control public visibility (empty sections are omitted).

### 5.2 Admin editors (React islands)

| Block | Component | API endpoint |
|-------|-----------|--------------|
| Gallery | `GalleryEditor.tsx` | `POST /api/admin/gallery` |
| About | `AboutEditor.tsx` | `POST /api/admin/about` |
| Features | `FeaturesEditor.tsx` | `POST /api/admin/features` |
| Contact | `ContactEditor.tsx` | `POST /api/admin/contact` |
| Hero | Astro form on `/admin` | `POST /api/admin/pages` |
| Theme | Astro form on `/admin` | `POST /api/admin/theme` |

**Gallery staging UX:** Upload stages preview in the form → user adds caption → **Add to Gallery** → **Publish gallery** writes to DB.

### 5.3 Service layer

**File:** `src/services/tenants.ts`

Functions such as `getHomeHero`, `updateHomeGallery`, `getHomeAbout`, etc.:

1. Accept `tenantId` as first argument.
2. Parse/validate with Zod before read/write.
3. Call `upsertSiteContentByBlockType()` in `src/lib/db.ts`.

### 5.4 Public components

**Directory:** `src/components/public/blocks/`

Pure Astro components. Props in, HTML out. They:

- Parse props with the same Zod schema.
- Use semantic Tailwind tokens (`bg-primary`, `text-foreground`, `font-heading`).
- Never import the database or call `/api/admin/*`.

### 5.5 Adding a new block (checklist)

1. Add `*BlockSchema` to `src/lib/schema/blocks.ts`.
2. Add `getHome*` / `updateHome*` in `src/services/tenants.ts`.
3. Create `POST /api/admin/{block}` with session-scoped upsert.
4. Create React editor in `src/components/admin/` (if interactive).
5. Create `src/components/public/blocks/*Block.astro`.
6. Wire into `src/pages/admin/index.astro` and `src/pages/[tenant]/index.astro`.
7. Add default row in `src/lib/tenantProvisioning.ts` + super-admin create flow.

---

## 6. Authentication

### 6.1 Password storage

- **Library:** `bcryptjs` (10 rounds)
- **File:** `src/lib/auth.ts`
- Only `password_hash` is stored in `users`. Login compares via `bcrypt.compare()`.

### 6.2 Session cookie

- **Name:** `session`
- **Format:** `{userId}:{tenantId}`
- **Flags:** `httpOnly`, `sameSite: 'lax'`, `secure` in production
- **Max age:** 7 days
- **Verification:** Every protected request re-validates against the `users` table (not trust-on-write).

### 6.3 Login API

**File:** `src/pages/api/auth/login.ts`

Form POST → authenticate → set cookie → redirect by role. Invalid credentials redirect to `/login?error=invalid` without distinguishing unknown email vs bad password.

---

## 7. Image uploads

### 7.1 Storage layout

```
{UPLOADS_DIR}/          # default: ./public/uploads
  tenant-{tenantId}/
    {random}.{ext}
```

Configured via `UPLOADS_DIR` in `.env`. Docker mounts this path as a volume for persistence.

### 7.2 Upload API

**File:** `src/pages/api/admin/upload.ts`

- Requires authenticated session.
- Accepts `multipart/form-data` field `file`.
- Allowed: JPEG, PNG, WebP, GIF — max **5 MB**.
- Returns `{ url: "/uploads/tenant-{id}/{filename}" }`.

### 7.3 Serving files

**File:** `src/pages/uploads/[...path].astro` (or equivalent upload route)

Uploaded files are served from disk under `/uploads/...`. Public pages reference these URLs in block JSON; they are not embedded in the SQLite file.

### 7.4 Security notes

- Upload path is scoped by session `tenantId` — admins cannot write to another tenant's folder.
- Filenames are randomized server-side.
- MIME type is validated; extension derived from allowlist.

---

## 8. Theme pipeline

1. Admin saves colors via `POST /api/admin/theme`.
2. `tenants.theme_config` JSON is updated (merged colors).
3. Public layout calls `buildThemeCss()` → injects `:root` CSS variables.
4. Tailwind semantic utilities (`bg-primary`, `bg-background`, etc.) consume those variables.

No per-tenant CSS files. No hardcoded hex in public block components.

---

## 9. Key directories

```
src/db/schema.ts              Drizzle table definitions
src/db/client.ts              SQLite connection + auto-migrate
src/db/seed.ts                Super Admin + Riverside demo
src/lib/db.ts                 Tenant-scoped query helpers
src/lib/auth.ts               bcrypt + user lookup
src/services/session.ts       Cookie encode/decode/verify
src/services/tenants.ts       Block read/write per tenant
src/services/superAdmin.ts      Tenant provisioning
src/middleware.ts             Auth gates
src/pages/api/admin/*         Tenant mutations
src/components/admin/*        React CMS islands
src/components/public/blocks/*  Public renderers
tests/                        Vitest (auth, isolation, maps)
```

---

## 10. Testing strategy

```bash
npm test
```

- **`tests/auth.test.ts`** — login rejection, valid credentials, session shape.
- **`tests/db.test.ts`** — tenant-scoped queries; unscoped reads forbidden in helpers.
- **`tests/googleMapsEmbed.test.ts`** — share URL → embed URL conversion.

Tests use **in-memory SQLite** — no `./data/sqlite.db` required.

---

## 11. Design constraints (non-negotiable)

1. Tenant content lives in **SQLite only** — not JSON/YAML/Markdown CMS files.
2. Public components are **generic** — named by structure (`HeroBlock`), not industry.
3. Admin scope is **`users.tenant_id` from session** — never from the request body alone.
4. SSR stays enabled (`output: 'server'`) — do not revert to static-only export.
5. Client islands do not import the ORM or secrets.

Violating these breaks multi-tenant isolation or the single-app deployment model.
