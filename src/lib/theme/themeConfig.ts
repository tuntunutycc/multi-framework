import { z } from 'zod';
import type { SiteConfig, Theme, ThemeColors } from '@/db/types';

const ThemeColorsSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  foreground: z.string(),
  muted: z.string(),
  border: z.string(),
  success: z.string(),
  warning: z.string(),
  danger: z.string(),
  primaryForeground: z.string(),
  secondaryForeground: z.string(),
});

const ThemePayloadSchema = z.object({
  colors: ThemeColorsSchema,
  radius: z.object({ sm: z.string(), md: z.string(), lg: z.string() }),
  shadow: z.object({ sm: z.string(), md: z.string() }),
  containerMax: z.string(),
  headingFont: z.string(),
  bodyFont: z.string(),
  scale: z.enum(['sm', 'md', 'lg']),
  fontSourceUrl: z.string().optional(),
  preconnect: z.array(z.string()).optional(),
});

const SitePayloadSchema = z.object({
  identity: z.object({
    name: z.string(),
    tagline: z.string().optional(),
    legalName: z.string().optional(),
    logo: z.object({
      src: z.string(),
      alt: z.string(),
      decorative: z.boolean().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
    favicon: z.string(),
    language: z.string(),
    locale: z.string(),
  }),
  seo: z.object({
    titleTemplate: z.string(),
    defaultDescription: z.string(),
    ogImage: z.string().optional(),
    canonicalBase: z.string(),
  }),
  chrome: z.object({
    skipToContentLabel: z.string(),
  }),
  navigation: z.array(z.object({ label: z.string(), href: z.string() })),
  features: z.record(z.string(), z.boolean()),
});

/** Stored in tenants.theme_config JSONB */
export const TenantThemeConfigSchema = z.object({
  theme: ThemePayloadSchema,
  site: SitePayloadSchema,
});

export type TenantThemeConfig = z.infer<typeof TenantThemeConfigSchema>;

function sanitizeSiteFeatureFlags(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean') {
      flags[key] = value;
    }
  }
  return flags;
}

export function parseTenantThemeConfig(raw: unknown): TenantThemeConfig {
  if (raw && typeof raw === 'object' && 'site' in raw) {
    const candidate = raw as { site?: { features?: unknown } };
    const site = candidate.site;
    if (site && typeof site === 'object' && 'features' in site) {
      return TenantThemeConfigSchema.parse({
        ...raw,
        site: {
          ...site,
          features: sanitizeSiteFeatureFlags(site.features),
        },
      });
    }
  }
  return TenantThemeConfigSchema.parse(raw);
}

export function toTheme(tenantId: string, config: TenantThemeConfig): Theme {
  return { tenantId, ...config.theme };
}

export function toSiteConfig(tenantId: string, config: TenantThemeConfig): SiteConfig {
  return { tenantId, ...config.site };
}

export function mergeThemeColors(
  config: TenantThemeConfig,
  colors: Partial<ThemeColors>,
): TenantThemeConfig {
  return {
    ...config,
    theme: {
      ...config.theme,
      colors: { ...config.theme.colors, ...colors },
    },
  };
}
