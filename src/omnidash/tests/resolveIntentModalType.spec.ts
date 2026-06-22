/**
 * TDD: resolveIntentModalType — pure function, zero side-effects
 *
 * Written FAILING first. These tests drive the extraction of
 * resolveIntentModalType into a testable export from useOmniDashAction.
 *
 * Run: vitest src/omnidash/tests/resolveIntentModalType.spec.ts
 */
import { describe, it, expect } from 'vitest';
import { resolveIntentModalType } from '../useOmniDashAction';
import type { OmniDashIntent } from '../useOmniDashAction';

const BASE: OmniDashIntent = {
  source: 'integration',
  appKey: 'quickbooks',
  provider: 'QuickBooks',
  label: 'QuickBooks',
  category: 'finance',
  routePath: '/omnidash/integrations/quickbooks',
  dashboardStatus: 'Live',
};

describe('resolveIntentModalType — Priority Rule 1: Partial → oauth', () => {
  it('returns type oauth and shouldNavigate false for Partial status', () => {
    const result = resolveIntentModalType({ ...BASE, dashboardStatus: 'Partial' });
    expect(result.type).toBe('oauth');
    expect(result.shouldNavigate).toBe(false);
  });

  it('never returns renderMode for Partial intents', () => {
    const result = resolveIntentModalType({
      ...BASE,
      dashboardStatus: 'Partial',
      contextData: { appType: 'media' }, // spatial hint should be IGNORED when Partial
    });
    expect(result.type).toBe('oauth');
    expect(result.renderMode).toBeUndefined();
  });
});

describe('resolveIntentModalType — Priority Rule 2: Live + spatial appType → spatial renderMode', () => {
  for (const appType of ['media', 'editor', 'terminal'] as const) {
    it(`appType '${appType}' → renderMode spatial`, () => {
      const result = resolveIntentModalType({
        ...BASE,
        dashboardStatus: 'Live',
        contextData: { appType },
      });
      expect(result.type).toBe('form');
      expect(result.renderMode).toBe('spatial');
      expect(result.shouldNavigate).toBe(false);
    });
  }

  it('unknown appType is NOT treated as spatial', () => {
    const result = resolveIntentModalType({
      ...BASE,
      dashboardStatus: 'Live',
      contextData: { appType: 'game' },
    });
    expect(result.renderMode).not.toBe('spatial');
  });
});

describe('resolveIntentModalType — Priority Rule 3: Live + entryUrl → microfrontend', () => {
  it('returns microfrontend when entryUrl is present', () => {
    const result = resolveIntentModalType({
      ...BASE,
      dashboardStatus: 'Live',
      contextData: { entryUrl: 'https://app.example.com' },
    });
    expect(result.type).toBe('microfrontend');
    expect(result.shouldNavigate).toBe(false);
  });

  it('spatial appType takes priority over entryUrl (Rule 2 > Rule 3)', () => {
    const result = resolveIntentModalType({
      ...BASE,
      dashboardStatus: 'Live',
      contextData: { appType: 'media', entryUrl: 'https://app.example.com' },
    });
    expect(result.type).toBe('form');
    expect(result.renderMode).toBe('spatial');
  });
});

describe('resolveIntentModalType — Priority Rule 4: Live module → module modal', () => {
  it('source module with no contextData signals → type module', () => {
    const result = resolveIntentModalType({
      ...BASE,
      source: 'module',
      dashboardStatus: 'Live',
    });
    expect(result.type).toBe('module');
    expect(result.shouldNavigate).toBe(false);
  });
});

describe('resolveIntentModalType — Fallback: Live integration with no signals → oauth', () => {
  it('integration source, Live, no contextData → fallback oauth', () => {
    const result = resolveIntentModalType({ ...BASE, dashboardStatus: 'Live' });
    expect(result.type).toBe('oauth');
    expect(result.shouldNavigate).toBe(false);
  });
});

describe('resolveIntentModalType — Determinism', () => {
  it('identical inputs always produce identical outputs (idempotent)', () => {
    const intent: OmniDashIntent = { ...BASE, dashboardStatus: 'Partial' };
    expect(resolveIntentModalType(intent)).toEqual(resolveIntentModalType(intent));
  });
});
