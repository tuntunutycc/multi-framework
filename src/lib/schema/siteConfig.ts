import { z } from 'zod';
import { GalleryBlockSchema, HeroBlockSchema } from './blocks';

export const MediaSchema = z.object({
  src: z.string().min(1),
  alt: z.string(),
  decorative: z.boolean().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const NavItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const ThemeColorsSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  accent: z.string().min(1),
  background: z.string().min(1),
  surface: z.string().min(1),
  foreground: z.string().min(1),
  muted: z.string().min(1),
  border: z.string().min(1),
  success: z.string().min(1),
  warning: z.string().min(1),
  danger: z.string().min(1),
  primaryForeground: z.string().min(1),
  secondaryForeground: z.string().min(1),
});

export const ThemeConfigSchema = z.object({
  colors: ThemeColorsSchema,
  radius: z.object({
    sm: z.string().min(1),
    md: z.string().min(1),
    lg: z.string().min(1),
  }),
  shadow: z.object({
    sm: z.string().min(1),
    md: z.string().min(1),
  }),
  containerMax: z.string().min(1),
});

export const TypographyConfigSchema = z.object({
  headingFont: z.string().min(1),
  bodyFont: z.string().min(1),
  scale: z.enum(['sm', 'md', 'lg']),
  fontSourceUrl: z.string().url().optional(),
  preconnect: z.array(z.string().url()).optional(),
});

export const SiteConfigSchema = z.object({
  siteType: z.string().min(1),
  identity: z.object({
    name: z.string().min(1),
    tagline: z.string().optional(),
    legalName: z.string().optional(),
    logo: MediaSchema,
    favicon: z.string().min(1),
    language: z.string().min(1),
    locale: z.string().min(1),
  }),
  seo: z.object({
    titleTemplate: z.string().min(1),
    defaultDescription: z.string().min(1),
    ogImage: z.string().optional(),
    canonicalBase: z.string().url(),
  }),
  theme: ThemeConfigSchema,
  typography: TypographyConfigSchema,
  layout: z.object({
    header: z.string().min(1),
    footer: z.string().min(1),
    homepage: z.array(z.string().min(1)).min(1),
    innerPage: z.array(z.string().min(1)).optional(),
  }),
  navigation: z.array(NavItemSchema),
  features: z.record(z.string(), z.boolean()),
  integrations: z.record(z.string(), z.unknown()).optional(),
  chrome: z.object({
    skipToContentLabel: z.string().min(1),
  }),
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type NavItem = z.infer<typeof NavItemSchema>;
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;
export type TypographyConfig = z.infer<typeof TypographyConfigSchema>;

export const HomepageBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('HeroBlock'),
    id: z.string().min(1),
    props: HeroBlockSchema,
  }),
  z.object({
    type: z.literal('GalleryBlock'),
    id: z.string().min(1),
    props: GalleryBlockSchema,
  }),
]);

export const HomepageSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  blocks: z.array(HomepageBlockSchema).min(1),
});

export type Homepage = z.infer<typeof HomepageSchema>;
export type HomepageBlock = z.infer<typeof HomepageBlockSchema>;
