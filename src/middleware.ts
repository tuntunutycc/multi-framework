import { defineMiddleware } from 'astro:middleware';
import { resolveSession } from '@/services/session';

function isPublicAuthPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/api/auth/');
}

function isAdminApi(pathname: string): boolean {
  return pathname.startsWith('/api/admin');
}

function isAdminPage(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (isPublicAuthPath(context.url.pathname)) {
    return next();
  }

  const needsAuth = isAdminPage(context.url.pathname) || isAdminApi(context.url.pathname);
  if (!needsAuth) {
    return next();
  }

  // Verify the user still exists and cookie tenantId matches users.tenant_id
  const session = await resolveSession(context.cookies);
  if (!session) {
    context.cookies.delete('session', { path: '/' });
    if (isAdminApi(context.url.pathname)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/login');
  }

  context.locals.session = session;
  return next();
});
