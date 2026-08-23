import type { APIRoute } from 'astro';
import { authenticateUser } from '@/lib/auth';
import { encodeSessionCookie, SESSION_COOKIE } from '@/services/session';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');

  if (!email || !password) {
    return redirect('/login?error=missing');
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return redirect('/login?error=invalid');
  }

  cookies.set(SESSION_COOKIE, encodeSessionCookie(user.id, user.tenantId), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 7,
  });

  if (user.isSuperadmin) {
    return redirect('/super-admin');
  }

  return redirect('/admin');
};
