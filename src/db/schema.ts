import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Isolation model:
 *   users.tenant_id  →  the only workspace a tenant admin may access
 *   site_content.tenant_id / tenants.theme_config  →  scoped by that id
 */

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    /** CMS schema discriminator only — never branch on this in public UI. */
    type: text('type').notNull(),
    /** Public URL key: /[tenant] */
    slug: text('slug').notNull(),
    domain: text('domain').notNull(),
    themeConfig: jsonb('theme_config').notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tenants_slug_uidx').on(table.slug),
    uniqueIndex('tenants_domain_uidx').on(table.domain),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_uidx').on(table.email),
    index('users_tenant_id_idx').on(table.tenantId),
  ],
);

export const siteContent = pgTable(
  'site_content',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** e.g. HeroBlock | GalleryBlock. GalleryBlock data_json: { title?, items: [{ imageUrl, caption? }] } */
    blockType: text('block_type').notNull(),
    dataJson: jsonb('data_json').notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('site_content_tenant_id_idx').on(table.tenantId)],
);

export type TenantRow = typeof tenants.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type SiteContentRow = typeof siteContent.$inferSelect;
