#!/usr/bin/env node
import fs from 'node:fs';

const BASE = 'https://apexomnihub.icu';
const PAGES = [
  { url: '/',               priority: '1.0', changefreq: 'weekly' },
  { url: '/tech-specs',     priority: '0.9', changefreq: 'monthly' },
  { url: '/demo',           priority: '0.9', changefreq: 'monthly' },
  { url: '/tri-force',      priority: '0.8', changefreq: 'monthly' },
  { url: '/fortress',       priority: '0.8', changefreq: 'monthly' },
  { url: '/omniport',       priority: '0.8', changefreq: 'monthly' },
  { url: '/story',          priority: '0.7', changefreq: 'monthly' },
  { url: '/request-access', priority: '0.8', changefreq: 'monthly' },
  { url: '/pricing',        priority: '0.9', changefreq: 'monthly' },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(p => `  <url>
    <loc>${BASE}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync('public/sitemap.xml', sitemap);
console.log(`✅ Sitemap written with ${PAGES.length} URLs`);
