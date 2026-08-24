// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import react from '@astrojs/react';

/**
 * Host patterns Astro may trust from X-Forwarded-Host / Host when behind a
 * reverse proxy (Cloudflare Tunnel, nginx, etc.). Without this, Astro may
 * ignore forwarded hosts and CSRF origin checks can fail for public HTTPS.
 *
 * Set PUBLIC_SITE_URL=https://your-tunnel-hostname.example
 * Optional: ALLOWED_HOSTS=app.example.com,*.example.com
 */
function buildAllowedDomains() {
  /** @type {Array<{ hostname?: string; protocol?: string; port?: string }>} */
  const domains = [];

  const publicSiteUrl = process.env.PUBLIC_SITE_URL?.trim();
  if (publicSiteUrl) {
    try {
      const url = new URL(publicSiteUrl);
      domains.push({
        hostname: url.hostname,
        protocol: url.protocol.replace(':', ''),
        ...(url.port ? { port: url.port } : {}),
      });
    } catch {
      // Ignore malformed PUBLIC_SITE_URL; fall through to localhost defaults.
    }
  }

  const extraHosts = process.env.ALLOWED_HOSTS?.split(',') ?? [];
  for (const raw of extraHosts) {
    const hostname = raw.trim();
    if (!hostname) continue;
    domains.push({ hostname, protocol: 'https' });
  }

  // Local / LXC loopback (dev + tunnel origin on the same machine)
  domains.push(
    { hostname: 'localhost', protocol: 'http' },
    { hostname: '127.0.0.1', protocol: 'http' },
  );

  return domains;
}

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  // Trust Cloudflare (and other proxies) for Host / Proto when they match.
  // There is no Express-style trustProxy flag on @astrojs/node; this is Astro's equivalent.
  security: {
    checkOrigin: true,
    allowedDomains: buildAllowedDomains(),
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    ssr: {
      // Native addon — must not be bundled into the SSR graph
      external: ['better-sqlite3'],
    },
  },
});
