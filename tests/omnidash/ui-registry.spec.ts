import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { OMNIDASH_UI_REGISTRY } from '@/omnidash/uiRegistry';
import { FEATURE_REGISTRY } from '@/features/registry';
import { APP_REGISTRY } from '../../packages/core/src/registry';

describe('OmniDash UI registry', () => {
  it('declares required header actions', () => {
    const actionIds = OMNIDASH_UI_REGISTRY.headerActions.map((action) => action.id);
    expect(actionIds).toContain('connect-ai');
    expect(actionIds).toContain('persona');
  });

  it('keeps registry routes aligned with OmniDash app routes', () => {
    const appSource = readFileSync('src/App.tsx', 'utf8');
    const siteSource = readFileSync('apps/omnihub-site/src/App.tsx', 'utf8');
    const combinedSource = appSource + siteSource;
    const routesDeclaredViaSharedRegistry = combinedSource.includes('APP_REGISTRY') && combinedSource.includes('routePath');

    for (const route of OMNIDASH_UI_REGISTRY.routes) {
      const nestedPath = route.path === '/omnidash' ? '/omnidash' : route.path.replace('/omnidash/', '');
      const isMountedViaLiteralPath = combinedSource.includes(`path="/omnidash"`) || combinedSource.includes(`path="${route.path}"`) || combinedSource.includes(`path="${nestedPath}"`);
      const isMountedViaRegistry = routesDeclaredViaSharedRegistry && APP_REGISTRY.some((entry) => entry.routePath === route.path);
      const isMounted = isMountedViaLiteralPath || isMountedViaRegistry;

      expect(isMounted).toBe(true);
    }
  });

  it('aligns feature registry OmniDash home to /omnidash index (no /omnidash/today drift)', () => {
    const todayFeature = FEATURE_REGISTRY.find((feature) => feature.id === 'omnidash-today');
    expect(todayFeature?.path).toBe('/omnidash');
  });
});
