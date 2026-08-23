import type { AstroCookies } from 'astro';
import type { AppDb } from '@/db/client';
import { getTenantAdminById, type AuthUser } from '@/lib/auth';

const SESSION_COOKIE = 'session';

/** Cookie format: `userId:tenantId` (tenantId must match users.tenant_id). */
export function encodeSessionCookie(userId: string, tenantId: string): string {
  return `${userId}:${tenantId}`;
}

export function parseSessionCookie(
  value: string | undefined,
): { userId: string; tenantId: string } | undefined {
  if (!value) return undefined;
  const [userId, tenantId] = value.split(':');
  if (!userId || !tenantId) return undefined;
  return { userId, tenantId };
}

/**
 * Verify the session cookie against the users table.
 * Rejects missing users and tenantId mismatches (tampered cookies).
 */
export async function resolveSession(
  cookies: AstroCookies,
  client?: AppDb,
): Promise<AuthUser | undefined> {
  const parsed = parseSessionCookie(cookies.get(SESSION_COOKIE)?.value);
  if (!parsed) return undefined;

  const admin = await getTenantAdminById(parsed.userId, client);
  if (!admin) return undefined;
  if (admin.tenantId !== parsed.tenantId) return undefined;
  return admin;
}

/** Prefer DB-verified tenant from a resolved session; fallback parse for post-login helpers. */
export function getSessionTenantId(cookies: AstroCookies): string | undefined {
  return parseSessionCookie(cookies.get(SESSION_COOKIE)?.value)?.tenantId;
}

export function getSessionUserId(cookies: AstroCookies): string | undefined {
  return parseSessionCookie(cookies.get(SESSION_COOKIE)?.value)?.userId;
}

export { SESSION_COOKIE };
