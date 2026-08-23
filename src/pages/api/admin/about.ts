import type { APIRoute } from 'astro';
import { AboutBlockSchema } from '@/types/blocks';
import { getSessionTenantId } from '@/services/session';
import { updateHomeAbout } from '@/services/tenants';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/admin/about
 * Body: { title, content, imageUrl?, imagePosition }
 * Upserts AboutBlock data_json for the session tenant only.
 */
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const tenantId = locals.session?.tenantId ?? getSessionTenantId(cookies);
  if (!tenantId) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = AboutBlockSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const saved = await updateHomeAbout(tenantId, parsed.data);
  if (!saved) {
    return json({ error: 'Could not update about section for this tenant' }, 404);
  }

  return json({
    ok: true,
    about: parsed.data,
  });
};
