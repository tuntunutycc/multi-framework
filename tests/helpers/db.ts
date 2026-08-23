import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { createSqliteDb, setDbOverride, type AppDb } from '@/db/client';
import { hashPassword } from '@/lib/auth';
import { siteContent, tenants, users } from '@/db/schema';
import type { TenantThemeConfig } from '@/lib/theme/themeConfig';

const migrationsFolder = path.join(process.cwd(), 'src/db/migrations');

export const TEST_TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const TEST_TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const TEST_USER_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const TEST_USER_EMAIL = 'admin@example.com';
export const TEST_USER_PASSWORD = 'correct-horse-battery';

const minimalTheme: TenantThemeConfig = {
  theme: {
    colors: {
      primary: '#000000',
      secondary: '#111111',
      accent: '#222222',
      background: '#ffffff',
      surface: '#ffffff',
      foreground: '#000000',
      muted: '#666666',
      border: '#dddddd',
      success: '#008000',
      warning: '#cccc00',
      danger: '#cc0000',
      primaryForeground: '#ffffff',
      secondaryForeground: '#000000',
    },
    radius: { sm: '0.25rem', md: '0.5rem', lg: '1rem' },
    shadow: { sm: 'none', md: 'none' },
    containerMax: '72rem',
    headingFont: 'serif',
    bodyFont: 'sans-serif',
    scale: 'md',
  },
  site: {
    identity: {
      name: 'Test School',
      logo: { src: '/logo.svg', alt: 'Logo' },
      favicon: '/favicon.svg',
      language: 'en',
      locale: 'en-US',
    },
    seo: {
      titleTemplate: '%s | Test',
      defaultDescription: 'Test site',
      canonicalBase: 'https://example.com',
    },
    chrome: { skipToContentLabel: 'Skip' },
    navigation: [],
    features: {},
  },
};

export async function createTestDb(): Promise<AppDb> {
  const db = createSqliteDb(':memory:');
  migrate(db, { migrationsFolder });
  setDbOverride(db);
  return db;
}

export async function seedTestFixtures(db: AppDb): Promise<void> {
  const passwordHash = await hashPassword(TEST_USER_PASSWORD);

  db.insert(tenants)
    .values([
      {
        id: TEST_TENANT_A,
        name: 'Tenant A',
        type: 'school',
        slug: 'tenant-a',
        domain: 'a.localhost',
        themeConfig: minimalTheme as unknown as Record<string, unknown>,
      },
      {
        id: TEST_TENANT_B,
        name: 'Tenant B',
        type: 'school',
        slug: 'tenant-b',
        domain: 'b.localhost',
        themeConfig: minimalTheme as unknown as Record<string, unknown>,
      },
    ])
    .run();

  db.insert(users)
    .values({
      id: TEST_USER_A,
      email: TEST_USER_EMAIL,
      passwordHash,
      tenantId: TEST_TENANT_A,
    })
    .run();

  db.insert(siteContent)
    .values({
      tenantId: TEST_TENANT_A,
      blockType: 'HeroBlock',
      dataJson: {
        title: 'Hello A',
        image: { src: '/a.svg', alt: 'A' },
      },
    })
    .run();

  db.insert(siteContent)
    .values({
      tenantId: TEST_TENANT_B,
      blockType: 'HeroBlock',
      dataJson: {
        title: 'Hello B',
        image: { src: '/b.svg', alt: 'B' },
      },
    })
    .run();
}

export function clearTestDb(): void {
  setDbOverride(undefined);
}
