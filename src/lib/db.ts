import { and, eq } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db/client';
import { siteContent, tenants, users, type SiteContentRow, type TenantRow, type UserRow } from '@/db/schema';

function db(client?: AppDb): AppDb {
  return client ?? getDb();
}

export function requireTenantId(tenantId: string | null | undefined): string {
  const id = typeof tenantId === 'string' ? tenantId.trim() : '';
  if (!id) {
    throw new Error('tenantId is required for every tenant-owned query');
  }
  return id;
}

export async function getTenantRowBySlug(
  slug: string,
  client?: AppDb,
): Promise<TenantRow | undefined> {
  const [row] = await db(client)
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug.trim()))
    .limit(1);
  return row;
}

export async function getTenantRowById(
  tenantId: string,
  client?: AppDb,
): Promise<TenantRow | undefined> {
  const scoped = requireTenantId(tenantId);
  const [row] = await db(client).select().from(tenants).where(eq(tenants.id, scoped)).limit(1);
  return row;
}

/** Read only this workspace's site_content. Never call without a session- or slug-derived tenantId. */
export async function getSiteContentForTenant(
  tenantId: string,
  client?: AppDb,
): Promise<SiteContentRow[]> {
  const scopedTenantId = requireTenantId(tenantId);
  return db(client)
    .select()
    .from(siteContent)
    .where(eq(siteContent.tenantId, scopedTenantId));
}

export async function getSiteContentByBlockType(
  tenantId: string,
  blockType: string,
  client?: AppDb,
): Promise<SiteContentRow | undefined> {
  const scopedTenantId = requireTenantId(tenantId);
  const [row] = await db(client)
    .select()
    .from(siteContent)
    .where(and(eq(siteContent.tenantId, scopedTenantId), eq(siteContent.blockType, blockType)))
    .limit(1);
  return row;
}

export async function updateSiteContentForTenant(
  tenantId: string,
  contentId: string,
  dataJson: Record<string, unknown>,
  client?: AppDb,
): Promise<SiteContentRow | undefined> {
  const scopedTenantId = requireTenantId(tenantId);
  const [row] = await db(client)
    .update(siteContent)
    .set({ dataJson, updatedAt: new Date() })
    .where(and(eq(siteContent.id, contentId), eq(siteContent.tenantId, scopedTenantId)))
    .returning();
  return row;
}

export async function createSiteContentForTenant(
  tenantId: string,
  blockType: string,
  dataJson: Record<string, unknown>,
  client?: AppDb,
): Promise<SiteContentRow> {
  const scopedTenantId = requireTenantId(tenantId);
  const [row] = await db(client)
    .insert(siteContent)
    .values({ tenantId: scopedTenantId, blockType, dataJson })
    .returning();

  if (!row) {
    throw new Error('Failed to create site_content');
  }
  return row;
}

export async function upsertSiteContentByBlockType(
  tenantId: string,
  blockType: string,
  dataJson: Record<string, unknown>,
  client?: AppDb,
): Promise<SiteContentRow> {
  const existing = await getSiteContentByBlockType(tenantId, blockType, client);
  if (existing) {
    const updated = await updateSiteContentForTenant(tenantId, existing.id, dataJson, client);
    if (!updated) {
      throw new Error('Failed to update site_content');
    }
    return updated;
  }
  return createSiteContentForTenant(tenantId, blockType, dataJson, client);
}

export async function updateTenantThemeConfig(
  tenantId: string,
  themeConfig: Record<string, unknown>,
  client?: AppDb,
): Promise<TenantRow | undefined> {
  const scopedTenantId = requireTenantId(tenantId);
  const [row] = await db(client)
    .update(tenants)
    .set({ themeConfig })
    .where(eq(tenants.id, scopedTenantId))
    .returning();
  return row;
}

export async function getUserByEmail(
  email: string,
  client?: AppDb,
): Promise<UserRow | undefined> {
  const [row] = await db(client)
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return row;
}

export async function getUserById(userId: string, client?: AppDb): Promise<UserRow | undefined> {
  const id = userId.trim();
  if (!id) return undefined;
  const [row] = await db(client).select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

/** @deprecated Use getSiteContentForTenant */
export const getBlocksForTenant = getSiteContentForTenant;
