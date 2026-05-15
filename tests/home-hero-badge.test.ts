import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync('apps/omnihub-site/src/pages/Home.tsx', 'utf8');
const heroAssetsSource = readFileSync('apps/omnihub-site/src/lib/heroAssets.ts', 'utf8');

describe('Homepage hero core badge wiring', () => {
  it('uses the committed SVG badge asset instead of the removed inline icon', () => {
    expect(homeSource).not.toContain("import apexBadgePng from '@/components/icons/apex-badge.png'");
    expect(homeSource).not.toContain('href={apexBadgePng}');
    expect(homeSource).not.toContain('APEX Canonical Brand Badge');
    expect(homeSource).not.toContain('id="core"');
    expect(homeSource).toContain('href={HERO_BADGE_ASSET_PATH}');
    expect(heroAssetsSource).toContain("/assets/apex-core-badge.svg");
  });

  it('keeps the badge asset superimposed inside the orb clip path', () => {
    expect(homeSource).toContain('clipPath="url(#sclip)"');
    expect(homeSource).toContain('aria-label="APEX OmniHub core badge"');
    expect(homeSource).toContain('preserveAspectRatio="xMidYMid meet"');
  });
});
