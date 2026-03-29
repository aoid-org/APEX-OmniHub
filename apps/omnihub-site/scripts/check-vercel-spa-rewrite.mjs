import fs from 'node:fs';
import path from 'node:path';

const vercelConfigPath = path.join(process.cwd(), 'vercel.json');

if (!fs.existsSync(vercelConfigPath)) {
  console.error('FAIL: Missing Vercel config (vercel.json) in app root.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

if (!config.rewrites) {
  console.error('FAIL: Missing rewrites in vercel.json.');
  process.exit(1);
}

const hasSPARewrite = config.rewrites.some(r => r.source === '/(.*)' && r.destination === '/index.html');

if (!hasSPARewrite) {
  console.error('FAIL: Missing SPA catch-all rewrite: { "source": "/(.*)", "destination": "/index.html" }');
  process.exit(1);
}

console.log('PASS: Vercel SPA rewrite configured correctly.');
