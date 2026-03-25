import { describe, expect, it } from 'vitest';
import { QuadTree, type Point, type Rectangle } from '@/lib/spatial/QuadTree';

const BOUNDS: Rectangle = { x: 0, y: 0, width: 100, height: 100 };

function point<T>(x: number, y: number, data: T): Point<T> {
  return { x, y, data };
}

describe('QuadTree', () => {
  it('rejects out-of-bounds inserts and reuses a provided result array', () => {
    const tree = new QuadTree<string>(BOUNDS, 2, 4);
    const inside = point(10, 10, 'inside');

    expect(tree.insert(inside)).toBe(true);
    expect(tree.insert(point(120, 120, 'outside'))).toBe(false);
    expect(tree.size).toBe(1);
    expect(tree.bounds).toEqual(BOUNDS);

    const seed: Point<string>[] = [];
    const result = tree.query({ x: 0, y: 0, width: 20, height: 20 }, seed);
    expect(result).toBe(seed);
    expect(result).toEqual([inside]);

    const untouched = tree.query({ x: 200, y: 200, width: 10, height: 10 }, seed);
    expect(untouched).toBe(seed);
    expect(untouched).toHaveLength(1);
  });

  it('subdivides, removes nested points, and collapses back to an empty leaf', () => {
    const tree = new QuadTree<string>(BOUNDS, 1, 4);
    const points = [
      point(10, 10, 'nw'),
      point(75, 10, 'ne'),
      point(10, 75, 'sw'),
      point(75, 75, 'se'),
    ];

    points.forEach((entry) => expect(tree.insert(entry)).toBe(true));
    expect(tree.size).toBe(4);

    expect(tree.query({ x: 50, y: 0, width: 50, height: 50 }).map((entry) => entry.data)).toEqual(['ne']);
    expect(tree.remove(point(75, 75, 'missing'))).toBe(false);

    points.forEach((entry) => expect(tree.remove(entry)).toBe(true));
    expect(tree.size).toBe(0);
    expect(tree.query(BOUNDS)).toEqual([]);
  });

  it('stores overflow at max depth and clears cleanly', () => {
    const tree = new QuadTree<string>(BOUNDS, 1, 0);
    const entries = [
      point(5, 5, 'a'),
      point(6, 6, 'b'),
      point(7, 7, 'c'),
    ];

    entries.forEach((entry) => expect(tree.insert(entry)).toBe(true));
    expect(tree.size).toBe(3);
    expect(tree.query({ x: 0, y: 0, width: 10, height: 10 }).map((entry) => entry.data)).toEqual(['a', 'b', 'c']);

    tree.clear();
    expect(tree.size).toBe(0);
    expect(tree.query(BOUNDS)).toEqual([]);
    expect(tree.insert(point(20, 20, 'reinserted'))).toBe(true);
    expect(tree.query({ x: 0, y: 0, width: 30, height: 30 }).map((entry) => entry.data)).toEqual(['reinserted']);
  });
});
