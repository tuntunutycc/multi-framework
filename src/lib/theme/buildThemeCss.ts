import type { Theme } from '@/db/types';

export function buildThemeCss(theme: Theme): string {
  const declarations: Record<string, string> = {
    '--color-primary': theme.colors.primary,
    '--color-secondary': theme.colors.secondary,
    '--color-accent': theme.colors.accent,
    '--color-background': theme.colors.background,
    '--color-surface': theme.colors.surface,
    '--color-foreground': theme.colors.foreground,
    '--color-muted': theme.colors.muted,
    '--color-border': theme.colors.border,
    '--color-success': theme.colors.success,
    '--color-warning': theme.colors.warning,
    '--color-danger': theme.colors.danger,
    '--color-primary-foreground': theme.colors.primaryForeground,
    '--color-secondary-foreground': theme.colors.secondaryForeground,
    '--font-heading': theme.headingFont,
    '--font-body': theme.bodyFont,
    '--radius-sm': theme.radius.sm,
    '--radius-md': theme.radius.md,
    '--radius-lg': theme.radius.lg,
    '--shadow-sm': theme.shadow.sm,
    '--shadow-md': theme.shadow.md,
    '--container-max': theme.containerMax,
  };

  const body = Object.entries(declarations)
    .map(([property, value]) => `${property}: ${value};`)
    .join(' ');

  return `:root { ${body} }`;
}
