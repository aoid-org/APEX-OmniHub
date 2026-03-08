/**
 * Stub for @/content/site under root vitest.
 * Real implementation: apps/omnihub-site/src/content/site.ts
 * Replaced at runtime by vi.mock in omnihub-site tests.
 */

export const siteConfig = {
  name: '',
  domain: '',
  nav: { logo: '', links: [], loginLink: { label: '', href: '' }, primaryCta: { label: '', href: '' } },
  ctas: { secondary: { label: '', href: '' } },
};

export const demoConfig = {
  title: '',
  subtitle: '',
  video: { label: '', src: '' },
  interactivePlaceholder: { title: '', description: '' },
  cta: { title: '', description: '', button: { label: '', href: '' } },
};

export type DemoConfig = typeof demoConfig;
export type SiteConfig = typeof siteConfig;
