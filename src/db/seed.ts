import { fileURLToPath } from 'node:url';
import { hashPassword } from '../lib/auth';
import { getDb, resetDbCache } from './client';
import { siteContent, tenants, users } from './schema';
import type { TenantThemeConfig } from '../lib/theme/themeConfig';
import siteConfigSeed from '../data/site-config.json';
import homepageSeed from '../data/homepage.json';

/** Stable IDs for local demo / docs */
export const SEED_TENANT_ID = '11111111-1111-4111-8111-111111111111';
export const SEED_USER_ID = '22222222-2222-4222-8222-222222222222';
export const SEED_ADMIN_EMAIL = 'admin@riverside.example';
export const SEED_ADMIN_PASSWORD = 'password123';

function buildThemeConfig(): TenantThemeConfig {
  return {
    theme: {
      colors: siteConfigSeed.theme.colors,
      radius: siteConfigSeed.theme.radius,
      shadow: siteConfigSeed.theme.shadow,
      containerMax: siteConfigSeed.theme.containerMax,
      headingFont: siteConfigSeed.typography.headingFont,
      bodyFont: siteConfigSeed.typography.bodyFont,
      scale: siteConfigSeed.typography.scale as 'sm' | 'md' | 'lg',
      fontSourceUrl: siteConfigSeed.typography.fontSourceUrl,
      preconnect: siteConfigSeed.typography.preconnect,
    },
    site: {
      identity: siteConfigSeed.identity,
      seo: siteConfigSeed.seo,
      chrome: siteConfigSeed.chrome,
      navigation: siteConfigSeed.navigation,
      features: siteConfigSeed.features,
    },
  };
}

export async function seedDatabase(): Promise<void> {
  resetDbCache();
  const db = getDb();
  const themeConfig = buildThemeConfig();
  const passwordHash = await hashPassword(SEED_ADMIN_PASSWORD);

  await db
    .insert(tenants)
    .values({
      id: SEED_TENANT_ID,
      name: siteConfigSeed.identity.name,
      type: siteConfigSeed.siteType,
      slug: 'riverside',
      domain: 'riverside.localhost',
      themeConfig: themeConfig as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: tenants.id });

  await db
    .insert(users)
    .values({
      id: SEED_USER_ID,
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      tenantId: SEED_TENANT_ID,
    })
    .onConflictDoNothing({ target: users.id });

  const hero = homepageSeed.blocks.find((b) => b.type === 'HeroBlock');
  const gallery = homepageSeed.blocks.find((b) => b.type === 'GalleryBlock');

  if (hero) {
    await db
      .insert(siteContent)
      .values({
        tenantId: SEED_TENANT_ID,
        blockType: 'HeroBlock',
        dataJson: hero.props as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: [siteContent.tenantId, siteContent.blockType],
        set: {
          dataJson: hero.props as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });
  }

  if (gallery) {
    await db
      .insert(siteContent)
      .values({
        tenantId: SEED_TENANT_ID,
        blockType: 'GalleryBlock',
        dataJson: gallery.props as Record<string, unknown>,
      })
      .onConflictDoNothing({ target: [siteContent.tenantId, siteContent.blockType] });
  }

  console.log('Seed complete.');
  console.log(`  Tenant slug: riverside (${SEED_TENANT_ID})`);
  console.log(`  Admin: ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
