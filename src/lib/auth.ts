import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { users, type UserRow } from '@/db/schema';

export type TenantAdmin = Pick<UserRow, 'id' | 'email' | 'tenantId'>;

/**
 * Resolve the signed-in admin's workspace from the user row.
 * Tenant admins are not super-admins: their tenantId is the only scope they get.
 * Never trust a tenantId from the request body or query string.
 */
export async function getTenantAdminById(userId: string): Promise<TenantAdmin | undefined> {
  const [row] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      tenantId: users.tenantId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row;
}

/** Session helper: workspace comes from the user record, not from the client. */
export async function getTenantIdForUser(userId: string): Promise<string> {
  const admin = await getTenantAdminById(userId);
  if (!admin) {
    throw new Error('User is not assigned to a tenant workspace');
  }
  return admin.tenantId;
}
