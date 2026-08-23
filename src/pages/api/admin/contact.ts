import type { APIRoute } from 'astro';
import { ContactBlockSchema } from '@/types/blocks';
import { getSessionTenantId } from '@/services/session';
import { updateHomeContact } from '@/services/tenants';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/admin/contact
 * Body: { address, phone, email, openingHours, googleMapsUrl? }
 * Upserts ContactBlock data_json for the session tenant only.
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

  const parsed = ContactBlockSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const saved = await updateHomeContact(tenantId, parsed.data);
  if (!saved) {
    return json({ error: 'Could not update contact for this tenant' }, 404);
  }

  return json({
    ok: true,
    contact: parsed.data,
  });
};
