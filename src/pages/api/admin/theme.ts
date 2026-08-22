import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getSessionTenantId } from '@/services/session';
import { updateThemeColors } from '@/services/tenants';

const ThemeEditSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  background: z.string().min(1),
  foreground: z.string().min(1),
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const tenantId = getSessionTenantId(cookies);
  if (!tenantId) {
    return redirect('/login');
  }

  const form = await request.formData();
  const parsed = ThemeEditSchema.safeParse({
    primary: String(form.get('primary') ?? '').trim(),
    secondary: String(form.get('secondary') ?? '').trim(),
    background: String(form.get('background') ?? '').trim(),
    foreground: String(form.get('foreground') ?? '').trim(),
  });

  if (!parsed.success) {
    return redirect('/admin?error=invalid');
  }

  const saved = updateThemeColors(tenantId, parsed.data);
  if (!saved) {
    return redirect('/admin?error=missing');
  }

  return redirect('/admin?saved=theme');
};
