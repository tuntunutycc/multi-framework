import type { APIRoute } from 'astro';
import { FeaturesBlockSchema } from '@/types/blocks';
import { getSessionTenantId } from '@/services/session';
import { updateHomeFeatures } from '@/services/tenants';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/admin/features
 * Body: { title, subtitle?, features: [{ id, title, description, iconOrImageUrl? }] }
 * Upserts FeaturesBlock data_json for the session tenant only.
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

  const parsed = FeaturesBlockSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const saved = await updateHomeFeatures(tenantId, parsed.data);
  if (!saved) {
    return json({ error: 'Could not update features for this tenant' }, 404);
  }

  return json({
    ok: true,
    features: parsed.data,
  });
};
