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
    // .od-sidebar { width: 260px; }
    const match = css.match(/\.od-sidebar\s*\{[^}]*\bwidth:\s*(\d+)px/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(260);
  });

  it('shell uses display: flex (no CSS grid)', () => {
    // .omnidash-shell { display: flex; }
    const shellBlock = css.match(/\.omnidash-shell\s*\{([^}]*)\}/);
    expect(shellBlock).not.toBeNull();
    expect(shellBlock![1]).toContain('display: flex');
    expect(shellBlock![1]).not.toContain('display: grid');
  });

  it('no .od-right class exists in CSS', () => {
    // .od-right was removed — must not reappear
    const match = css.match(/\.od-right\s*\{/);
    expect(match).toBeNull();
  });

  it('APEX canvas architecture comment declares ZERO display:grid', () => {
    expect(css).toContain('ZERO display:grid');
  });

  it('responsive collapse at 960px hides sidebar', () => {
    // @media (max-width: 960px) { .od-sidebar { display: none; } }
    const mediaBlock960 = css.match(/@media\s*\(max-width:\s*960px\)\s*\{([\s\S]*?)\n\}/);
    expect(mediaBlock960).not.toBeNull();
    expect(mediaBlock960![1]).toContain('.od-sidebar');
    expect(mediaBlock960![1]).toContain('display: none');
  });

  it('responsive at 768px switches app tiles to 2-across', () => {
    // @media (max-width: 768px) { .apex-app-tile { width: calc(50% - 8px); } }
    const mediaBlock768 = css.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\}/);
    expect(mediaBlock768).not.toBeNull();
    expect(mediaBlock768![1]).toContain('.apex-app-tile');
    expect(mediaBlock768![1]).toContain('calc(50% - 8px)');
  });

  it('hero row uses flexbox with 24px gaps', () => {
    const heroBlock = css.match(/\.apex-hero-row\s*\{([^}]*)\}/);
    expect(heroBlock).not.toBeNull();
    expect(heroBlock![1]).toContain('display: flex');
    expect(heroBlock![1]).toContain('gap: 24px');
  });

  it('app tiles row uses 16px gaps', () => {
    const appsRowBlock = css.match(/\.apex-apps-row\s*\{([^}]*)\}/);
    expect(appsRowBlock).not.toBeNull();
    expect(appsRowBlock![1]).toContain('gap: 16px');
  });

  it('no display:grid found in any dashboard layout class', () => {
    // Architecture contract: no grid anywhere in dashboard layout
    // Exclude comments and check only CSS rules
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, ''); // Strip comments
    const gridMatches = rules.match(/\.(od-|omnidash-|apex-)[^{]*\{[^}]*display:\s*grid/g);
    expect(gridMatches).toBeNull();
  });
});
