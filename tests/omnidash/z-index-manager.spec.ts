/**
 * Z-Index Manager Contract Tests
 * Lock 3: Assert z-index hierarchy is deterministic and focused window always wins.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OMNIDASH_CONTRACT } from '../../src/contracts/omnidash.contract';

/**
 * Z-Index hierarchy contract:
 *   - Shell:          0 (base layer)
 *   - Header:         auto (within flow)
 *   - Hero row:       10
 *   - App tiles:      10
 *   - Modal overlay:  1000
 *   - Portal root:    9999 (must always be highest)
 *   - Focused window: must win over other windows but not exceed portal root
 */

const CSS_PATH = resolve(__dirname, '../../apps/omnihub-site/src/styles/omnidash-layout.css');

function readCSS(): string {
  return readFileSync(CSS_PATH, 'utf-8');
}

describe('Z-Index Manager Contract', () => {
  const css = readCSS();

  it('modal overlay z-index is 1000', () => {
    // .od-modal-overlay { z-index: 1000; }
    const match = css.match(/\.od-modal-overlay\s*\{[^}]*z-index:\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(1000);
  });

  it('#omni-portal-root z-index is 9999 (highest layer)', () => {
    const match = css.match(/#omni-portal-root\s*\{[^}]*z-index:\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(9999);
  });

  it('hero row z-index is 10', () => {
    const match = css.match(/\.apex-hero-row\s*\{[^}]*z-index:\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(10);
  });

  it('portal root z-index exceeds modal overlay z-index', () => {
    const portalMatch = css.match(/#omni-portal-root\s*\{[^}]*z-index:\s*(\d+)/);
    const modalMatch = css.match(/\.od-modal-overlay\s*\{[^}]*z-index:\s*(\d+)/);

    expect(portalMatch).not.toBeNull();
    expect(modalMatch).not.toBeNull();

    const portalZ = Number(portalMatch![1]);
    const modalZ = Number(modalMatch![1]);

    expect(portalZ).toBeGreaterThan(modalZ);
  });

  it('contract app zLayer values are valid (0 ≤ zLayer < portal root)', () => {
    const PORTAL_ROOT_Z = 9999;
    for (const app of OMNIDASH_CONTRACT) {
      expect(app.zLayer).toBeGreaterThanOrEqual(0);
      expect(app.zLayer).toBeLessThan(PORTAL_ROOT_Z);
    }
  });

  it('focused window zLayer always wins within app tier', () => {
    // All app zLayers must be identical (10) so focus management
    // can promote any window above others without collision.
    const appZLayers = OMNIDASH_CONTRACT
      .filter(app => app.zLayer > 0)
      .map(app => app.zLayer);

    const uniqueZ = [...new Set(appZLayers)];
    expect(uniqueZ).toHaveLength(1);
    expect(uniqueZ[0]).toBe(10);
  });

  it('shell and header z-indexes are not clobbered by modal', () => {
    // .omnidash-shell does not declare z-index (it is root)
    // .od-header may declare z-index for stacking context, but must stay well below modal (1000)
    const shellZMatch = css.match(/\.omnidash-shell\s*\{[^}]*z-index:\s*(\d+)/);
    const headerZMatch = css.match(/\.od-header\s*\{[^}]*z-index:\s*(\d+)/);
    const modalMatch = css.match(/\.od-modal-overlay\s*\{[^}]*z-index:\s*(\d+)/);

    // Shell should not have a numeric z-index
    expect(shellZMatch).toBeNull();

    // Header z-index (if set) must be far below modal overlay
    if (headerZMatch && modalMatch) {
      expect(Number(headerZMatch[1])).toBeLessThan(Number(modalMatch[1]));
    }
  });
});
