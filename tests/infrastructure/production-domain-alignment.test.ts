import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('production domain alignment', () => {
  const productionTerraform = readFileSync(
    resolve(process.cwd(), 'terraform/environments/production/main.tf'),
    'utf8',
  );
  const rootSiteUrl = readFileSync(resolve(process.cwd(), 'src/lib/site-url.ts'), 'utf8');
  const appSiteUrl = readFileSync(
    resolve(process.cwd(), 'apps/omnihub-site/src/lib/site-url.ts'),
    'utf8',
  );
  const wranglerConfig = readFileSync(resolve(process.cwd(), 'wrangler.toml'), 'utf8');
  const nodeVersion = readFileSync(resolve(process.cwd(), '.node-version'), 'utf8').trim();
  const homePage = readFileSync(resolve(process.cwd(), 'apps/omnihub-site/src/pages/Home.tsx'), 'utf8');

  it('pins terraform production routing to apexomnihub.icu', () => {
    expect(productionTerraform).toContain('domain               = "apexomnihub.icu"');
  });

  it('keeps both site-url helpers aligned to apexomnihub.icu', () => {
    expect(rootSiteUrl).toContain("return 'https://apexomnihub.icu';");
    expect(appSiteUrl).toContain("return 'https://apexomnihub.icu';");
  });

  it('keeps homepage canonical metadata aligned to apexomnihub.icu', () => {
    expect(homePage).toContain('canonical="https://apexomnihub.icu/"');
  });

  it('pins Cloudflare Pages project config to the canonical production target', () => {
    expect(wranglerConfig).toContain('name = "apex-omnihub"');
    expect(wranglerConfig).toContain('pages_build_output_dir = "dist"');
    expect(nodeVersion).toBe('24');
  });
});
