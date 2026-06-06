import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const homeSource = readFileSync(resolve(__dirname, '../src/pages/Home.tsx'), 'utf8');

describe('Homepage hero core badge wiring', () => {
  it('uses the production hero badge asset path served from root public', () => {
    expect(homeSource).toContain('href={HERO_BADGE_ASSET_PATH}');
    // After refactor to JSX, xlink:href became xlinkHref
    expect(homeSource).toContain('xlinkHref={HERO_BADGE_ASSET_PATH}');
  });

  it('keeps the badge superimposed inside the orb clip path with pulse animation', () => {
    // After refactor to JSX, clip-path became clipPath
    expect(homeSource).toContain('clipPath="url(#sclip)"');
    expect(homeSource).toContain('<image');
    expect(homeSource).toContain('<animate attributeName="opacity" values="0.82;1;0.82" dur="2.6s" repeatCount="indefinite" />');
  });
});
