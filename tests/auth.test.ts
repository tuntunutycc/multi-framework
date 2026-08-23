import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authenticateUser, getTenantAdminById } from '@/lib/auth';
import { encodeSessionCookie, parseSessionCookie } from '@/services/session';
import {
  clearTestDb,
  createTestDb,
  seedTestFixtures,
  TEST_TENANT_A,
  TEST_USER_A,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from './helpers/db';

describe('authentication', () => {
  beforeEach(async () => {
    const db = await createTestDb();
    await seedTestFixtures(db);
  });

  afterEach(() => {
    clearTestDb();
  });

  it('rejects invalid credentials', async () => {
    expect(await authenticateUser(TEST_USER_EMAIL, 'wrong-password')).toBeNull();
    expect(await authenticateUser('nobody@example.com', TEST_USER_PASSWORD)).toBeNull();
  });

  it('accepts valid credentials and ties session to tenant_id', async () => {
    const user = await authenticateUser(TEST_USER_EMAIL, TEST_USER_PASSWORD);
    expect(user).not.toBeNull();
    expect(user!.id).toBe(TEST_USER_A);
    expect(user!.tenantId).toBe(TEST_TENANT_A);
    expect(user!.email).toBe(TEST_USER_EMAIL);

    const cookie = encodeSessionCookie(user!.id, user!.tenantId);
    const parsed = parseSessionCookie(cookie);
    expect(parsed).toEqual({ userId: TEST_USER_A, tenantId: TEST_TENANT_A });

    const fromDb = await getTenantAdminById(parsed!.userId);
    expect(fromDb?.tenantId).toBe(TEST_TENANT_A);
    expect(fromDb?.tenantId).toBe(parsed!.tenantId);
  });

  it('detects tampered tenantId that does not match the user row', async () => {
    const user = await authenticateUser(TEST_USER_EMAIL, TEST_USER_PASSWORD);
    expect(user).not.toBeNull();

    const tampered = encodeSessionCookie(user!.id, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    const parsed = parseSessionCookie(tampered)!;
    const admin = await getTenantAdminById(parsed.userId);
    expect(admin?.tenantId).toBe(TEST_TENANT_A);
    expect(admin?.tenantId).not.toBe(parsed.tenantId);
  });
});
