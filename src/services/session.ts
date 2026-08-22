import type { AstroCookies } from 'astro';

/** Session cookie format: `userId:tenantId`. Tenant id is never taken from the client body alone. */
export function getSessionTenantId(cookies: AstroCookies): string | undefined {
  const value = cookies.get('session')?.value;
  if (!value) return undefined;
  const tenantId = value.split(':')[1];
  return tenantId && tenantId.length > 0 ? tenantId : undefined;
}
