import { describe, expect, it } from 'vitest';
import { HERO_BADGE_ASSET_PATH, getHeroBadgeAssetPath } from '../src/lib/heroAssets';

describe('heroAssets', () => {
  it('exports canonical path', () => {
    expect(HERO_BADGE_ASSET_PATH).toBe('/assets/hero/apex-core-badge.svg');
  });

  it('helper returns canonical path', () => {
    expect(getHeroBadgeAssetPath()).toBe(HERO_BADGE_ASSET_PATH);
  });
});
