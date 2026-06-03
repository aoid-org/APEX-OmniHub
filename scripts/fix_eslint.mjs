import fs from 'node:fs';

const files = [
  "tests/e2e-playwright/pwa-seo-assets.spec.ts",
  "tests/omnidash/connect-ai-byom.spec.tsx",
  "tests/omnidash/fake-success-guardrails.spec.tsx",
  "tests/omnidash/module-actions-realness.spec.tsx",
  "tests/omnidash/omnimedia-omnislate-boundary.spec.tsx",
  "tests/omnidash/omniskills-forge.spec.tsx",
  "tests/omnidash/orphaned-components-routing.spec.tsx",
  "tests/omnidash/production-truthfulness.spec.tsx",
  "tests/omnidash/theme-system.spec.tsx",
  "tests/omnidash/translation-realness.spec.tsx",
  "tests/omnidash/widget-lifecycle.spec.tsx",
  "tests/omnidash/zero-mock-widgets.spec.tsx",
  "tests/smoke/prompt16-rls-tenant-isolation-secrets-retention-privacy-migrations.test.ts",
  "tests/smoke/prompt17-claims.test.ts",
  "tests/smoke/prompt17-launch-claims-capability-badges-demo-gating-pwa-assets-accessibility.test.ts",
  "tests/smoke/prompt17-pwa-seo-assets.test.ts",
  "tests/stress/battery.spec.ts",
  "tests/unit/omniport-logging.test.ts"
];

const header = "/* eslint-disable @typescript-eslint/no-unused-vars */\n";

for (const file of files) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.startsWith("/* eslint-disable")) {
      fs.writeFileSync(file, header + content, 'utf8');
    }
  }
}
