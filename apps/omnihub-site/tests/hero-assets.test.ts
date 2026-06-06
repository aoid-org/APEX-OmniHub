import { describe, expect, it } from 'vitest';
import { HERO_BADGE_ASSET_PATH, getHeroBadgeAssetPath } from '../src/lib/heroAssets';

describe('heroAssets', () => {
  it('exports canonical path (PNG raster — SVG excluded due to feColorMatrix collision with parent DOF pipeline)', () => {
    // The PNG raster is used intentionally. The SVG source (/assets/hero/apex-core-badge.svg)
    // has nested feColorMatrix filters that collide with the parent orb SVG's mask + Gaussian-blur
    // DOF pipeline producing a garbled silhouette. Do not revert this to .svg without re-testing visually.
    expect(HERO_BADGE_ASSET_PATH).toBe('/assets/apex-core-badge.png');
  });

  it('helper returns canonical path', () => {
    expect(getHeroBadgeAssetPath()).toBe(HERO_BADGE_ASSET_PATH);
  });
});
