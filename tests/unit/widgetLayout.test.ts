import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveLayout,
  loadLayout,
  clearLayout,
  migrateFromLegacy,
  rectsOverlap,
  clampToCanvas,
  resolveCollisions,
  resolveAlignment,
  ALIGN_THRESHOLD_PX,
  SNAP_GRID,
} from '../../apps/omnihub-site/dashboard/lib/widgetLayout';

describe('widgetLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveLayout / loadLayout', () => {
    it('round-trips widget positions', () => {
      const positions = { widget_agent: { x: 100, y: 200 }, widget_eco: { x: 50, y: 50 } };
      saveLayout('user1', 'desktop', positions);
      const loaded = loadLayout('user1', 'desktop');
      expect(loaded).toEqual(positions);
    });

    it('returns empty map for missing key', () => {
      expect(loadLayout('user1', 'desktop')).toEqual({});
    });

    it('returns empty map for malformed JSON', () => {
      localStorage.setItem('omnidash_layout_v2:user1:desktop', 'not-json');
      expect(loadLayout('user1', 'desktop')).toEqual({});
    });

    it('filters out entries missing x/y numbers', () => {
      localStorage.setItem(
        'omnidash_layout_v2:user1:desktop',
        JSON.stringify({ good: { x: 1, y: 2 }, bad: { foo: 'bar' } }),
      );
      const loaded = loadLayout('user1', 'desktop');
      expect(loaded).toEqual({ good: { x: 1, y: 2 } });
    });

    it('scopes by userId and breakpoint', () => {
      saveLayout('user1', 'desktop', { a: { x: 1, y: 1 } });
      saveLayout('user1', 'mobile', { b: { x: 2, y: 2 } });
      saveLayout('user2', 'desktop', { c: { x: 3, y: 3 } });
      expect(loadLayout('user1', 'desktop')).toEqual({ a: { x: 1, y: 1 } });
      expect(loadLayout('user1', 'mobile')).toEqual({ b: { x: 2, y: 2 } });
      expect(loadLayout('user2', 'desktop')).toEqual({ c: { x: 3, y: 3 } });
    });
  });

  describe('clearLayout', () => {
    it('removes the layout key', () => {
      saveLayout('user1', 'desktop', { a: { x: 1, y: 1 } });
      clearLayout('user1', 'desktop');
      expect(loadLayout('user1', 'desktop')).toEqual({});
    });
  });

  describe('migrateFromLegacy', () => {
    it('migrates omni_widget_pos_* keys to consolidated key', () => {
      localStorage.setItem('omni_widget_pos_widget_agent', JSON.stringify({ x: 100, y: 200 }));
      localStorage.setItem('omni_widget_pos_widget_eco', JSON.stringify({ x: 50, y: 50 }));
      migrateFromLegacy('user1', 'desktop');
      expect(loadLayout('user1', 'desktop')).toEqual({
        widget_agent: { x: 100, y: 200 },
        widget_eco: { x: 50, y: 50 },
      });
      expect(localStorage.getItem('omni_widget_pos_widget_agent')).toBeNull();
      expect(localStorage.getItem('omni_widget_pos_widget_eco')).toBeNull();
    });

    it('skips migration if new key already exists', () => {
      saveLayout('user1', 'desktop', { existing: { x: 1, y: 1 } });
      localStorage.setItem('omni_widget_pos_widget_agent', JSON.stringify({ x: 999, y: 999 }));
      migrateFromLegacy('user1', 'desktop');
      expect(loadLayout('user1', 'desktop')).toEqual({ existing: { x: 1, y: 1 } });
    });

    it('skips malformed legacy entries', () => {
      localStorage.setItem('omni_widget_pos_good', JSON.stringify({ x: 10, y: 20 }));
      localStorage.setItem('omni_widget_pos_bad', 'not-json');
      migrateFromLegacy('user1', 'desktop');
      expect(loadLayout('user1', 'desktop')).toEqual({ good: { x: 10, y: 20 } });
    });

    it('is idempotent', () => {
      localStorage.setItem('omni_widget_pos_w', JSON.stringify({ x: 1, y: 2 }));
      migrateFromLegacy('user1', 'desktop');
      migrateFromLegacy('user1', 'desktop');
      expect(loadLayout('user1', 'desktop')).toEqual({ w: { x: 1, y: 2 } });
    });
  });

  describe('rectsOverlap', () => {
    it('detects overlapping rects', () => {
      expect(
        rectsOverlap({ left: 0, top: 0, right: 100, bottom: 100 }, { left: 50, top: 50, right: 150, bottom: 150 }),
      ).toBe(true);
    });

    it('returns false for non-overlapping rects', () => {
      expect(
        rectsOverlap({ left: 0, top: 0, right: 50, bottom: 50 }, { left: 60, top: 60, right: 100, bottom: 100 }),
      ).toBe(false);
    });

    it('returns false for edge-touching rects', () => {
      expect(
        rectsOverlap({ left: 0, top: 0, right: 50, bottom: 50 }, { left: 50, top: 0, right: 100, bottom: 50 }),
      ).toBe(false);
    });
  });

  describe('clampToCanvas', () => {
    it('clamps negative positions to zero', () => {
      expect(clampToCanvas({ x: -10, y: -20 }, 100, 100, 800, 600)).toEqual({ x: 0, y: 0 });
    });

    it('clamps positions exceeding canvas bounds', () => {
      expect(clampToCanvas({ x: 750, y: 550 }, 100, 100, 800, 600)).toEqual({ x: 700, y: 500 });
    });

    it('preserves valid positions', () => {
      expect(clampToCanvas({ x: 200, y: 300 }, 100, 100, 800, 600)).toEqual({ x: 200, y: 300 });
    });
  });

  describe('resolveCollisions', () => {
    it('returns snapped position when no collision', () => {
      const result = resolveCollisions({ left: 0, top: 0, width: 100, height: 100 }, []);
      expect(result).toEqual({ left: 0, top: 0 });
    });

    it('snaps to grid', () => {
      const result = resolveCollisions({ left: 7, top: 13, width: 100, height: 100 }, []);
      expect(result.left % SNAP_GRID).toBe(0);
      expect(result.top % SNAP_GRID).toBe(0);
    });

    it('finds alternative position on collision', () => {
      const siblings = [{ left: 0, top: 0, right: 100, bottom: 100 }];
      const result = resolveCollisions({ left: 10, top: 10, width: 80, height: 80 }, siblings);
      const resultRect = {
        left: result.left,
        top: result.top,
        right: result.left + 80,
        bottom: result.top + 80,
      };
      expect(rectsOverlap(resultRect, siblings[0])).toBe(false);
    });
  });

  describe('resolveAlignment', () => {
    it('exports a 10px threshold', () => {
      expect(ALIGN_THRESHOLD_PX).toBe(10);
    });

    it('returns proposed unchanged when no siblings are in range', () => {
      const proposed = { left: 100, top: 100, width: 50, height: 50 };
      const siblings = [{ left: 400, top: 400, right: 450, bottom: 450 }];
      expect(resolveAlignment(proposed, siblings)).toEqual({ left: 100, top: 100 });
    });

    it('returns proposed unchanged with no siblings', () => {
      const proposed = { left: 7, top: 13, width: 50, height: 50 };
      expect(resolveAlignment(proposed, [])).toEqual({ left: 7, top: 13 });
    });

    it('snaps left edge flush to a sibling left within threshold', () => {
      // proposed left=104 is 4px from sibling left=100 → snaps to 100.
      const proposed = { left: 104, top: 500, width: 50, height: 50 };
      const siblings = [{ left: 100, top: 0, right: 200, bottom: 80 }];
      expect(resolveAlignment(proposed, siblings).left).toBe(100);
    });

    it('snaps right edge flush to a sibling left within threshold', () => {
      // proposed right = 150 + 50 = 200, sibling left = 205 (5px) → left shifts +5 to 155.
      const proposed = { left: 150, top: 500, width: 50, height: 50 };
      const siblings = [{ left: 205, top: 0, right: 305, bottom: 80 }];
      expect(resolveAlignment(proposed, siblings).left).toBe(155);
    });

    it('does not snap when just outside the threshold', () => {
      // 11px gap > 10px threshold → unchanged.
      const proposed = { left: 111, top: 500, width: 50, height: 50 };
      const siblings = [{ left: 100, top: 0, right: 200, bottom: 80 }];
      expect(resolveAlignment(proposed, siblings).left).toBe(111);
    });

    it('snaps x and y independently', () => {
      // x left (103→100, in range), y top (500, far from sibling top 0 → no snap).
      const proposed = { left: 103, top: 500, width: 50, height: 50 };
      const siblings = [{ left: 100, top: 0, right: 200, bottom: 80 }];
      const result = resolveAlignment(proposed, siblings);
      expect(result.left).toBe(100);
      expect(result.top).toBe(500);
    });

    it('snaps top edge flush to a sibling top within threshold', () => {
      const proposed = { left: 500, top: 96, width: 50, height: 50 };
      const siblings = [{ left: 0, top: 100, right: 80, bottom: 200 }];
      expect(resolveAlignment(proposed, siblings).top).toBe(100);
    });
  });
});
