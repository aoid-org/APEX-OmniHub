import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('WAF credential-scan block documentation verification', () => {
  const runbookPath = existsSync(resolve(process.cwd(), 'docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md'))
    ? resolve(process.cwd(), 'docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md')
    : resolve(process.cwd(), 'memory/omni-recall/docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md');

  it('asserts that docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md exists', () => {
    expect(existsSync(runbookPath)).toBe(true);
  });

  it('asserts that section 9.36 documents the manual WAF credential-scan block rule ID and expression', () => {
    expect(existsSync(runbookPath)).toBe(true);
    const content = readFileSync(runbookPath, 'utf8');

    // Must contain section 9.36
    expect(content).toContain('9.36');

    // Must document all targeted scan paths
    expect(content).toContain('/.env');
    expect(content).toContain('.env.bak');
    expect(content).toContain('/root/.boto');
    expect(content).toContain('serverless.yml');
    expect(content).toContain('/payment/stripe.json');

    // Must document the action and a 32-char hex rule ID assigned by Cloudflare dashboard/API
    expect(content).toMatch(/Rule ID:\*{0,2}\s*`?[a-f0-9]{32}`?/i);
    expect(content).toMatch(/Action:\*{0,2}\s*`?block`?/i);
  });
});
