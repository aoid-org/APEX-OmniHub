/**
 * Omnidash CSS Contract Tests
 * Lock 3: Assert CSS layout rules are deterministic and never drift.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CSS_PATH = resolve(__dirname, '../../apps/omnihub-site/src/styles/omnidash-layout.css');

function readCSS(): string {
  return readFileSync(CSS_PATH, 'utf-8');
}

describe('Omnidash CSS Contract', () => {
  const css = readCSS();

  it('sidebar width is 260px', () => {
    const sidebarWidthRegex = /\.od-sidebar\s*\{[^}]*\bwidth:\s*(\d+)px/;
    const match = sidebarWidthRegex.exec(css);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(260);
  });

  it('shell uses display: flex (no CSS grid)', () => {
    const shellBlockRegex = /\.omnidash-shell\s*\{([^}]*)\}/;
    const shellBlock = shellBlockRegex.exec(css);
    expect(shellBlock).not.toBeNull();
    expect(shellBlock![1]).toContain('display: flex');
    expect(shellBlock![1]).not.toContain('display: grid');
  });

  it('no .od-right class exists in CSS', () => {
    const odRightRegex = /\.od-right\s*\{/;
    const match = odRightRegex.exec(css);
    expect(match).toBeNull();
  });

  it('APEX canvas architecture comment declares ZERO display:grid', () => {
    expect(css).toContain('ZERO display:grid');
  });

  it('responsive collapse at 768px hides sidebar', () => {
    const mediaBlockRegex = /@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)(?=\n@media|\n\/\*|$)/;
    const mediaBlock768 = mediaBlockRegex.exec(css);
    expect(mediaBlock768).not.toBeNull();
    expect(mediaBlock768![1]).toContain('.od-sidebar');
    expect(mediaBlock768![1]).toContain('display: none');
  });

  it('responsive at 768px switches app tiles to 2-across', () => {
    const mediaRegex = /@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\}/g;
    const mediaBlocks: string[] = [];
    for (let match = mediaRegex.exec(css); match !== null; match = mediaRegex.exec(css)) {
      mediaBlocks.push(match[1]);
    }
    const combined = mediaBlocks.join('\n');
    expect(combined).toContain('.apex-app-tile');
    expect(combined).toContain('calc(50% - 7px)');
  });

  it('hero row uses flexbox with 20px gaps', () => {
    const heroBlockRegex = /\.apex-hero-row\s*\{([^}]*)\}/;
    const heroBlock = heroBlockRegex.exec(css);
    expect(heroBlock).not.toBeNull();
    expect(heroBlock![1]).toContain('display: flex');
    expect(heroBlock![1]).toContain('gap: 20px');
  });

  it('app tiles row uses 14px gaps', () => {
    const appsRowRegex = /\.apex-apps-row\s*\{([^}]*)\}/;
    const appsRowBlock = appsRowRegex.exec(css);
    expect(appsRowBlock).not.toBeNull();
    expect(appsRowBlock![1]).toContain('gap: 14px');
  });

  it('no display:grid found in any dashboard layout class', () => {
    const rules = css.replaceAll(/\/\*[\s\S]*?\*\//g, '');
    const gridRegex = /\.(od-|omnidash-|apex-)[^{]*\{[^}]*display:\s*grid/g;
    const gridMatch = gridRegex.exec(rules);
    expect(gridMatch).toBeNull();
  });
});
