import bcrypt from 'bcryptjs';
import type { AppDb } from '@/db/client';
import { getUserByEmail, getUserById } from '@/lib/db';
import type { UserRow } from '@/db/schema';

const BCRYPT_ROUNDS = 10;

export type AuthUser = Pick<
  UserRow,
  'id' | 'email' | 'tenantId' | 'isSuperadmin' | 'requiresPasswordChange'
>;

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    tenantId: row.tenantId,
    isSuperadmin: Boolean(row.isSuperadmin),
    requiresPasswordChange: Boolean(row.requiresPasswordChange),
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

/**
 * Look up users by email and verify password_hash.
 * Returns null for unknown user or bad password (same outcome — no user enumeration in API).
 */
export async function authenticateUser(
  email: string,
  password: string,
  client?: AppDb,
): Promise<AuthUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return null;

  const row = await getUserByEmail(normalized, client);
  if (!row) return null;

  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return null;

  return toAuthUser(row);
}

export async function getTenantAdminById(
  userId: string,
  client?: AppDb,
): Promise<AuthUser | undefined> {
  const row = await getUserById(userId, client);
  if (!row) return undefined;
  return toAuthUser(row);
}

export async function getTenantIdForUser(userId: string, client?: AppDb): Promise<string> {
  const admin = await getTenantAdminById(userId, client);
  if (!admin) {
    throw new Error('User is not assigned to a tenant workspace');
  }
  return admin.tenantId;
}
