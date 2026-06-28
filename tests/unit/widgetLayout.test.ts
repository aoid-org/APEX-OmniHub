import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveLayout,
  loadLayout,
  clearLayout,
  migrateFromLegacy,
  rectsOverlap,
  clampToCanvas,
  resolveCollisions,
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
});
