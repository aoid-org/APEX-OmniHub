import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`[cloudflare-pages-contract] ${message}`);
  process.exitCode = 1;
};
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

const rootWrangler = path.join(root, 'wrangler.toml');
if (fs.existsSync(rootWrangler)) {
  fail('root wrangler.toml must not exist; Cloudflare Pages deployment is dashboard/workflow managed.');
}

const packageJson = readJson('package.json');
if (packageJson.scripts?.build !== 'vite build') {
  fail('package.json must keep the canonical Cloudflare Pages build command as `bun run build` -> `vite build`.');
}

const productionWorkflow = fs.readFileSync(path.join(root, '.github/workflows/deploy-production-cf-direct.yml'), 'utf8');
if (!productionWorkflow.includes('bun run build')) {
  fail('production Cloudflare workflow must build with `bun run build`.');
}
if (!productionWorkflow.includes('wrangler@latest pages deploy dist')) {
  fail('production Cloudflare workflow must deploy the root dist directory.');
}

const ciRuntimeGates = fs.readFileSync(path.join(root, '.github/workflows/ci-runtime-gates.yml'), 'utf8');
if (!ciRuntimeGates.includes('bun run verify:cloudflare-pages-contract')) {
  fail('ci-runtime-gates must run verify:cloudflare-pages-contract before Cloudflare deployment.');
}

const distIndex = path.join(root, 'dist/index.html');
if (!fs.existsSync(distIndex)) {
  fail('dist/index.html is missing. Run `bun run build` before this verifier.');
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[cloudflare-pages-contract] OK: no root wrangler.toml, build command is bun run build, output is dist/index.html.');
