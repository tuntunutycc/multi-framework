import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSiteContentForTenant, requireTenantId } from '@/lib/db';
import {
  clearTestDb,
  createTestDb,
  seedTestFixtures,
  TEST_TENANT_A,
  TEST_TENANT_B,
} from './helpers/db';

describe('tenant-scoped database access', () => {
  beforeEach(async () => {
    const db = await createTestDb();
    await seedTestFixtures(db);
  });

  afterEach(() => {
    clearTestDb();
  });

  it('throws when querying site content without a tenant_id', () => {
    expect(() => requireTenantId('')).toThrow(/tenantId is required/);
    expect(() => requireTenantId('   ')).toThrow(/tenantId is required/);
    expect(() => requireTenantId(undefined)).toThrow(/tenantId is required/);
    expect(() => requireTenantId(null)).toThrow(/tenantId is required/);
  });

  it('rejects getSiteContentForTenant without tenant_id', async () => {
    await expect(getSiteContentForTenant('')).rejects.toThrow(/tenantId is required/);
  });

  it('returns only the requesting tenant rows', async () => {
    const rowsA = await getSiteContentForTenant(TEST_TENANT_A);
    const rowsB = await getSiteContentForTenant(TEST_TENANT_B);

    expect(rowsA.length).toBeGreaterThan(0);
    expect(rowsB.length).toBeGreaterThan(0);
    expect(rowsA.every((row) => row.tenantId === TEST_TENANT_A)).toBe(true);
    expect(rowsB.every((row) => row.tenantId === TEST_TENANT_B)).toBe(true);
    expect(rowsA.some((row) => row.tenantId === TEST_TENANT_B)).toBe(false);
  });
});
