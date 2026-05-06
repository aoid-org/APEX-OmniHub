import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync('apps/omnihub-site/src/pages/Home.tsx', 'utf8');

describe('Homepage hero core badge wiring', () => {
  it('uses inline SVG for the badge — no external asset dependency', () => {
    // apex-core-badge.svg was never committed; badge is now inline SVG
    expect(homeSource).not.toContain('href="/assets/hero/apex-core-badge.svg"');
    expect(homeSource).not.toContain('xlink:href="/assets/hero/apex-core-badge.svg"');
    expect(homeSource).toContain('viewBox="0 0 72 72"');
  });

  it('keeps the badge superimposed inside the orb clip path with pulse animation', () => {
    expect(homeSource).toContain('<g clip-path="url(#sclip)"><svg');
    expect(homeSource).toContain('<animate attributeName="opacity" values="0.82;1;0.82" dur="2.6s" repeatCount="indefinite"/>');
  });
});
