import type { AppDb } from '@/db/client';
import type { SiteConfig, Tenant, Theme, ThemeColors } from '@/db/types';
import {
  getSiteContentByBlockType,
  getSiteContentForTenant,
  getTenantRowById,
  getTenantRowBySlug,
  requireTenantId,
  updateTenantThemeConfig,
  upsertSiteContentByBlockType,
} from '@/lib/db';
import {
  mergeThemeColors,
  parseTenantThemeConfig,
  toSiteConfig,
  toTheme,
} from '@/lib/theme/themeConfig';
import {
  AboutBlockSchema,
  ContactBlockSchema,
  FeaturesBlockSchema,
  GalleryBlockSchema,
  HeroBlockSchema,
  type AboutBlockProps,
  type ContactBlockProps,
  type FeaturesBlockProps,
  type GalleryBlockProps,
  type HeroBlockProps,
} from '@/types/blocks';

function mapTenant(row: NonNullable<Awaited<ReturnType<typeof getTenantRowById>>>): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: 'active',
    siteType: row.type,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getTenantBySlug(
  slug: string,
  client?: AppDb,
): Promise<Tenant | undefined> {
  const row = await getTenantRowBySlug(slug, client);
  return row ? mapTenant(row) : undefined;
}

export async function getTenantById(
  tenantId: string,
  client?: AppDb,
): Promise<Tenant | undefined> {
  requireTenantId(tenantId);
  const row = await getTenantRowById(tenantId, client);
  return row ? mapTenant(row) : undefined;
}

export async function getThemeByTenantId(
  tenantId: string,
  client?: AppDb,
): Promise<Theme | undefined> {
  const row = await getTenantRowById(requireTenantId(tenantId), client);
  if (!row) return undefined;
  return toTheme(row.id, parseTenantThemeConfig(row.themeConfig));
}

export async function getSiteConfigByTenantId(
  tenantId: string,
  client?: AppDb,
): Promise<SiteConfig | undefined> {
  const row = await getTenantRowById(requireTenantId(tenantId), client);
  if (!row) return undefined;
  return toSiteConfig(row.id, parseTenantThemeConfig(row.themeConfig));
}

/**
 * Home page is assembled from site_content rows
 * (HeroBlock, AboutBlock, FeaturesBlock, GalleryBlock, ContactBlock).
 * Other slugs are not stored yet — returns undefined.
 */
export async function getPublishedPage(
  tenantId: string,
  slug: string,
  client?: AppDb,
) {
  requireTenantId(tenantId);
  if (slug !== 'home') return undefined;

  const rows = await getSiteContentForTenant(tenantId, client);
  const blocks = rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    type: row.blockType as
      | 'HeroBlock'
      | 'AboutBlock'
      | 'FeaturesBlock'
      | 'GalleryBlock'
      | 'ContactBlock',
    props: row.dataJson,
  }));

  return {
    id: `page-${tenantId}-home`,
    tenantId,
    slug: 'home',
    title: 'Home',
    description: '',
    status: 'published' as const,
    blocks,
  };
}

export async function getHomeHero(
  tenantId: string,
  client?: AppDb,
): Promise<HeroBlockProps | undefined> {
  const row = await getSiteContentByBlockType(requireTenantId(tenantId), 'HeroBlock', client);
  if (!row) return undefined;
  return HeroBlockSchema.parse(row.dataJson);
}

export async function updateHomeHero(
  tenantId: string,
  props: HeroBlockProps,
  client?: AppDb,
): Promise<boolean> {
  const parsed = HeroBlockSchema.parse(props);
  // Persist without CTA — product no longer uses a hero button
  const { cta: _cta, ...withoutCta } = parsed;
  await upsertSiteContentByBlockType(
    requireTenantId(tenantId),
    'HeroBlock',
    withoutCta as unknown as Record<string, unknown>,
    client,
  );
  return true;
}

export async function getHomeGallery(
  tenantId: string,
  client?: AppDb,
): Promise<GalleryBlockProps> {
  const row = await getSiteContentByBlockType(requireTenantId(tenantId), 'GalleryBlock', client);
  if (!row) {
    return { title: '', items: [] };
  }
  return GalleryBlockSchema.parse(row.dataJson);
}

export async function updateHomeGallery(
  tenantId: string,
  props: GalleryBlockProps,
  client?: AppDb,
): Promise<boolean> {
  const parsed = GalleryBlockSchema.parse(props);
  await upsertSiteContentByBlockType(
    requireTenantId(tenantId),
    'GalleryBlock',
    parsed as unknown as Record<string, unknown>,
    client,
  );
  return true;
}

export function emptyContact(): ContactBlockProps {
  return {
    address: '',
    phone: '',
    email: '',
    openingHours: '',
  };
}

export async function getHomeContact(
  tenantId: string,
  client?: AppDb,
): Promise<ContactBlockProps> {
  const row = await getSiteContentByBlockType(requireTenantId(tenantId), 'ContactBlock', client);
  if (!row) {
    return emptyContact();
  }
  return ContactBlockSchema.parse(row.dataJson);
}

export async function updateHomeContact(
  tenantId: string,
  props: ContactBlockProps,
  client?: AppDb,
): Promise<boolean> {
  const parsed = ContactBlockSchema.parse(props);
  await upsertSiteContentByBlockType(
    requireTenantId(tenantId),
    'ContactBlock',
    parsed as unknown as Record<string, unknown>,
    client,
  );
  return true;
}

export function emptyAbout(): AboutBlockProps {
  return {
    title: '',
    content: '',
    imagePosition: 'left',
  };
}

export async function getHomeAbout(
  tenantId: string,
  client?: AppDb,
): Promise<AboutBlockProps> {
  const row = await getSiteContentByBlockType(requireTenantId(tenantId), 'AboutBlock', client);
  if (!row) {
    return emptyAbout();
  }
  return AboutBlockSchema.parse(row.dataJson);
}

export async function updateHomeAbout(
  tenantId: string,
  props: AboutBlockProps,
  client?: AppDb,
): Promise<boolean> {
  const parsed = AboutBlockSchema.parse(props);
  await upsertSiteContentByBlockType(
    requireTenantId(tenantId),
    'AboutBlock',
    parsed as unknown as Record<string, unknown>,
    client,
  );
  return true;
}

export function emptyFeatures(): FeaturesBlockProps {
  return {
    title: '',
    features: [],
  };
}

export async function getHomeFeatures(
  tenantId: string,
  client?: AppDb,
): Promise<FeaturesBlockProps> {
  const row = await getSiteContentByBlockType(requireTenantId(tenantId), 'FeaturesBlock', client);
  if (!row) {
    return emptyFeatures();
  }
  return FeaturesBlockSchema.parse(row.dataJson);
}

export async function updateHomeFeatures(
  tenantId: string,
  props: FeaturesBlockProps,
  client?: AppDb,
): Promise<boolean> {
  const parsed = FeaturesBlockSchema.parse(props);
  await upsertSiteContentByBlockType(
    requireTenantId(tenantId),
    'FeaturesBlock',
    parsed as unknown as Record<string, unknown>,
    client,
  );
  return true;
}

export async function updateThemeColors(
  tenantId: string,
  colors: Pick<ThemeColors, 'primary' | 'secondary' | 'background' | 'foreground'>,
  client?: AppDb,
): Promise<boolean> {
  const row = await getTenantRowById(requireTenantId(tenantId), client);
  if (!row) return false;

  const current = parseTenantThemeConfig(row.themeConfig);
  const next = mergeThemeColors(current, colors);
  const updated = await updateTenantThemeConfig(
    tenantId,
    next as unknown as Record<string, unknown>,
    client,
  );
  return Boolean(updated);
}
