import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync('apps/omnihub-site/src/pages/Home.tsx', 'utf8');

describe('Homepage hero core badge wiring', () => {
  it('uses the Vite-imported PNG badge asset (apex-badge.png)', () => {
    // Badge is now Vite-imported (hashed URL, SW pre-cached) rather than a raw public path.
    expect(homeSource).toContain("import apexBadgePng from '@/components/icons/apex-badge.png'");
    expect(homeSource).toContain('href={apexBadgePng}');
  });

  it('keeps the badge superimposed inside the orb clip path with pulse animation', () => {
    // After refactor to JSX, clip-path became clipPath
    expect(homeSource).toContain('clipPath="url(#sclip)"');
    expect(homeSource).toContain('<image');
    expect(homeSource).toContain('<animate attributeName="opacity" values="0.88;1;0.88" dur="2.6s" repeatCount="indefinite"');
  });
});
