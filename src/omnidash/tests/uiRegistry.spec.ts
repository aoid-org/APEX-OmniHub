/**
 * TDD: OMNIDASH_UI_REGISTRY — surface kind contract
 *
 * Written FAILING first. Verifies the panel/page surface contract,
 * keyboard shortcut uniqueness, and required header actions.
 *
 * Run: vitest src/omnidash/tests/uiRegistry.spec.ts
 */
import { describe, it, expect } from 'vitest';
import { OMNIDASH_UI_REGISTRY, HEADER_ACTIONS } from '../uiRegistry';
import { OMNIDASH_NAV_ITEMS } from '../types';

describe('OMNIDASH_UI_REGISTRY — route surface kinds', () => {
  it('the root /omnidash route is registered as kind page', () => {
    const root = OMNIDASH_UI_REGISTRY.routes.find((r) => r.path === '/omnidash');
    expect(root).toBeDefined();
    expect(root?.kind).toBe('page');
  });

  it('all non-root routes are registered as kind panel', () => {
    const panels = OMNIDASH_UI_REGISTRY.routes.filter((r) => r.path !== '/omnidash');
    for (const panel of panels) {
      expect(panel.kind).toBe('panel');
    }
  });

  it('every OMNIDASH_NAV_ITEMS entry has a corresponding registered route', () => {
    const registeredPaths = new Set(OMNIDASH_UI_REGISTRY.routes.map((r) => r.path));
    for (const nav of OMNIDASH_NAV_ITEMS) {
      expect(registeredPaths.has(nav.to)).toBe(true);
    }
  });

  it('no duplicate routes are registered', () => {
    const paths = OMNIDASH_UI_REGISTRY.routes.map((r) => r.path);
    expect(paths.length).toBe(new Set(paths).size);
  });
});

describe('OMNIDASH_NAV_ITEMS — keyboard shortcut uniqueness', () => {
  it('all shortcuts are unique across nav items', () => {
    const shortcuts = OMNIDASH_NAV_ITEMS
      .filter((item) => item.shortcut !== undefined)
      .map((item) => item.shortcut!);
    expect(shortcuts.length).toBe(new Set(shortcuts).size);
  });

  it('all nav item keys are unique', () => {
    const keys = OMNIDASH_NAV_ITEMS.map((item) => item.key);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('all nav item labels are unique', () => {
    const labels = OMNIDASH_NAV_ITEMS.map((item) => item.label);
    expect(labels.length).toBe(new Set(labels).size);
  });
});

describe('HEADER_ACTIONS — required surface actions', () => {
  it('connect-ai header action is present and required', () => {
    const action = HEADER_ACTIONS.find((a) => a.id === 'connect-ai');
    expect(action).toBeDefined();
    expect(action?.required).toBe(true);
  });

  it('persona header action is present and required', () => {
    const action = HEADER_ACTIONS.find((a) => a.id === 'persona');
    expect(action).toBeDefined();
    expect(action?.required).toBe(true);
  });

  it('no duplicate action ids exist', () => {
    const ids = HEADER_ACTIONS.map((a) => a.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
