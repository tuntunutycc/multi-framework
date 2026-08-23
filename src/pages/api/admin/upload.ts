import type { APIRoute } from 'astro';
import { getSessionTenantId } from '@/services/session';
import { saveTenantUpload, UploadError } from '@/lib/uploads';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/admin/upload
 * multipart/form-data with field "file"
 * Saves to ./public/uploads/tenant-{sessionTenantId}/ and returns { url }.
 */
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const tenantId = locals.session?.tenantId ?? getSessionTenantId(cookies);
  if (!tenantId) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Expected multipart/form-data' }, 400);
  }

  const entry = form.get('file');
  if (!(entry instanceof File)) {
    return json({ error: 'Missing file field' }, 400);
  }

  try {
    const saved = await saveTenantUpload(tenantId, entry);
    return json({
      ok: true,
      url: saved.url,
      filename: saved.filename,
      mimeType: saved.mimeType,
      size: saved.size,
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return json({ error: error.message }, error.status);
    }
    console.error('upload failed', error);
    return json({ error: 'Upload failed' }, 500);
  }
};
