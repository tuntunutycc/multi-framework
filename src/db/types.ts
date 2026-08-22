/**
 * Domain types used by the public renderer and in-memory adapter.
 * Drizzle table types live in schema.ts.
 */

export type TenantStatus = 'active' | 'suspended';
export type PageStatus = 'draft' | 'published';
export type MembershipRole = 'owner' | 'editor' | 'viewer';

export type BlockType =
  | 'HeroBlock'
  | 'GalleryBlock'
  | 'FeatureGrid'
  | 'MenuSection'
  | 'RichText'
  | 'CTASection'
  | 'ContactSection'
  | 'TestimonialList'
  | 'FaqList'
  | 'StatsRow';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  siteType: string;
  createdAt: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  primaryForeground: string;
  secondaryForeground: string;
}

export interface Theme {
  tenantId: string;
  colors: ThemeColors;
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadow: {
    sm: string;
    md: string;
  };
  containerMax: string;
  headingFont: string;
  bodyFont: string;
  scale: 'sm' | 'md' | 'lg';
  fontSourceUrl?: string;
  preconnect?: string[];
}

export interface MediaRef {
  src: string;
  alt: string;
  decorative?: boolean;
  width?: number;
  height?: number;
}

export interface SiteConfig {
  tenantId: string;
  identity: {
    name: string;
    tagline?: string;
    legalName?: string;
    logo: MediaRef;
    favicon: string;
    language: string;
    locale: string;
  };
  seo: {
    titleTemplate: string;
    defaultDescription: string;
    ogImage?: string;
    canonicalBase: string;
  };
  chrome: {
    skipToContentLabel: string;
  };
  navigation: Array<{ label: string; href: string }>;
  features: Record<string, boolean>;
}

export interface Block {
  id: string;
  tenantId: string;
  type: BlockType;
  props: Record<string, unknown>;
}

export interface Page {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description: string;
  status: PageStatus;
  blocks: Block[];
}

export interface User {
  id: string;
  email: string;
}

export interface Membership {
  userId: string;
  tenantId: string;
  role: MembershipRole;
}

export interface Session {
  id: string;
  userId: string;
  tenantId: string;
}
