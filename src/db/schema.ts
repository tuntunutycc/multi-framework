import { randomUUID } from 'node:crypto';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Isolation model:
 *   users.tenant_id  →  the only workspace a tenant admin may access
 *   site_content.tenant_id / tenants.theme_config  →  scoped by that id
 *
 * SQLite file DB (better-sqlite3) — no separate database server.
 */

export const tenants = sqliteTable(
  'tenants',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text('name').notNull(),
    /** CMS schema discriminator only — never branch on this in public UI. */
    type: text('type').notNull(),
    /** Public URL key: /[tenant] */
    slug: text('slug').notNull(),
    domain: text('domain').notNull(),
    themeConfig: text('theme_config', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('tenants_slug_uidx').on(table.slug),
    uniqueIndex('tenants_domain_uidx').on(table.domain),
  ],
);

export const users = sqliteTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('users_email_uidx').on(table.email),
    index('users_tenant_id_idx').on(table.tenantId),
  ],
);

export const siteContent = sqliteTable(
  'site_content',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** e.g. HeroBlock | GalleryBlock */
    blockType: text('block_type').notNull(),
    dataJson: text('data_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('site_content_tenant_id_idx').on(table.tenantId),
    uniqueIndex('site_content_tenant_block_uidx').on(table.tenantId, table.blockType),
  ],
);

export type TenantRow = typeof tenants.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type SiteContentRow = typeof siteContent.$inferSelect;
