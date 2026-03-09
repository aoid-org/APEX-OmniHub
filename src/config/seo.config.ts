export interface PageSEO {
  title: string
  description: string
  canonical: string
  keywords: string
  ogImage?: string
  noIndex?: boolean
}

export const SITE_CONFIG = {
  siteUrl: 'https://apexomnihub.icu',
  siteName: 'APEX OmniHub',
  defaultOgImage: '/og-default.png',
  twitterHandle: '@apexomnihub',
  organization: {
    name: 'APEX Business Systems Ltd.',
    url: 'https://apexomnihub.icu',
    logo: 'https://apexomnihub.icu/logo.png',
    location: 'Edmonton, Alberta, Canada',
  },
} as const

export const PAGE_SEO: Record<string, PageSEO> = {
  home: {
    title: 'Enterprise AI Orchestration & Control Plane Platform | APEX OmniHub',
    description:
      'APEX OmniHub is the enterprise AI orchestration control plane that makes AI directable, auditable, and reversible. Built for ops teams who need AI governance at scale.',
    canonical: 'https://apexomnihub.icu/',
    keywords:
      'enterprise AI orchestration, AI control plane, AI governance platform, directable AI, auditable AI workflows, reversible AI, enterprise AI agents',
  },
  whatIs: {
    title: 'What Is APEX OmniHub? Enterprise AI Orchestration Explained',
    description:
      'APEX OmniHub is an enterprise AI control plane that makes AI agents directable, auditable, and reversible. Learn how it solves AI governance for ops teams.',
    canonical: 'https://apexomnihub.icu/what-is-apex-omnihub',
    keywords:
      'what is APEX OmniHub, AI orchestration platform explained, enterprise AI control plane, AI agent governance',
  },
  faq: {
    title: 'FAQ — Enterprise AI Orchestration, Governance & Control | APEX OmniHub',
    description:
      'Answers to the most common questions about APEX OmniHub, enterprise AI orchestration, AI governance, and control plane architecture.',
    canonical: 'https://apexomnihub.icu/faq',
    keywords:
      'AI orchestration FAQ, enterprise AI governance questions, APEX OmniHub FAQ, AI control plane questions',
  },
  founder: {
    title: "Founder's Story — Building Enterprise AI Governance | APEX OmniHub",
    description:
      'The story of why APEX OmniHub was built, the problem it solves, and the vision behind making enterprise AI directable, auditable, and reversible.',
    canonical: 'https://apexomnihub.icu/founder',
    keywords:
      'APEX OmniHub founder, enterprise AI governance vision, AI control plane origin story',
  },
  enterpriseLanding: {
    title: 'Enterprise AI Orchestration Platform — Govern Your AI Agents | APEX OmniHub',
    description:
      'Stop AI sprawl. APEX OmniHub gives enterprise teams a single control plane to orchestrate, govern, and audit every AI agent and workflow. Request a pilot.',
    canonical: 'https://apexomnihub.icu/enterprise-ai-orchestration',
    keywords:
      'enterprise AI orchestration platform, AI agent governance, AI workflow control, stop AI sprawl, enterprise AI management',
  },
  blog: {
    title: 'Enterprise AI Insights & Orchestration Guides | APEX OmniHub Blog',
    description:
      'Practical guides, insights, and research on enterprise AI orchestration, AI governance, and building directable, auditable AI systems.',
    canonical: 'https://apexomnihub.icu/blog',
    keywords: 'enterprise AI blog, AI orchestration guides, AI governance insights',
  },
}