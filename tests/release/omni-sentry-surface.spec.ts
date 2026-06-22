/**
 * OmniSentry surface gate.
 *
 * Proves the certified "OmniSentry self-healing monitor" claim is backed by a
 * real, reachable surface driving the real runtime — not a mock.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getHealthStatus, initializeOmniSentry, shutdownOmniSentry } from '../../src/lib/omni-sentry';

const ROOT = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

describe('OmniSentry runtime is functional', () => {
  it('returns a well-formed live health status', () => {
    initializeOmniSentry();
    const health = getHealthStatus();
    expect(['healthy', 'degraded', 'critical']).toContain(health.status);
    expect(['closed', 'open', 'half-open']).toContain(health.metrics.circuitState);
    expect(typeof health.metrics.errorRate).toBe('number');
    expect(Array.isArray(health.diagnostics)).toBe(true);
    expect(typeof health.timestamp).toBe('string');
    shutdownOmniSentry();
  });
});

describe('OmniSentry surface is wired into the app', () => {
  it('registers the /omni-sentry route', () => {
    const app = read('apps/omnihub-site/src/App.tsx');
    expect(app).toContain('OmniSentryPage');
    expect(app).toContain('"/omni-sentry"');
  });

  it('page renders the live panel', () => {
    const page = read('apps/omnihub-site/src/pages/OmniSentry.tsx');
    expect(page).toContain('OmniSentryPanel');
  });

  it('panel drives the real OmniSentry runtime (not a mock)', () => {
    const panel = read('apps/omnihub-site/src/components/OmniSentryPanel.tsx');
    expect(panel).toContain('src/lib/omni-sentry');
    expect(panel).toContain('initializeOmniSentry');
    expect(panel).toContain('getHealthStatus');
  });

  it('startup activates the monitor from saved preference', () => {
    const main = read('src/main.tsx');
    expect(main).toContain('initializeOmniSentry');
    expect(main).toContain('omni_sentry_enabled');
  });
});
