import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('monitoring security', () => {
  it('does not import from esm.sh CDN', () => {
    const monitoringSource = readFileSync(
      resolve(__dirname, '../../src/lib/monitoring.ts'),
      'utf-8',
    );
    expect(monitoringSource).not.toContain('esm.sh');
    expect(monitoringSource).not.toContain('cdn.skypack');
    expect(monitoringSource).not.toContain('unpkg.com');
  });

  it('imports @sentry/browser as bundled dependency', () => {
    const monitoringSource = readFileSync(
      resolve(__dirname, '../../src/lib/monitoring.ts'),
      'utf-8',
    );
    expect(monitoringSource).toContain("from '@sentry/browser'");
  });
});
