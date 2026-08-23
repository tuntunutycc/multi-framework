import { eq } from 'drizzle-orm';
import type { AppDb } from '@/db/client';
import { getDb } from '@/db/client';
import { siteContent, tenants, users, type TenantRow, type UserRow } from '@/db/schema';
import { hashPassword } from '@/lib/auth';
import {
  buildDefaultAbout,
  buildDefaultContact,
  buildDefaultFeatures,
  buildDefaultGallery,
  buildDefaultHero,
  buildDefaultThemeConfig,
  isValidTenantSlug,
  normalizeTenantSlug,
} from '@/lib/tenantProvisioning';

export type CreateTenantInput = {
  name: string;
  slug: string;
  adminEmail: string;
  temporaryPassword: string;
  /** Defaults to "site" — CMS discriminator only. */
  type?: string;
};

export type CreateTenantResult =
  | { ok: true; tenant: TenantRow; user: UserRow }
  | { ok: false; error: string; status: number };

function db(client?: AppDb): AppDb {
  return client ?? getDb();
}

export async function listTenants(client?: AppDb): Promise<TenantRow[]> {
  return db(client).select().from(tenants);
}

/**
 * Platform owner action: create a tenant + first admin user (temp password).
 * Does not create superadmins. New user has requiresPasswordChange = true.
 */
export async function createTenantWithAdmin(
  input: CreateTenantInput,
  client?: AppDb,
): Promise<CreateTenantResult> {
  const database = db(client);
  const name = input.name.trim();
  const slug = normalizeTenantSlug(input.slug);
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const temporaryPassword = input.temporaryPassword;
  const type = (input.type ?? 'site').trim() || 'site';

  if (name.length < 2) {
    return { ok: false, error: 'Tenant name is required (min 2 characters).', status: 400 };
  }
  if (!isValidTenantSlug(slug)) {
    return {
      ok: false,
      error: 'Slug must be 2–48 chars: lowercase letters, numbers, hyphens (not reserved).',
      status: 400,
    };
  }
  if (!adminEmail.includes('@')) {
    return { ok: false, error: 'A valid admin email is required.', status: 400 };
  }
  if (temporaryPassword.length < 8) {
    return { ok: false, error: 'Temporary password must be at least 8 characters.', status: 400 };
  }

  const [existingSlug] = await database.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (existingSlug) {
    return { ok: false, error: `Slug "${slug}" is already taken.`, status: 409 };
  }

  const [existingEmail] = await database.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existingEmail) {
    return { ok: false, error: `Email "${adminEmail}" is already registered.`, status: 409 };
  }

  const themeConfig = buildDefaultThemeConfig(name);
  const passwordHash = await hashPassword(temporaryPassword);

  const [tenant] = await database
    .insert(tenants)
    .values({
      name,
      type,
      slug,
      domain: `${slug}.localhost`,
      themeConfig: themeConfig as unknown as Record<string, unknown>,
    })
    .returning();

  if (!tenant) {
    return { ok: false, error: 'Failed to create tenant.', status: 500 };
  }

  const [user] = await database
    .insert(users)
    .values({
      email: adminEmail,
      passwordHash,
      tenantId: tenant.id,
      isSuperadmin: false,
      requiresPasswordChange: true,
    })
    .returning();

  if (!user) {
    return { ok: false, error: 'Failed to create tenant admin user.', status: 500 };
  }

  await database.insert(siteContent).values({
    tenantId: tenant.id,
    blockType: 'HeroBlock',
    dataJson: buildDefaultHero(name),
  });

  await database.insert(siteContent).values({
    tenantId: tenant.id,
    blockType: 'GalleryBlock',
    dataJson: buildDefaultGallery(),
  });

  await database.insert(siteContent).values({
    tenantId: tenant.id,
    blockType: 'ContactBlock',
    dataJson: buildDefaultContact(),
  });

  await database.insert(siteContent).values({
    tenantId: tenant.id,
    blockType: 'AboutBlock',
    dataJson: buildDefaultAbout(name),
  });

  await database.insert(siteContent).values({
    tenantId: tenant.id,
    blockType: 'FeaturesBlock',
    dataJson: buildDefaultFeatures(),
  });

  return { ok: true, tenant, user };
}
