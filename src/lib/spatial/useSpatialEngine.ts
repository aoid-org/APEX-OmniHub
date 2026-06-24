/**
 * useSpatialEngine — React Hook for Zero-Render-Cycle Spatial Movement
 *
 * Binds QuadTree spatial indexing to useRef for coordinate tracking,
 * executing transform: matrix3d() directly on DOM nodes via
 * requestAnimationFrame. Completely bypasses React reconciliation
 * for drag/pan operations.
 *
 * APEX STANDARDS:
 * - Zero main-thread blocks: All updates via rAF
 * - Zero React re-renders: Coordinates stored in useRef, not useState
 * - Deterministic: Same input deltas produce same spatial output
 * - GPU-accelerated: Uses matrix3d for compositor-only transforms
 *
 * @module lib/spatial/useSpatialEngine
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { useRef, useCallback, useEffect } from 'react';
import { QuadTree, type Point, type Rectangle } from './QuadTree';

export type Bounds = Rectangle;
export interface SpatialEntityData {
  readonly id: string;
}
export type SpatialEntity = Point<SpatialEntityData>;

// ============================================================================
// Types
// ============================================================================

export interface SpatialTransform {
  /** Translation X */
  tx: number;
  /** Translation Y */
  ty: number;
  /** Scale (zoom level) */
  scale: number;
}

export interface SpatialEngineOptions {
  /** Canvas world bounds. Default: 10000x10000 centered at origin */
  worldBounds?: Bounds;
  /** Minimum zoom level. Default: 0.1 */
  minScale?: number;
  /** Maximum zoom level. Default: 5.0 */
  maxScale?: number;
  /** Zoom sensitivity for wheel events. Default: 0.001 */
  zoomSensitivity?: number;
}

export interface SpatialEngineAPI {
  /** Current transform (read-only ref — do not mutate directly) */
  transformRef: React.RefObject<SpatialTransform>;
  /** The QuadTree for spatial queries */
  quadTree: React.RefObject<QuadTree<SpatialEntityData>>;
  /** Apply a translation delta (pan) */
  pan: (dx: number, dy: number) => void;
  /** Apply zoom centered at a viewport point */
  zoom: (delta: number, centerX: number, centerY: number) => void;
  /** Set absolute transform */
  setTransform: (transform: Partial<SpatialTransform>) => void;
  /** Convert viewport coordinates to world coordinates */
  viewportToWorld: (vx: number, vy: number) => { x: number; y: number };
  /** Convert world coordinates to viewport coordinates */
  worldToViewport: (wx: number, wy: number) => { x: number; y: number };
  /** Query visible entities in current viewport */
  queryViewport: (viewportWidth: number, viewportHeight: number) => SpatialEntity[];
  /** Apply current transform to a DOM element (call in rAF) */
  applyToElement: (element: HTMLElement) => void;
  /** Register an entity in the spatial index */
  registerEntity: (entity: SpatialEntity) => void;
  /** Remove an entity from the spatial index */
  removeEntity: (id: string) => void;
}

// ============================================================================
// Hook
// ============================================================================

const DEFAULT_WORLD_BOUNDS: Bounds = {
  x: -5000,
  y: -5000,
  width: 10000,
  height: 10000,
};

/**
 * Generates a CSS matrix3d string from a 2D transform.
 * Uses matrix3d instead of matrix() to force GPU compositing.
 */
function toMatrix3d(t: SpatialTransform): string {
  // matrix3d columns: [scaleX, 0, 0, 0, 0, scaleY, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1]
  return `matrix3d(${t.scale},0,0,0,0,${t.scale},0,0,0,0,1,0,${t.tx},${t.ty},0,1)`;
}

export function useSpatialEngine(options: SpatialEngineOptions = {}): SpatialEngineAPI {
  const {
    worldBounds = DEFAULT_WORLD_BOUNDS,
    minScale = 0.1,
    maxScale = 5,
    zoomSensitivity = 1e-3,
  } = options;

  const transformRef = useRef<SpatialTransform>({ tx: 0, ty: 0, scale: 1 });
  const quadTreeRef = useRef<QuadTree<SpatialEntityData>>(new QuadTree<SpatialEntityData>(worldBounds));
  const entityPointRef = useRef<Map<string, SpatialEntity>>(new Map());
  const rafIdRef = useRef<number>(0);
  const dirtyRef = useRef(false);
  const targetElementRef = useRef<HTMLElement | null>(null);

  // Schedule a rAF update (coalesces multiple calls per frame)
  const scheduleUpdate = useCallback(() => {
    if (dirtyRef.current) return; // Already scheduled
    dirtyRef.current = true;

    rafIdRef.current = requestAnimationFrame(() => {
      dirtyRef.current = false;
      if (targetElementRef.current) {
        const matrix = toMatrix3d(transformRef.current);
        targetElementRef.current.style.transform = matrix;
        targetElementRef.current.style.willChange = 'transform';
      }
    });
  }, []);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const pan = useCallback((dx: number, dy: number) => {
    const t = transformRef.current;
    t.tx += dx;
    t.ty += dy;
    scheduleUpdate();
  }, [scheduleUpdate]);

  const zoom = useCallback((delta: number, centerX: number, centerY: number) => {
    const t = transformRef.current;
    const factor = 1 - delta * zoomSensitivity;
    const newScale = Math.min(maxScale, Math.max(minScale, t.scale * factor));

    // Zoom toward cursor position
    const scaleRatio = newScale / t.scale;
    t.tx = centerX - (centerX - t.tx) * scaleRatio;
    t.ty = centerY - (centerY - t.ty) * scaleRatio;
    t.scale = newScale;

    scheduleUpdate();
  }, [zoomSensitivity, minScale, maxScale, scheduleUpdate]);

  const setTransform = useCallback((partial: Partial<SpatialTransform>) => {
    Object.assign(transformRef.current, partial);
    scheduleUpdate();
  }, [scheduleUpdate]);

  const viewportToWorld = useCallback((vx: number, vy: number) => {
    const t = transformRef.current;
    return {
      x: (vx - t.tx) / t.scale,
      y: (vy - t.ty) / t.scale,
    };
  }, []);

  const worldToViewport = useCallback((wx: number, wy: number) => {
    const t = transformRef.current;
    return {
      x: wx * t.scale + t.tx,
      y: wy * t.scale + t.ty,
    };
  }, []);

  const queryViewport = useCallback((viewportWidth: number, viewportHeight: number) => {
    const t = transformRef.current;
    const worldBounds: Bounds = {
      x: -t.tx / t.scale,
      y: -t.ty / t.scale,
      width: viewportWidth / t.scale,
      height: viewportHeight / t.scale,
    };
    return quadTreeRef.current.query(worldBounds);
  }, []);

  const applyToElement = useCallback((element: HTMLElement) => {
    targetElementRef.current = element;
    const matrix = toMatrix3d(transformRef.current);
    element.style.transform = matrix;
    element.style.willChange = 'transform';
    element.style.transformOrigin = '0 0';
  }, []);

  const registerEntity = useCallback((entity: SpatialEntity) => {
    const existing = entityPointRef.current.get(entity.data.id);
    if (existing) {
      quadTreeRef.current.remove(existing);
      entityPointRef.current.delete(entity.data.id);
    }

    if (quadTreeRef.current.insert(entity)) {
      entityPointRef.current.set(entity.data.id, entity);
    }
  }, []);

  const removeEntity = useCallback((id: string) => {
    const point = entityPointRef.current.get(id);
    if (!point) return;

    quadTreeRef.current.remove(point);
    entityPointRef.current.delete(id);
  }, []);

  return {
    transformRef,
    quadTree: quadTreeRef,
    pan,
    zoom,
    setTransform,
    viewportToWorld,
    worldToViewport,
    queryViewport,
    applyToElement,
    registerEntity,
    removeEntity,
  };
}
