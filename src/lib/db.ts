import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { siteContent, type SiteContentRow } from '@/db/schema';

function requireTenantId(tenantId: string): string {
  const id = tenantId.trim();
  if (!id) {
    throw new Error('tenantId is required for every tenant-owned query');
  }
  return id;
}

/** Read only this workspace's site_content. Never call without a session- or slug-derived tenantId. */
export async function getSiteContentForTenant(tenantId: string): Promise<SiteContentRow[]> {
  const scopedTenantId = requireTenantId(tenantId);
  return getDb().select().from(siteContent).where(eq(siteContent.tenantId, scopedTenantId));
}

/** @deprecated Use getSiteContentForTenant */
export const getBlocksForTenant = getSiteContentForTenant;

export async function updateSiteContentForTenant(
  tenantId: string,
  contentId: string,
  dataJson: Record<string, unknown>,
): Promise<SiteContentRow | undefined> {
  const scopedTenantId = requireTenantId(tenantId);
  const [row] = await getDb()
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
): Promise<SiteContentRow> {
  const scopedTenantId = requireTenantId(tenantId);
  const [row] = await getDb()
    .insert(siteContent)
    .values({ tenantId: scopedTenantId, blockType, dataJson })
    .returning();

  if (!row) {
    throw new Error('Failed to create site_content');
  }
  return row;
}
