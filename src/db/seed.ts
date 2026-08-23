import { fileURLToPath } from 'node:url';
import { hashPassword } from '../lib/auth';
import { getDb, resetDbCache } from './client';
import { siteContent, tenants, users } from './schema';
import { buildDefaultThemeConfig } from '../lib/tenantProvisioning';
import { buildRiversideThemeConfig, riversideDemo } from './seedDemo';

/** Demo customer tenant */
export const SEED_TENANT_ID = '11111111-1111-4111-8111-111111111111';
export const SEED_USER_ID = '22222222-2222-4222-8222-222222222222';
export const SEED_ADMIN_EMAIL = 'admin@riverside.example';
export const SEED_ADMIN_PASSWORD = 'password123';

/** Platform owner (super admin) — not a customer CMS workspace */
export const SYSTEM_TENANT_ID = '00000000-0000-4000-8000-000000000001';
export const SUPER_ADMIN_USER_ID = '00000000-0000-4000-8000-000000000002';
export const SUPER_ADMIN_EMAIL = 'admin@mydomain.com';
export const SUPER_ADMIN_PASSWORD = 'password123';

export async function seedDatabase(): Promise<void> {
  resetDbCache();
  const db = getDb();
  const riversideTheme = buildRiversideThemeConfig();
  const systemTheme = buildDefaultThemeConfig('System Admin');
  const riversideHash = await hashPassword(SEED_ADMIN_PASSWORD);
  const superHash = await hashPassword(SUPER_ADMIN_PASSWORD);

  // --- System tenant + super admin ---
  await db
    .insert(tenants)
    .values({
      id: SYSTEM_TENANT_ID,
      name: 'System Admin',
      type: 'system',
      slug: 'system',
      domain: 'system.localhost',
      themeConfig: systemTheme as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: tenants.id });

  await db
    .insert(users)
    .values({
      id: SUPER_ADMIN_USER_ID,
      email: SUPER_ADMIN_EMAIL,
      passwordHash: superHash,
      tenantId: SYSTEM_TENANT_ID,
      isSuperadmin: true,
      requiresPasswordChange: false,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: SUPER_ADMIN_EMAIL,
        passwordHash: superHash,
        tenantId: SYSTEM_TENANT_ID,
        isSuperadmin: true,
        requiresPasswordChange: false,
      },
    });

  // --- Demo customer: Riverside ---
  await db
    .insert(tenants)
    .values({
      id: SEED_TENANT_ID,
      name: riversideDemo.identity.name,
      type: riversideDemo.siteType,
      slug: 'riverside',
      domain: 'riverside.localhost',
      themeConfig: riversideTheme as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: tenants.id,
      set: {
        name: riversideDemo.identity.name,
        themeConfig: riversideTheme as unknown as Record<string, unknown>,
      },
    });

  await db
    .insert(users)
    .values({
      id: SEED_USER_ID,
      email: SEED_ADMIN_EMAIL,
      passwordHash: riversideHash,
      tenantId: SEED_TENANT_ID,
      isSuperadmin: false,
      requiresPasswordChange: false,
    })
    .onConflictDoNothing({ target: users.id });

  await db
    .insert(siteContent)
    .values({
      tenantId: SEED_TENANT_ID,
      blockType: 'HeroBlock',
      dataJson: riversideDemo.hero as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: [siteContent.tenantId, siteContent.blockType],
      set: {
        dataJson: riversideDemo.hero as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(siteContent)
    .values({
      tenantId: SEED_TENANT_ID,
      blockType: 'GalleryBlock',
      dataJson: riversideDemo.gallery as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: [siteContent.tenantId, siteContent.blockType] });

  await db
    .insert(siteContent)
    .values({
      tenantId: SEED_TENANT_ID,
      blockType: 'ContactBlock',
      dataJson: riversideDemo.contact as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: [siteContent.tenantId, siteContent.blockType] });

  await db
    .insert(siteContent)
    .values({
      tenantId: SEED_TENANT_ID,
      blockType: 'AboutBlock',
      dataJson: riversideDemo.about as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: [siteContent.tenantId, siteContent.blockType] });

  await db
    .insert(siteContent)
    .values({
      tenantId: SEED_TENANT_ID,
      blockType: 'FeaturesBlock',
      dataJson: riversideDemo.featuresBlock as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: [siteContent.tenantId, siteContent.blockType],
      set: {
        dataJson: riversideDemo.featuresBlock as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      },
    });

  console.log('Seed complete.');
  console.log(`  Super admin: ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD} → /super-admin`);
  console.log(`  Tenant admin: ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD} → /admin (/riverside)`);
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
