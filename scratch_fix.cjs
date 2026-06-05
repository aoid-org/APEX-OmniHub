const fs = require('fs');

function replaceFile(path, replacer) {
  try {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
    console.log('Fixed', path);
  } catch (e) {
    console.error('Error with', path, e.message);
  }
}

replaceFile('tests/components/PhysiOmniWhiteLabelDash.spec.tsx', c => c.replace(/import React from 'react';\r?\n/, ''));
replaceFile('tests/e2e-playwright/pwa-seo-assets.spec.ts', c => c.replace(/, expect }/, ' }'));
replaceFile('tests/maestro/backend.test.ts', c => c.replace(/, expectPlaceholder }/, ' }'));
replaceFile('tests/omnidash/omnimodal-payload-safety.spec.tsx', c => c.replace(/\s*\/\/ @ts-expect-error.*/g, ''));
replaceFile('tests/omnidash/omnislate-insights.spec.tsx', c => c.replace(/\s*\/\/ @ts-expect-error.*/g, ''));
replaceFile('tests/smoke/prompt16-rls-tenant-isolation-secrets-retention-privacy-migrations.test.ts', c => c.replace(/, expect }/, ' }'));
replaceFile('tests/smoke/prompt17-claims.test.ts', c => c.replace(/, expect }/, ' }'));
replaceFile('tests/smoke/prompt17-launch-claims-capability-badges-demo-gating-pwa-assets-accessibility.test.ts', c => c.replace(/, expect }/, ' }'));
replaceFile('tests/smoke/prompt17-pwa-seo-assets.test.ts', c => c.replace(/, expect }/, ' }'));
replaceFile('tests/stress/battery.spec.ts', c => c.replace(/import .*? from .*?;\r?\n/, ''));
replaceFile('tests/unit/omniport-logging.test.ts', c => c.replace(/, expect }/, ' }').replace(/, RawInput /, ' ').replace(/let omniPort: OmniPort;\r?\n/, '').replace(/let consoleLogSpy: ReturnType<typeof vi\.spyOn>;\r?\n/, ''));
