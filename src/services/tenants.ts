import type { Page, SiteConfig, Tenant, Theme, ThemeColors } from '@/db/types';
import { memoryDb } from '@/db';
import {
  GalleryBlockSchema,
  HeroBlockSchema,
  type GalleryBlockProps,
  type HeroBlockProps,
} from '@/types/blocks';

export function getTenantBySlug(slug: string): Tenant | undefined {
  return memoryDb.tenants.find((row) => row.slug === slug && row.status === 'active');
}

export function getTenantById(tenantId: string): Tenant | undefined {
  return memoryDb.tenants.find((row) => row.id === tenantId);
}

export function getThemeByTenantId(tenantId: string): Theme | undefined {
  return memoryDb.themes.find((row) => row.tenantId === tenantId);
}

export function getSiteConfigByTenantId(tenantId: string): SiteConfig | undefined {
  return memoryDb.siteConfigs.find((row) => row.tenantId === tenantId);
}

export function getPublishedPage(tenantId: string, slug: string): Page | undefined {
  return memoryDb.pages.find(
    (row) => row.tenantId === tenantId && row.slug === slug && row.status === 'published',
  );
}

export function getHomeHero(tenantId: string): HeroBlockProps | undefined {
  const page = getPublishedPage(tenantId, 'home');
  const hero = page?.blocks.find((block) => block.type === 'HeroBlock');
  if (!hero) return undefined;
  return HeroBlockSchema.parse(hero.props);
}

export function updateHomeHero(tenantId: string, props: HeroBlockProps): boolean {
  const page = memoryDb.pages.find((row) => row.tenantId === tenantId && row.slug === 'home');
  if (!page) return false;

  const parsed = HeroBlockSchema.parse(props);
  const index = page.blocks.findIndex((block) => block.type === 'HeroBlock');

  if (index === -1) {
    page.blocks.push({
      id: 'home-hero',
      tenantId,
      type: 'HeroBlock',
      props: parsed,
    });
    return true;
  }

  const current = page.blocks[index];
  if (!current) return false;
  page.blocks[index] = { ...current, tenantId, props: parsed };
  return true;
}

export function getHomeGallery(tenantId: string): GalleryBlockProps {
  const page = getPublishedPage(tenantId, 'home');
  const gallery = page?.blocks.find((block) => block.type === 'GalleryBlock');
  if (!gallery) {
    return { title: '', items: [] };
  }
  return GalleryBlockSchema.parse(gallery.props);
}

export function updateHomeGallery(tenantId: string, props: GalleryBlockProps): boolean {
  const page = memoryDb.pages.find((row) => row.tenantId === tenantId && row.slug === 'home');
  if (!page) return false;

  const parsed = GalleryBlockSchema.parse(props);
  const index = page.blocks.findIndex((block) => block.type === 'GalleryBlock');

  if (index === -1) {
    page.blocks.push({
      id: 'home-gallery',
      tenantId,
      type: 'GalleryBlock',
      props: parsed,
    });
    return true;
  }

  const current = page.blocks[index];
  if (!current) return false;
  page.blocks[index] = { ...current, tenantId, props: parsed };
  return true;
}

export function updateThemeColors(
  tenantId: string,
  colors: Pick<ThemeColors, 'primary' | 'secondary' | 'background' | 'foreground'>,
): boolean {
  const theme = memoryDb.themes.find((row) => row.tenantId === tenantId);
  if (!theme) return false;
  theme.colors = { ...theme.colors, ...colors };
  return true;
}
