import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const homeSource = readFileSync('apps/omnihub-site/src/pages/Home.tsx', 'utf8');
const heroBadgePath = 'apps/omnihub-site/public/assets/hero/apex-core-badge.svg';

describe('Homepage hero core badge wiring', () => {
  it('references the hero badge asset from the app public directory', () => {
    expect(homeSource).toContain('href="/assets/hero/apex-core-badge.svg"');
    expect(homeSource).toContain('xlink:href="/assets/hero/apex-core-badge.svg"');
  });

  it('ships the referenced hero badge image at the expected public path', () => {
    expect(existsSync(heroBadgePath)).toBe(true);
  });

  it('keeps the badge superimposed inside the orb clip path with pulse animation', () => {
    expect(homeSource).toContain('<g clip-path="url(#sclip)"><image');
    expect(homeSource).toContain('<animate attributeName="opacity" values="0.82;1;0.82" dur="2.6s" repeatCount="indefinite"/>');
  });
});
