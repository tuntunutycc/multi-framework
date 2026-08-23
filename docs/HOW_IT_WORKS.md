# Multi-Framework — How the Project Works

Technical overview of the multi-tenant Astro SSR website builder: architecture, data model, auth, admin CMS, public rendering, and uploads.

For setup commands and day-to-day usage, see **[USAGE.md](./USAGE.md)**.

---

## 1. Product model

This is a **single Astro SSR monolith** (Shopify / Wix style), not a static site and not a separate admin app.

| Surface | Who | Job |
|---------|-----|-----|
| `/login` | Anyone | Central authentication |
| `/admin` | Tenant admin | Edit **only their** website |
| `/[tenant]` | Public visitors | Render that tenant’s published content |

```
Tenant admin
    │
    ▼
 /login  ──session──►  /admin  ──API──►  SQLite (scoped by tenant_id)
                                            │
Public visitor                              │
    │                                       ▼
 /riverside  ◄──── read site_content + theme_config ────┘
```

**Hard rules encoded in the design:**

- One admin user row → one `tenant_id` (no cross-tenant switcher).
- Public UI is a **generic block engine** — no `if (siteType === 'school')` in components.
- Tenant content lives in the **database**, not Markdown/JSON files as the runtime source of truth.

---

## 2. Runtime stack

| Layer | Choice | Role |
|-------|--------|------|
| Framework | Astro 7, `output: 'server'` | SSR pages + API routes |
| Adapter | `@astrojs/node` (standalone) | `node ./dist/server/entry.mjs` |
| Admin UI | React islands (`client:load`) | Interactive gallery editor |
| Public UI | Astro components | Minimal JS, props-only blocks |
| Styling | Tailwind CSS v4 | Semantic tokens (`bg-primary`, `font-heading`) |
| Validation | Zod | Every write/read into UI/API |
| ORM | Drizzle | Typed queries |
| Database | **SQLite** via `better-sqlite3` | File `./data/sqlite.db` |
| Passwords | `bcryptjs` | Hash in `users.password_hash` |

Secrets and DB access stay on the **server**. Client islands call `/api/...`; they never import `src/db/`.

---

## 3. Request routing

### Pages

| URL | File | Behavior |
|-----|------|----------|
| `/` | `src/pages/index.astro` | Simple portal / links |
| `/login` | `src/pages/login.astro` | Login form (no admin chrome) |
| `/admin` | `src/pages/admin/index.astro` | Dashboard: hero form, gallery island, theme form |
| `/[tenant]` | `src/pages/[tenant]/index.astro` | Public home: Hero + Gallery |
| `/[tenant]/...` | `src/pages/[tenant]/[...slug].astro` | Extra pages (only `home` assembled today) |

Nested `/admin/pages`, `/admin/media`, `/admin/settings/theme` only **redirect** to `/admin`.

### APIs

| Method + path | Purpose |
|---------------|---------|
| `POST /api/auth/login` | Verify email/password → set session cookie |
| `POST /api/auth/logout` | Clear session |
| `POST /api/admin/pages` | Save Hero block (title, subtitle, image) |
| `POST /api/admin/gallery` | Replace Gallery JSON for the session tenant |
| `POST /api/admin/theme` | Update theme colors in `tenants.theme_config` |
| `POST /api/admin/upload` | Save image file under `public/uploads/tenant-{id}/` |
| `GET /uploads/...` | Stream uploaded files from disk |

---

## 4. Authentication & isolation

### Login flow

1. User posts email + password to `/api/auth/login`.
2. Server loads `users` by email (`src/lib/auth.ts` → `authenticateUser`).
3. `bcrypt.compare` against `password_hash`.
4. On success, sets HttpOnly cookie:

   ```text
   session = {userId}:{tenantId}
   ```

   Both IDs come from the **database row**, never from the form body as trusted scope.

5. Redirect to `/admin`.

### Middleware (`src/middleware.ts`)

For `/admin` and `/api/admin/*`:

1. Parse the cookie.
2. **`resolveSession`**: load user by id; require `users.tenant_id === cookie tenantId`.
3. Missing/invalid → clear cookie; redirect `/login` or `401` JSON.
4. Valid → `Astro.locals.session = { id, email, tenantId }`.

Public routes (`/[tenant]`, `/uploads`, `/login`) are not gated by login.

### Tenant isolation

Every tenant-owned query goes through helpers in `src/lib/db.ts` that call `requireTenantId()` and filter:

```text
WHERE tenant_id = ?
```

Admin mutations use `locals.session.tenantId` (or the verified cookie).  
Public pages resolve `slug` → `tenants.id`, then load only that id’s rows.

---

## 5. Data model (SQLite)

Defined in `src/db/schema.ts`:

### `tenants`

| Column | Meaning |
|--------|---------|
| `id` | Text PK |
| `slug` | Public URL key (`/riverside`) |
| `name`, `type`, `domain` | Identity / CMS discriminator |
| `theme_config` | JSON: theme tokens + site chrome/SEO/nav |

### `users`

| Column | Meaning |
|--------|---------|
| `id` | Text PK |
| `email` | Unique login |
| `password_hash` | bcrypt hash |
| `tenant_id` | FK → that admin’s only workspace |

### `site_content`

| Column | Meaning |
|--------|---------|
| `id` | Text PK |
| `tenant_id` | Isolation key |
| `block_type` | e.g. `HeroBlock`, `GalleryBlock` |
| `data_json` | Zod-validated block props |

Unique index: one row per `(tenant_id, block_type)` for home blocks.

Migrations live in `src/db/migrations/`. Opening the DB applies them automatically (`src/db/client.ts`). Seed script: `npm run db:seed`.

---

## 6. Admin → database → public (data flow)

### Hero (text & image)

```
Admin form (Astro)
  → POST /api/admin/pages
  → Zod HeroBlockSchema
  → updateHomeHero(tenantId, props)   // strips CTA (removed from product)
  → upsert site_content (block_type = HeroBlock)
  → GET /[tenant] → getHomeHero → HeroBlock.astro
```

### Gallery (images + captions)

```
GalleryEditor (React island)
  → POST /api/admin/upload     // file → disk + public URL
  → local state (add / edit / delete)
  → POST /api/admin/gallery    // full items[] JSON
  → Zod GalleryBlockSchema
  → updateHomeGallery(tenantId, props)
  → upsert site_content (block_type = GalleryBlock)
  → GET /[tenant] → getHomeGallery → GalleryBlock.astro
```

Uploads are **not** stored in SQLite blobs. Files go to:

```text
public/uploads/tenant-{sanitizedTenantId}/{timestamp}-{random}.ext
```

Public URL: `/uploads/tenant-…/file.png`, served by `src/pages/uploads/[...path].ts`.

### Theme

```
Admin color inputs
  → POST /api/admin/theme
  → merge into tenants.theme_config.theme.colors
  → PublicLayout → buildThemeCss() → :root CSS variables
  → Tailwind semantic classes on public blocks
```

---

## 7. Public renderer

`src/pages/[tenant]/index.astro`:

1. `getTenantBySlug(params.tenant)` → 404 if missing  
2. Load `siteConfig` + `theme` from `theme_config`  
3. Load `HeroBlock` + `GalleryBlock` from `site_content`  
4. Pass props into:

   - `HeroBlock.astro` — title, subtitle, image (no CTA button in current product)
   - `GalleryBlock.astro` — CSS grid of images + captions  

Layouts:

- `PublicLayout.astro` — fonts, SEO, skip-link, theme CSS  
- `AdminLayout.astro` — dashboard chrome + logout  

Blocks are **props-only**: no fetch, no ORM, no tenant branching.

---

## 8. Services layer

| Module | Responsibility |
|--------|----------------|
| `src/services/tenants.ts` | Async read/write API used by pages (hero, gallery, theme, tenant lookup) |
| `src/lib/db.ts` | Low-level Drizzle queries; always `tenant_id`-scoped |
| `src/lib/auth.ts` | Hash / verify / `authenticateUser` |
| `src/services/session.ts` | Cookie encode/parse / `resolveSession` |
| `src/lib/uploads.ts` | Safe disk write + public URL |
| `src/lib/theme/*` | Parse `theme_config`, emit CSS variables |

---

## 9. Validation boundaries

Zod schemas in `src/lib/schema/blocks.ts`:

- `HeroBlockSchema` — title, optional subtitle, image `{ src, alt }`, optional `cta` (unused in UI)
- `GalleryBlockSchema` — optional title, `items[{ imageUrl, caption? }]`

Used when:

- Saving from admin APIs  
- Reading into public/admin UI  

Invalid payloads fail closed (redirect or `400`).

---

## 10. Multi-tenancy & super admin

**Provisioning model:** no public sign-up. The platform owner uses `/super-admin`.

| Account | Seed | Access |
|---------|------|--------|
| Super admin | `admin@mydomain.com` | `/super-admin` — create tenants + users |
| Tenant admin | e.g. Riverside / newly created | `/admin` — edit only their `tenant_id` |

`users.is_superadmin` gates middleware for `/super-admin` and `/api/super-admin/*`.  
New tenant admins get `requires_password_change = true` (flag for a future forced-reset UI).

Creating a tenant (`POST /api/super-admin/create-tenant`):

1. Insert `tenants` row (default theme_config)  
2. Insert `users` row (bcrypt temp password, linked `tenant_id`)  
3. Seed empty `HeroBlock` + `GalleryBlock` so `/{slug}` renders immediately  

**Not built yet:** self-serve signup, custom domains at the edge, password-change UI that clears `requires_password_change`, more block types.

---

## 11. Tests

`npm test` (Vitest + in-memory SQLite):

- Invalid credentials rejected  
- Valid login yields session tied to `tenant_id`  
- Tampered cookie tenant id detected  
- `requireTenantId` / empty tenant queries fail  
- `site_content` queries return only that tenant’s rows  

---

## 12. Mental model (one paragraph)

A tenant admin signs in; middleware binds the request to their `users.tenant_id`. Admin forms and the gallery island write Zod-validated JSON into SQLite (`site_content` / `theme_config`) and image files onto disk. The public site for `/[slug]` loads only that tenant’s rows and renders generic Astro blocks styled by CSS variables from `theme_config`. One codebase, two surfaces, strict tenant isolation at every query.

---

## Related docs

| Doc | Contents |
|-----|----------|
| [USAGE.md](./USAGE.md) | Install, run, login, gallery how-to, troubleshooting |
| [README.md](../README.md) | Short project overview |
| `.cursorrules` | Non-negotiable product/architecture constraints for contributors |
