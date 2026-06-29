import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Hotfix guard (2026-06-28): PR #1510 introduced a "Connections" split
// (Third-Party Connections + Connected APEX Apps, with a "+ Connect App"
// CTA) that duplicated both OmniBoard (third-party) and the APEX Ecosystem
// widget's "Add APEX App" (first-party). It was reverted to a display-only
// Integrated Apps Gallery. This test fails the build if the split — or its
// test ids / CTA copy — creeps back into the dashboard canvas.
const SHELL_PATH = path.resolve(
  __dirname,
  '../../apps/omnihub-site/dashboard/OmniDashShell.tsx',
);

describe('Integrated Apps Gallery — static regression guard', () => {
  const content = fs.readFileSync(SHELL_PATH, 'utf-8');

  it.each([
    'ConnectionsWidget',
    'Third-Party Connections',
    'Connected APEX Apps',
    'connections-third-party',
    'connections-apex-apps',
    '+ Connect Third-Party App',
    '+ Connect App',
  ])('does not reintroduce %s into the dashboard canvas', (forbidden) => {
    expect(content).not.toContain(forbidden);
  });

  it('renders the gallery as IntegratedAppsGalleryWidget under widget_apps', () => {
    expect(content).toMatch(/const IntegratedAppsGalleryWidget = /);
    expect(content).toMatch(
      /widget_apps"[\s\S]{0,40}<IntegratedAppsGalleryWidget \/>/,
    );
  });

  // Owner-approved (PR #1516): renamed to "App Gallery" and reshaped to four
  // horizontal "Awaiting" slots. See APEX_SURFACE_REGISTRY.md Canonical Layout Law.
  it('gallery heading reads exactly "App Gallery"', () => {
    expect(content).toMatch(/<SectionLabel>App Gallery<\/SectionLabel>/);
  });

  it('gallery uses the four-column horizontal Awaiting grid', () => {
    expect(content).toMatch(/gridTemplateColumns:\s*['"]repeat\(4,\s*minmax\(0,\s*1fr\)\)['"]/);
  });
});
