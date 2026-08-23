import type { APIRoute } from 'astro';
import { createTenantWithAdmin } from '@/services/superAdmin';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!locals.session?.isSuperadmin) {
    return redirect('/login');
  }

  const form = await request.formData();
  const result = await createTenantWithAdmin({
    name: String(form.get('name') ?? ''),
    slug: String(form.get('slug') ?? ''),
    adminEmail: String(form.get('adminEmail') ?? ''),
    temporaryPassword: String(form.get('temporaryPassword') ?? ''),
    type: String(form.get('type') ?? 'site'),
  });

  if (!result.ok) {
    const params = new URLSearchParams({ error: result.error });
    return redirect(`/super-admin?${params.toString()}`);
  }

  const params = new URLSearchParams({
    created: result.tenant.slug,
    email: result.user.email,
  });
  return redirect(`/super-admin?${params.toString()}`);
};
