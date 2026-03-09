import fs from 'fs';
const filePath = 'apps/omnihub-site/src/pages/Home.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const imports = `import { SEOHead } from '../../../../src/components/seo/SEOHead';
import { PAGE_SEO, SITE_CONFIG } from '../../../../src/config/seo.config';

const homepageStructuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.organization.name,
    url: SITE_CONFIG.siteUrl,
    logo: SITE_CONFIG.organization.logo,
    foundingLocation: SITE_CONFIG.organization.location,
    sameAs: [
      'https://www.linkedin.com/company/apex-business-systems',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'APEX OmniHub',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Enterprise AI orchestration control plane. Directable, Auditable, Reversible.',
    url: SITE_CONFIG.siteUrl,
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.organization.name,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      availability: 'https://schema.org/OnlineOnly',
    },
  },
];`;

content = content.replace("import { useTranslation } from 'react-i18next';", `import { useTranslation } from 'react-i18next';\n${imports}`);

content = content.replace(/export function HomePage\(\) \{\n  const \{ t \} = useTranslation\(\);\n\n  return \(\n    <Layout>/g, `export function HomePage() {\n  const { t } = useTranslation();\n\n  return (\n    <>\n      <SEOHead {...PAGE_SEO.home} structuredData={homepageStructuredData} />\n      <Layout>`);

content = content.replace(/<\/Layout>\n  \);\n\}/g, `</Layout>\n    </>\n  );\n}`);

fs.writeFileSync(filePath, content);
