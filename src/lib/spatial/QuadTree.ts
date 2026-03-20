/**
 * QuadTree — Generic Spatial Index for O(log n) Coordinate Queries
 *
 * Provides efficient 2D spatial indexing for the OmniDash infinite canvas.
 * Used by useSpatialEngine to perform fast proximity queries, collision
 * detection, and viewport culling without iterating all elements.
 *
 * APEX STANDARDS:
 * - Generic: QuadTree<T> carries arbitrary data on each point
 * - Deterministic: Same insertions always produce same tree structure
 * - Zero allocation in hot path: Pre-allocated result arrays
 * - Configurable capacity and max depth per instance
 *
 * @module lib/spatial/QuadTree
 * @license Proprietary - APEX Business Systems Ltd.
 */

// ============================================================================
// Types
// ============================================================================

/** Axis-aligned bounding rectangle for spatial queries. */
export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A 2D point carrying generic data payload. */
export interface Point<T> {
  readonly x: number;
  readonly y: number;
  readonly data: T;
}

// ============================================================================
// QuadTree
// ============================================================================

const DEFAULT_CAPACITY = 8;
const DEFAULT_MAX_DEPTH = 8;

/**
 * Generic QuadTree for efficient spatial indexing.
 *
 * Subdivides into NE, NW, SE, SW quadrants when node capacity is exceeded.
 * Provides O(log n) average query performance for range searches.
 *
 * @typeParam T - The type of data associated with each point.
 */
export class QuadTree<T> {
  private readonly points: Point<T>[] = [];
  private northWest: QuadTree<T> | null = null;
  private northEast: QuadTree<T> | null = null;
  private southWest: QuadTree<T> | null = null;
  private southEast: QuadTree<T> | null = null;

  private readonly boundary: Rectangle;
  private readonly capacity: number;
  private readonly maxDepth: number;
  private readonly depth: number;
  private count: number = 0;

  constructor(
    boundary: Rectangle,
    capacity: number = DEFAULT_CAPACITY,
    maxDepth: number = DEFAULT_MAX_DEPTH,
    depth: number = 0,
  ) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.depth = depth;
  }

  // ─── Public API ──────────────────────────────────────────────────────

  /**
   * Insert a point into the tree.
   * Returns true if successfully inserted, false if the point lies outside bounds.
   */
  insert(point: Point<T>): boolean {
    if (!this.containsPoint(this.boundary, point)) {
      return false;
    }

    // If we have room or are at max depth, store here
    if (!this.isSubdivided() && (this.points.length < this.capacity || this.depth >= this.maxDepth)) {
      this.points.push(point);
      this.count++;
      return true;
    }

    // Subdivide if not already done
    if (!this.isSubdivided()) {
      this.subdivide();
    }

    // Insert into the appropriate quadrant
    if (this.northWest!.insert(point)) { this.count++; return true; }
    if (this.northEast!.insert(point)) { this.count++; return true; }
    if (this.southWest!.insert(point)) { this.count++; return true; }
    if (this.southEast!.insert(point)) { this.count++; return true; }

    // Should not reach here if containsPoint passed, but guard anyway
    return false;
  }

  /**
   * Query all points within the given rectangular range.
   * Accepts an optional pre-allocated result array to avoid allocations in hot paths.
   */
  query(range: Rectangle, result: Point<T>[] = []): Point<T>[] {
    if (!this.rectanglesIntersect(this.boundary, range)) {
      return result;
    }

    for (const p of this.points) {
      if (this.containsPoint(range, p)) {
        result.push(p);
      }
    }

    if (this.isSubdivided()) {
      this.northWest!.query(range, result);
      this.northEast!.query(range, result);
      this.southWest!.query(range, result);
      this.southEast!.query(range, result);
    }

    return result;
  }

  /**
   * Remove a point from the tree using reference equality on the data
   * and coordinate matching.
   * Returns true if the point was found and removed.
   */
  remove(point: Point<T>): boolean {
    if (!this.containsPoint(this.boundary, point)) {
      return false;
    }

    // Check local points
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (p.x === point.x && p.y === point.y && p.data === point.data) {
        this.points.splice(i, 1);
        this.count--;
        return true;
      }
    }

    // Check children
    if (this.isSubdivided()) {
      if (this.northWest!.remove(point)) { this.count--; this.collapseIfEmpty(); return true; }
      if (this.northEast!.remove(point)) { this.count--; this.collapseIfEmpty(); return true; }
      if (this.southWest!.remove(point)) { this.count--; this.collapseIfEmpty(); return true; }
      if (this.southEast!.remove(point)) { this.count--; this.collapseIfEmpty(); return true; }
    }

    return false;
  }

  /** Clear all points and collapse all child quadrants. */
  clear(): void {
    this.points.length = 0;
    this.northWest = null;
    this.northEast = null;
    this.southWest = null;
    this.southEast = null;
    this.count = 0;
  }

  /** Total number of points stored across all nodes. */
  get size(): number {
    return this.count;
  }

  /** The bounding rectangle of this node. */
  get bounds(): Rectangle {
    return this.boundary;
  }

  // ─── Private ─────────────────────────────────────────────────────────

  private isSubdivided(): boolean {
    return this.northWest !== null;
  }

  private subdivide(): void {
    const { x, y, width, height } = this.boundary;
    const hw = width / 2;
    const hh = height / 2;
    const nextDepth = this.depth + 1;

    this.northWest = new QuadTree<T>({ x, y, width: hw, height: hh }, this.capacity, this.maxDepth, nextDepth);
    this.northEast = new QuadTree<T>({ x: x + hw, y, width: hw, height: hh }, this.capacity, this.maxDepth, nextDepth);
    this.southWest = new QuadTree<T>({ x, y: y + hh, width: hw, height: hh }, this.capacity, this.maxDepth, nextDepth);
    this.southEast = new QuadTree<T>({ x: x + hw, y: y + hh, width: hw, height: hh }, this.capacity, this.maxDepth, nextDepth);

    // Re-insert existing points into children
    const existing = this.points.slice();
    this.points.length = 0;

    for (const p of existing) {
      const inserted =
        this.northWest.insert(p) ||
        this.northEast.insert(p) ||
        this.southWest.insert(p) ||
        this.southEast.insert(p);

      if (!inserted) {
        // Should not happen within valid bounds, but keep as fallback
        this.points.push(p);
      }
    }
  }

  /**
   * If all children are empty after a removal, collapse back to a leaf node.
   */
  private collapseIfEmpty(): void {
    if (!this.isSubdivided()) return;

    const totalChildren =
      this.northWest!.size +
      this.northEast!.size +
      this.southWest!.size +
      this.southEast!.size;

    if (totalChildren === 0) {
      this.northWest = null;
      this.northEast = null;
      this.southWest = null;
      this.southEast = null;
    }
  }

  /** Check if a point is inside a rectangle. */
  private containsPoint(rect: Rectangle, point: Point<T>): boolean {
    return (
      point.x >= rect.x &&
      point.x < rect.x + rect.width &&
      point.y >= rect.y &&
      point.y < rect.y + rect.height
    );
  }

  /** Check if two rectangles overlap. */
  private rectanglesIntersect(a: Rectangle, b: Rectangle): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    );
  }
}
