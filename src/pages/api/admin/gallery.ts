import type { APIRoute } from 'astro';
import { GalleryBlockSchema } from '@/types/blocks';
import { getSessionTenantId } from '@/services/session';
import { updateHomeGallery } from '@/services/tenants';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const tenantId = getSessionTenantId(cookies);
  if (!tenantId) {
    return redirect('/login');
  }

  const form = await request.formData();
  const imageUrls = form.getAll('imageUrl').map((value) => String(value).trim());
  const captions = form.getAll('caption').map((value) => String(value).trim());

  const items = imageUrls
    .map((imageUrl, index) => ({
      imageUrl,
      caption: captions[index] || undefined,
    }))
    .filter((item) => item.imageUrl.length > 0);

  const parsed = GalleryBlockSchema.safeParse({
    title: String(form.get('title') ?? '').trim() || undefined,
    items,
  });

  if (!parsed.success) {
    return redirect('/admin?error=invalid');
  }

  const saved = updateHomeGallery(tenantId, parsed.data);
  if (!saved) {
    return redirect('/admin?error=missing');
  }

  return redirect('/admin?saved=gallery');
};
