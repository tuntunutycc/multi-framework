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

function isSuperAdminApi(pathname: string): boolean {
  return pathname.startsWith('/api/super-admin');
}

function isSuperAdminPage(pathname: string): boolean {
  return pathname === '/super-admin' || pathname.startsWith('/super-admin/');
}

function unauthorized(isApi: boolean, redirectToLogin: boolean, context: { redirect: (path: string) => Response }) {
  if (isApi) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (redirectToLogin) {
    return context.redirect('/login');
  }
  return context.redirect('/admin');
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (isPublicAuthPath(context.url.pathname)) {
    return next();
  }

  const needsAuth =
    isAdminPage(context.url.pathname) ||
    isAdminApi(context.url.pathname) ||
    isSuperAdminPage(context.url.pathname) ||
    isSuperAdminApi(context.url.pathname);

  if (!needsAuth) {
    return next();
  }

  const session = await resolveSession(context.cookies);
  const isApi = isAdminApi(context.url.pathname) || isSuperAdminApi(context.url.pathname);

  if (!session) {
    context.cookies.delete('session', { path: '/' });
    return unauthorized(isApi, true, context);
  }

  // Super-admin surfaces require is_superadmin === true
  if (isSuperAdminPage(context.url.pathname) || isSuperAdminApi(context.url.pathname)) {
    if (!session.isSuperadmin) {
      if (isApi) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return context.redirect('/admin');
    }
  }

  context.locals.session = session;
  return next();
});
