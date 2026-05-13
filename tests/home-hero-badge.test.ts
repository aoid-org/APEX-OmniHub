import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync('apps/omnihub-site/src/pages/Home.tsx', 'utf8');

describe('Homepage hero core badge wiring', () => {
  it('uses inline SVG badge — no external PNG dependency', () => {
    // Badge is now inline SVG (zero external deps, cannot produce broken-image).
    // The old Vite-imported PNG was replaced because hash mismatches caused
    // the <image> element to fail silently in production.
    expect(homeSource).not.toContain("import apexBadgePng from '@/components/icons/apex-badge.png'");
    expect(homeSource).not.toContain('href={apexBadgePng}');
    // Inline badge must declare the icy-core radial gradient
    expect(homeSource).toContain('id="core"');
  });

  it('keeps the inline badge superimposed inside the orb clip path with pulse animation', () => {
    expect(homeSource).toContain('clipPath="url(#sclip)"');
    // Inline SVG badge elements
    expect(homeSource).toContain('APEX');
    expect(homeSource).toContain('animateTransform');
    expect(homeSource).toContain('<animate attributeName="opacity"');
  });
});
