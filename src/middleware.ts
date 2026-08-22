import { defineMiddleware } from 'astro:middleware';

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

  const session = context.cookies.get('session')?.value;
  const needsAuth = isAdminPage(context.url.pathname) || isAdminApi(context.url.pathname);

  if (needsAuth && !session) {
    if (isAdminApi(context.url.pathname)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/login');
  }

  return next();
});
