import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
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
  const homePage = readFileSync(resolve(process.cwd(), 'apps/omnihub-site/src/pages/Home.tsx'), 'utf8');

  const productionDeployWorkflow = readFileSync(
    resolve(process.cwd(), '.github/workflows/deploy-production-cf-direct.yml'),
    'utf8',
  );
  const rootWranglerToml = resolve(process.cwd(), 'wrangler.toml');

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

  it('asserts the real architecture without root wrangler.toml', () => {
    // 1. root wrangler.toml is absent:
    expect(existsSync(rootWranglerToml)).toBe(false);

    // 2. production deploy workflow targets the canonical Cloudflare Pages project and output:
    // Project name is now pinned (not driven by the misconfigured repo var that was set to 'omnihub'):
    expect(productionDeployWorkflow).toContain('CF_PROJECT_NAME: apex-omnihub');
    expect(productionDeployWorkflow).not.toContain('CF_PROJECT_NAME: omnihub');
    expect(productionDeployWorkflow).toContain('npx --yes --ignore-scripts wrangler@latest pages deploy dist');
    expect(productionDeployWorkflow).toContain('--project-name="${CF_PROJECT_NAME}"');

    // 3. Node 24 remains pinned:
    const nodeVersion = productionDeployWorkflow.match(/node-version:\s*"([^"]+)"/)?.[1];
    expect(nodeVersion).toBe('24');
    expect(productionDeployWorkflow).toContain('node-version: "24"');
  });
});
