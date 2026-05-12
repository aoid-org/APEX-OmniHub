import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync('apps/omnihub-site/src/pages/Home.tsx', 'utf8');

describe('Homepage hero core badge wiring', () => {
  it('uses the production hero badge asset path served from root public', () => {
    expect(homeSource).toContain('import apexBadgePng from \'@/components/icons/apex-badge.png\';');
    expect(homeSource).toContain('<image href={apexBadgePng}');
  });

  it('keeps the badge superimposed inside the orb clip path with pulse animation', () => {
    expect(homeSource).toContain('clipPath="url(#sclip)"');
    expect(homeSource).toContain('<circle cx="260" cy="265" r="66" fill="url(#badge-bloom)">');
    expect(homeSource).toContain('<animate attributeName="opacity"');
  });
});
