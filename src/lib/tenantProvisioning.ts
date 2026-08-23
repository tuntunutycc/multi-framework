import type { TenantThemeConfig } from '@/lib/theme/themeConfig';

/** Default theme + chrome for newly provisioned tenants (super-admin create). */
export function buildDefaultThemeConfig(tenantName: string): TenantThemeConfig {
  return {
    theme: {
      colors: {
        primary: '#1e3a5f',
        secondary: '#c5a572',
        accent: '#2a6f97',
        background: '#f7f5f2',
        surface: '#ffffff',
        foreground: '#1a1f24',
        muted: '#5c6570',
        border: '#d9d4cc',
        success: '#2f6f4e',
        warning: '#b5812f',
        danger: '#9b2c2c',
        primaryForeground: '#ffffff',
        secondaryForeground: '#1a1f24',
      },
      radius: { sm: '0.25rem', md: '0.5rem', lg: '1rem' },
      shadow: {
        sm: '0 1px 2px rgb(26 31 36 / 0.06)',
        md: '0 8px 24px rgb(26 31 36 / 0.10)',
      },
      containerMax: '72rem',
      headingFont: '"Source Serif 4", Georgia, serif',
      bodyFont: '"Source Sans 3", system-ui, sans-serif',
      scale: 'md',
      fontSourceUrl:
        'https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap',
      preconnect: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
    },
    site: {
      identity: {
        name: tenantName,
        tagline: '',
        logo: { src: '/logo.svg', alt: tenantName },
        favicon: '/favicon.svg',
        language: 'en',
        locale: 'en-US',
      },
      seo: {
        titleTemplate: `%s | ${tenantName}`,
        defaultDescription: `${tenantName} — powered by Multi-Framework`,
        canonicalBase: 'https://example.com',
      },
      chrome: { skipToContentLabel: 'Skip to main content' },
      navigation: [],
      features: {},
    },
  };
}

export function buildDefaultHero(tenantName: string): Record<string, unknown> {
  return {
    title: `Welcome to ${tenantName}`,
    subtitle: 'Edit this homepage from your admin dashboard.',
    image: {
      src: '/images/hero.svg',
      alt: `${tenantName} hero image`,
    },
  };
}

export function buildDefaultGallery(): Record<string, unknown> {
  return {
    title: 'Gallery',
    items: [],
  };
}

/** Slug: lowercase letters, numbers, hyphens; 2–48 chars. Reserved platform paths blocked. */
const RESERVED_SLUGS = new Set([
  'system',
  'admin',
  'super-admin',
  'login',
  'api',
  'uploads',
  'public',
]);

export function normalizeTenantSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isValidTenantSlug(slug: string): boolean {
  if (slug.length < 2 || slug.length > 48) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug);
}
