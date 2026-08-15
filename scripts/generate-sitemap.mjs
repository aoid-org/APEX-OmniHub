import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BASE = 'https://apexomnihub.icu';

// All 32 public indexable routes from _seo/ROUTES.md
const PUBLIC_ROUTES = [
  '/',
  '/story',
  '/tech-specs',
  '/omni-sentry',
  '/omni-trace',
  '/eyes',
  '/features/man-mode',
  '/privacy',
  '/omnilink-privacy',
  '/support',
  '/omnilink-support',
  '/terms',
  '/request-access',
  '/advanced-analytics',
  '/ai-automation',
  '/fortress',
  '/maestro',
  '/omniport',
  '/orchestrator',
  '/omniboard',
  '/product/omniskills',
  '/product/byom',
  '/tri-force',
  '/integrations/web3',
  '/product/omnidash',
  '/demo',
  '/physiomni-pilot',
  '/pricing',
  '/manifesto',
];

const today = new Date().toISOString().split('T')[0];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_ROUTES.map(route => `  <url>
    <loc>${BASE}${route}</loc>
    <lastmod>${today}</lastmod>
  </url>`).join('\n')}
</urlset>
`;

const targets = [
  path.join(REPO_ROOT, 'apps', 'omnihub-site', 'public', 'sitemap.xml'),
  path.join(REPO_ROOT, 'public', 'sitemap.xml'),
];

for (const target of targets) {
  const dir = path.dirname(target);
  if (fs.existsSync(dir)) {
    fs.writeFileSync(target, sitemap, 'utf8');
    console.log(`✅ Sitemap written to ${path.relative(REPO_ROOT, target)} (${PUBLIC_ROUTES.length} URLs)`);
  }
}
