import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { OMNIDASH_UI_REGISTRY } from '@/omnidash/uiRegistry';
import { FEATURE_REGISTRY } from '@/features/registry';

describe('OmniDash UI registry', () => {
  it('declares required header actions', () => {
    const actionIds = OMNIDASH_UI_REGISTRY.headerActions.map((action) => action.id);
    expect(actionIds).toContain('connect-ai');
    expect(actionIds).toContain('persona');
  });

  it('keeps registry routes aligned with OmniDash app routes', () => {
    const appSource = readFileSync('src/App.tsx', 'utf8');
    for (const route of OMNIDASH_UI_REGISTRY.routes) {
      const nestedPath = route.path === '/omnidash' ? '/omnidash' : route.path.replace('/omnidash/', '');
      const isMounted = appSource.includes(`path="${route.path}"`) || appSource.includes(`path="${nestedPath}"`);
      expect(isMounted).toBe(true);
    }
  });

  it('aligns feature registry OmniDash home to /omnidash index (no /omnidash/today drift)', () => {
    const todayFeature = FEATURE_REGISTRY.find((feature) => feature.id === 'omnidash-today');
    expect(todayFeature?.path).toBe('/omnidash');
  });
});
