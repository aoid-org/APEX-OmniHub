import fs from 'node:fs';
import path from 'node:path';

// Cloudflare Pages uses public/_redirects for SPA routing
// Script runs from apps/omnihub-site/ but _redirects lives at repo root public/
const redirectsPath = path.join(process.cwd(), '..', '..', 'public', '_redirects');

if (!fs.existsSync(redirectsPath)) {
  console.error('FAIL: Missing Cloudflare Pages _redirects file (public/_redirects).');
  process.exit(1);
}

const content = fs.readFileSync(redirectsPath, 'utf8');

const hasSPARewrite = content.split('\n').some(line => {
  const trimmed = line.trim();
  // Match: /* /index.html 200
  return /^\/\*\s+\/index\.html\s+200/.test(trimmed);
});

if (!hasSPARewrite) {
  console.error('FAIL: Missing SPA catch-all redirect: /* /index.html 200');
  process.exit(1);
}

console.log('PASS: Cloudflare Pages SPA redirect configured correctly.');
