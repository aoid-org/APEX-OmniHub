/**
 * omniDashStore — Battery Stress Tests
 *
 * Tests the Zustand spatial state store under normal, edge, and stress conditions.
 * Verifies layout persistence, z-index management, PiP windows, and idempotency.
 *
 * APEX STANDARDS: Every test is deterministic and isolated.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useOmniDashStore, WIDGET_IDS } from '../../apps/omnihub-site/src/stores/omniDashStore';
import { CANVAS_Z_BASE, PIP_Z_FLOOR } from '../../apps/omnihub-site/src/lib/ZIndexManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('omniDashStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.clear();
    useOmniDashStore.getState().resetLayouts();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════

  describe('initial state', () => {
    it('has all canonical widget IDs in layouts', () => {
      const { layouts } = useOmniDashStore.getState();
      for (const widgetId of Object.values(WIDGET_IDS)) {
        expect(layouts[widgetId]).toBeDefined();
      }
    });

    it('all layouts have required properties', () => {
      const { layouts } = useOmniDashStore.getState();
      for (const layout of Object.values(layouts)) {
        expect(typeof layout.x).toBe('number');
        expect(typeof layout.y).toBe('number');
        expect(typeof layout.w).toBe('number');
        expect(typeof layout.h).toBe('number');
        expect(typeof layout.z).toBe('number');
      }
    });

    it('starts with empty pipWindows', () => {
      const { pipWindows } = useOmniDashStore.getState();
      expect(pipWindows).toEqual([]);
    });

    it('all z-values start at or above CANVAS_Z_BASE', () => {
      const { layouts } = useOmniDashStore.getState();
      for (const layout of Object.values(layouts)) {
        expect(layout.z).toBeGreaterThanOrEqual(CANVAS_Z_BASE);
      }
    });
  });

  // ═══════════════════════════════════════════════════
  // bringToFront
  // ═══════════════════════════════════════════════════

  describe('bringToFront', () => {
    it('elevates a widget z-index above all others', () => {
      const store = useOmniDashStore.getState();
      const allZ = Object.values(store.layouts).map(l => l.z);
      const maxBefore = Math.max(...allZ);

      store.bringToFront(WIDGET_IDS.HERO);

      const { layouts } = useOmniDashStore.getState();
      expect(layouts[WIDGET_IDS.HERO].z).toBeGreaterThanOrEqual(maxBefore);
    });

    it('is a no-op for unknown widget IDs', () => {
      const before = { ...useOmniDashStore.getState().layouts };
      useOmniDashStore.getState().bringToFront('nonexistent-widget');
      const after = useOmniDashStore.getState().layouts;
      expect(after).toEqual(before);
    });

    it('stress: 100 rapid bringToFront calls do not crash or exceed PiP floor', () => {
      for (let i = 0; i < 100; i++) {
        const widgetIds = Object.values(WIDGET_IDS);
        const widgetId = widgetIds[i % widgetIds.length];
        useOmniDashStore.getState().bringToFront(widgetId);
      }

      const { layouts } = useOmniDashStore.getState();
      for (const layout of Object.values(layouts)) {
        expect(layout.z).toBeLessThan(PIP_Z_FLOOR);
      }
    });
  });

  // ═══════════════════════════════════════════════════
  // updatePosition
  // ═══════════════════════════════════════════════════

  describe('updatePosition', () => {
    it('updates widget position', () => {
      useOmniDashStore.getState().updatePosition(WIDGET_IDS.HERO, 200, 300);
      const { layouts } = useOmniDashStore.getState();
      expect(layouts[WIDGET_IDS.HERO].x).toBe(200);
      expect(layouts[WIDGET_IDS.HERO].y).toBe(300);
    });

    it('preserves other layout properties on position update', () => {
      const wBefore = useOmniDashStore.getState().layouts[WIDGET_IDS.HERO].w;
      const hBefore = useOmniDashStore.getState().layouts[WIDGET_IDS.HERO].h;

      useOmniDashStore.getState().updatePosition(WIDGET_IDS.HERO, 500, 600);

      const { layouts } = useOmniDashStore.getState();
      expect(layouts[WIDGET_IDS.HERO].w).toBe(wBefore);
      expect(layouts[WIDGET_IDS.HERO].h).toBe(hBefore);
    });

    it('is a no-op for unknown widget', () => {
      const before = { ...useOmniDashStore.getState().layouts };
      useOmniDashStore.getState().updatePosition('unknown', 100, 100);
      expect(useOmniDashStore.getState().layouts).toEqual(before);
    });

    it('triggers debounced persistence', () => {
      useOmniDashStore.getState().updatePosition(WIDGET_IDS.HERO, 100, 200);
      vi.advanceTimersByTime(600);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════
  // updateSize
  // ═══════════════════════════════════════════════════

  describe('updateSize', () => {
    it('updates widget dimensions', () => {
      useOmniDashStore.getState().updateSize(WIDGET_IDS.HERO, 800, 400);
      const { layouts } = useOmniDashStore.getState();
      expect(layouts[WIDGET_IDS.HERO].w).toBe(800);
      expect(layouts[WIDGET_IDS.HERO].h).toBe(400);
    });

    it('enforces minimum dimensions (200x120)', () => {
      useOmniDashStore.getState().updateSize(WIDGET_IDS.HERO, 50, 30);
      const { layouts } = useOmniDashStore.getState();
      expect(layouts[WIDGET_IDS.HERO].w).toBe(200); // clamped
      expect(layouts[WIDGET_IDS.HERO].h).toBe(120); // clamped
    });
  });

  // ═══════════════════════════════════════════════════
  // PiP Windows
  // ═══════════════════════════════════════════════════

  describe('PiP windows', () => {
    it('opens a PiP window', () => {
      useOmniDashStore.getState().openPiP('pipeline', 'Pipeline View');
      const { pipWindows } = useOmniDashStore.getState();
      expect(pipWindows).toHaveLength(1);
      expect(pipWindows[0].type).toBe('pipeline');
      expect(pipWindows[0].title).toBe('Pipeline View');
    });

    it('prevents duplicate PiP windows of same type (idempotent)', () => {
      useOmniDashStore.getState().openPiP('pipeline', 'Pipeline View');
      useOmniDashStore.getState().openPiP('pipeline', 'Pipeline View 2');
      const { pipWindows } = useOmniDashStore.getState();
      expect(pipWindows).toHaveLength(1);
    });

    it('allows different PiP types', () => {
      useOmniDashStore.getState().openPiP('pipeline', 'Pipeline');
      useOmniDashStore.getState().openPiP('settings', 'Settings');
      const { pipWindows } = useOmniDashStore.getState();
      expect(pipWindows).toHaveLength(2);
    });

    it('PiP z-index starts at PIP_Z_FLOOR', () => {
      useOmniDashStore.getState().openPiP('test', 'Test');
      const { pipWindows } = useOmniDashStore.getState();
      expect(pipWindows[0].z).toBeGreaterThanOrEqual(PIP_Z_FLOOR);
    });

    it('closes a PiP window by ID', () => {
      useOmniDashStore.getState().openPiP('pipeline', 'Pipeline');
      const { pipWindows } = useOmniDashStore.getState();
      const pipId = pipWindows[0].id;

      useOmniDashStore.getState().closePiP(pipId);
      expect(useOmniDashStore.getState().pipWindows).toHaveLength(0);
    });

    it('closing non-existent PiP is a no-op', () => {
      useOmniDashStore.getState().openPiP('test', 'Test');
      useOmniDashStore.getState().closePiP('nonexistent-id');
      expect(useOmniDashStore.getState().pipWindows).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════
  // resetLayouts
  // ═══════════════════════════════════════════════════

  describe('resetLayouts', () => {
    it('restores all layouts to defaults', () => {
      // Modify state
      useOmniDashStore.getState().updatePosition(WIDGET_IDS.HERO, 999, 999);
      useOmniDashStore.getState().openPiP('test', 'Test');

      // Reset
      useOmniDashStore.getState().resetLayouts();

      const { layouts, pipWindows } = useOmniDashStore.getState();
      expect(layouts[WIDGET_IDS.HERO].x).toBe(0);
      expect(layouts[WIDGET_IDS.HERO].y).toBe(0);
      expect(pipWindows).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════
  // Stress: Concurrent operations
  // ═══════════════════════════════════════════════════

  describe('stress: concurrent operations', () => {
    it('handles 200 interleaved position/z updates without data corruption', () => {
      const widgetIds = Object.values(WIDGET_IDS);

      for (let i = 0; i < 200; i++) {
        const wid = widgetIds[i % widgetIds.length];
        if (i % 3 === 0) {
          useOmniDashStore.getState().bringToFront(wid);
        } else if (i % 3 === 1) {
          useOmniDashStore.getState().updatePosition(wid, i * 2, i * 3);
        } else {
          useOmniDashStore.getState().updateSize(wid, 200 + i, 150 + i);
        }
      }

      // Verify no data corruption
      const { layouts } = useOmniDashStore.getState();
      for (const layout of Object.values(layouts)) {
        expect(Number.isFinite(layout.x)).toBe(true);
        expect(Number.isFinite(layout.y)).toBe(true);
        expect(Number.isFinite(layout.w)).toBe(true);
        expect(Number.isFinite(layout.h)).toBe(true);
        expect(Number.isFinite(layout.z)).toBe(true);
        expect(layout.w).toBeGreaterThanOrEqual(200);
        expect(layout.h).toBeGreaterThanOrEqual(120);
      }
    });

    it('handles 50 rapid PiP open/close cycles without leaks', () => {
      for (let i = 0; i < 50; i++) {
        useOmniDashStore.getState().openPiP(`type-${String(i)}`, `Window ${String(i)}`);
      }
      expect(useOmniDashStore.getState().pipWindows).toHaveLength(50);

      // Close all
      const windows = useOmniDashStore.getState().pipWindows;
      for (const w of windows) {
        useOmniDashStore.getState().closePiP(w.id);
      }
      expect(useOmniDashStore.getState().pipWindows).toHaveLength(0);
    });
  });
});

