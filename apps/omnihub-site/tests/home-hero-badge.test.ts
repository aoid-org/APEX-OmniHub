import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { getHeroBadgeAssetPath, getLandingHtml } from '../src/pages/Home';

const heroBadgeAssetPath = getHeroBadgeAssetPath();
const heroBadgeFilePath = `apps/omnihub-site/public${heroBadgeAssetPath}`;
const landingHtml = getLandingHtml();

describe('Homepage hero core badge wiring', () => {
  it('references the hero badge asset from the app public directory', () => {
    expect(heroBadgeAssetPath).toBe('/assets/hero/apex-core-badge.svg');
    expect(landingHtml).toContain(`href="${heroBadgeAssetPath}"`);
    expect(landingHtml).toContain(`xlink:href="${heroBadgeAssetPath}"`);
  });

  it('ships the referenced hero badge image at the expected public path', () => {
    expect(existsSync(heroBadgeFilePath)).toBe(true);
  });

  it('keeps the badge superimposed inside the orb clip path with pulse animation', () => {
    expect(landingHtml).toContain('<g clip-path="url(#sclip)"><image');
    expect(landingHtml).toContain('<animate attributeName="opacity" values="0.82;1;0.82" dur="2.6s" repeatCount="indefinite"/>');
  });
});
