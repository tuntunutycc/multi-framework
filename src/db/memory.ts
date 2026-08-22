import type { Block, Page, SiteConfig, Tenant, Theme } from './types';
import siteConfigSeed from '@/data/site-config.json';
import homepageSeed from '@/data/homepage.json';

const TENANT_ID = 'tenant_riverside';

const tenant: Tenant = {
  id: TENANT_ID,
  slug: 'riverside',
  name: siteConfigSeed.identity.name,
  status: 'active',
  siteType: siteConfigSeed.siteType,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const theme: Theme = {
  tenantId: TENANT_ID,
  colors: siteConfigSeed.theme.colors,
  radius: siteConfigSeed.theme.radius,
  shadow: siteConfigSeed.theme.shadow,
  containerMax: siteConfigSeed.theme.containerMax,
  headingFont: siteConfigSeed.typography.headingFont,
  bodyFont: siteConfigSeed.typography.bodyFont,
  scale: siteConfigSeed.typography.scale as Theme['scale'],
  fontSourceUrl: siteConfigSeed.typography.fontSourceUrl,
  preconnect: siteConfigSeed.typography.preconnect,
};

const siteConfig: SiteConfig = {
  tenantId: TENANT_ID,
  identity: siteConfigSeed.identity,
  seo: siteConfigSeed.seo,
  chrome: siteConfigSeed.chrome,
  navigation: siteConfigSeed.navigation,
  features: siteConfigSeed.features,
};

const homeBlocks: Block[] = homepageSeed.blocks.map((block) => ({
  id: block.id,
  tenantId: TENANT_ID,
  type: block.type,
  props: block.props as Record<string, unknown>,
}));

const homePage: Page = {
  id: 'page_riverside_home',
  tenantId: TENANT_ID,
  slug: 'home',
  title: homepageSeed.title,
  description: homepageSeed.description,
  status: 'published',
  blocks: homeBlocks,
};

export const memoryDb = {
  tenants: [tenant],
  themes: [theme],
  siteConfigs: [siteConfig],
  pages: [homePage],
};
