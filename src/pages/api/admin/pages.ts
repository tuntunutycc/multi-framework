import type { APIRoute } from 'astro';
import { HeroBlockSchema } from '@/types/blocks';
import { getSessionTenantId } from '@/services/session';
import { updateHomeHero } from '@/services/tenants';

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const tenantId = locals.session?.tenantId ?? getSessionTenantId(cookies);
  if (!tenantId) {
    return redirect('/login');
  }

  const form = await request.formData();
  const parsed = HeroBlockSchema.safeParse({
    title: String(form.get('title') ?? '').trim(),
    subtitle: String(form.get('subtitle') ?? '').trim() || undefined,
    image: {
      src: String(form.get('imageSrc') ?? '').trim(),
      alt: String(form.get('imageAlt') ?? '').trim(),
    },
    // CTA button removed from product — do not persist one
  });

  if (!parsed.success) {
    return redirect('/admin?error=invalid');
  }

  const saved = await updateHomeHero(tenantId, parsed.data);
  if (!saved) {
    return redirect('/admin?error=missing');
  }

  return redirect('/admin?saved=content');
};
