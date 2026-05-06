import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync('apps/omnihub-site/src/pages/Home.tsx', 'utf8');

describe('Homepage hero core badge wiring', () => {
  it('uses the production hero badge asset path served from root public', () => {
    expect(homeSource).toContain('href="/assets/hero/apex-core-badge.svg"');
    expect(homeSource).toContain('xlink:href="/assets/hero/apex-core-badge.svg"');
  });

  it('keeps the badge superimposed inside the orb clip path with pulse animation', () => {
    expect(homeSource).toContain('<g clip-path="url(#sclip)"><image');
    expect(homeSource).toContain('<animate attributeName="opacity" values="0.82;1;0.82" dur="2.6s" repeatCount="indefinite"/>');
  });
});
