import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(path, 'utf8');
}

describe('production hardening source gates', () => {
  it('billing actions do not use mailto, alert, or hardcoded non-Stripe billing domains', () => {
    const source = read('apps/omnihub-site/dashboard/components/modules/BillingModule.tsx');
    expect(source).not.toContain('mailto:');
    expect(source).not.toContain('alert(');
    expect(source).not.toContain('billing.apexbusiness.systems');
    expect(source).toContain("supabase.functions.invoke('create-billing-portal'");
    expect(source).toContain('billing\\.stripe\\.com');
  });

  it('create-billing-portal requires auth, customer id, Stripe server session, and typed fail-closed errors', () => {
    const source = read('supabase/functions/create-billing-portal/index.ts');
    expect(source).toContain("req.headers.get('Authorization')");
    expect(source).toContain('userClient.auth.getUser()');
    expect(source).toContain(".from('subscriptions')");
    expect(source).toContain(".eq('user_id', user.id)");
    expect(source).toContain('stripe_customer_id');
    expect(source).toContain('stripe.billingPortal.sessions.create');
    expect(source).toContain("errResponse('UNAUTHORIZED'");
    expect(source).toContain("errResponse('BILLING_CUSTOMER_NOT_FOUND'");
    expect(source).toContain("errResponse('BILLING_PORTAL_UNAVAILABLE'");
  });

  it('OmniBoard proxy route parsing and handlers return typed failures instead of dead generic errors', () => {
    const source = read('supabase/functions/omnilink-port/index.ts');
    expect(source).toContain("segments.indexOf('omnilink-port')");
    expect(source).toContain("route === 'omniboard-start'");
    expect(source).toContain("route === 'omniboard-next'");
    expect(source).toContain("omnilink_enabled: OMNILINK_ENABLED === true");
    expect(source).toContain('function omniBoardError');
    expect(source).toContain("'connect_timeout'");
    expect(source).toContain("'session_id_required'");
    expect(source).not.toContain("route === 'omniboard-start' && req.method === 'GET'");
  });

  it('production deploy publishes OmniBoard and billing Edge Functions before deployed smoke', () => {
    const workflow = read('.github/workflows/deploy-production-cf-direct.yml');
    expect(workflow).toContain('supabase functions deploy omnilink-port');
    expect(workflow).toContain('supabase functions deploy create-billing-portal');
    expect(workflow.indexOf('Deploy OmniBoard and Billing Edge Functions')).toBeLessThan(
      workflow.indexOf('Real smoke test (assert deployed bundle config)')
    );
  });

  it('deployed bundle smoke has a curl fallback for proxy-constrained Node fetch', () => {
    const source = read('scripts/ci/verify-deployed-bundle.mjs');
    expect(source).toContain("execFileSync('curl'");
    expect(source).toContain('allowErrorStatus');
    expect(source).toContain('curl fallback');
  });

  it('PWA integrity guard fails when dist manifest, service worker, or registration is missing', () => {
    const temp = mkdtempSync(join(tmpdir(), 'pwa-guard-'));
    try {
      mkdirSync(join(temp, 'scripts/ci'), { recursive: true });
      mkdirSync(join(temp, 'apps/omnihub-site/public'), { recursive: true });
      mkdirSync(join(temp, 'apps/omnihub-site/src'), { recursive: true });
      mkdirSync(join(temp, 'src'), { recursive: true });
      mkdirSync(join(temp, 'dist/assets'), { recursive: true });
      cpSync('scripts/ci/check-pwa-integrity.mjs', join(temp, 'scripts/ci/check-pwa-integrity.mjs'));
      writeFileSync(join(temp, 'apps/omnihub-site/public/manifest.webmanifest'), JSON.stringify({ name: 'x', start_url: '/', icons: [{ sizes: '192x192' }, { sizes: '512x512' }] }));
      writeFileSync(join(temp, 'apps/omnihub-site/public/sw.js'), 'self.addEventListener("install",()=>{})');
      writeFileSync(join(temp, 'index.html'), '<link rel="manifest" href="/manifest.webmanifest"><script src="/assets/app.js"></script>');
      writeFileSync(join(temp, 'src/swInit.ts'), 'navigator.serviceWorker.register("/sw.js")');
      writeFileSync(join(temp, 'src/main.tsx'), 'registerServiceWorker()');
      writeFileSync(join(temp, 'apps/omnihub-site/src/App.tsx'), 'PWAInstallBanner');
      writeFileSync(join(temp, 'dist/index.html'), '<script src="/assets/app.js"></script>');
      writeFileSync(join(temp, 'dist/assets/app.js'), 'console.log("no sw")');
      expect(() => execFileSync('node', ['scripts/ci/check-pwa-integrity.mjs'], { cwd: temp, stdio: 'pipe' })).toThrow();
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});
