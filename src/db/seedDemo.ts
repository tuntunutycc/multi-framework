import type { TenantThemeConfig } from '@/lib/theme/themeConfig';

/** In-code demo fixture for Riverside (seed only — not a runtime CMS source). */
export const riversideDemo = {
  siteType: 'school',
  identity: {
    name: 'Riverside Preparatory Academy',
    tagline: 'Curiosity. Character. Community.',
    legalName: 'Riverside Preparatory Academy',
    logo: {
      src: '/logo.svg',
      alt: 'Riverside Preparatory Academy',
    },
    favicon: '/favicon.svg',
    language: 'en',
    locale: 'en-US',
  },
  seo: {
    titleTemplate: '%s | Riverside Preparatory Academy',
    defaultDescription:
      'Independent K–12 school on the river, with a rigorous curriculum and a close-knit campus community.',
    ogImage: '/images/hero.svg',
    canonicalBase: 'https://www.riversideprep.example',
  },
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
    radius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '1rem',
    },
    shadow: {
      sm: '0 1px 2px rgb(26 31 36 / 0.06)',
      md: '0 8px 24px rgb(26 31 36 / 0.10)',
    },
    containerMax: '72rem',
  },
  typography: {
    headingFont: '"Source Serif 4", Georgia, serif',
    bodyFont: '"Source Sans 3", system-ui, sans-serif',
    scale: 'md' as const,
    fontSourceUrl:
      'https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap',
    preconnect: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
  },
  navigation: [
    { label: 'About', href: '/about' },
    { label: 'Academics', href: '/academics' },
    { label: 'Admissions', href: '/admissions' },
    { label: 'Campus Life', href: '/campus' },
    { label: 'Contact', href: '/contact' },
  ],
  features: {
    admissionsPortal: true,
    eventsCalendar: true,
    news: true,
  },
  chrome: {
    skipToContentLabel: 'Skip to main content',
  },
  hero: {
    title: 'A rigorous education. A community that knows your child.',
    subtitle:
      'Riverside Preparatory Academy is an independent K–12 school where scholarship, character, and belonging are taught in equal measure.',
    image: {
      src: '/images/hero.svg',
      alt: 'Students crossing the Riverside Preparatory Academy courtyard toward the main academic building',
    },
  },
  gallery: {
    title: 'School activities',
    items: [
      {
        imageUrl: '/images/hero.svg',
        caption: 'Morning assembly on the quad',
      },
      {
        imageUrl: '/logo.svg',
        caption: 'Athletics and after-school clubs',
      },
    ],
  },
};

export function buildRiversideThemeConfig(): TenantThemeConfig {
  const d = riversideDemo;
  return {
    theme: {
      colors: d.theme.colors,
      radius: d.theme.radius,
      shadow: d.theme.shadow,
      containerMax: d.theme.containerMax,
      headingFont: d.typography.headingFont,
      bodyFont: d.typography.bodyFont,
      scale: d.typography.scale,
      fontSourceUrl: d.typography.fontSourceUrl,
      preconnect: d.typography.preconnect,
    },
    site: {
      identity: d.identity,
      seo: d.seo,
      chrome: d.chrome,
      navigation: d.navigation,
      features: d.features,
    },
  };
}
