/**
 * widgetLayout — Widget position persistence, collision resolution, and canvas clamping.
 *
 * Extracted from DraggableWidget to be independently testable.
 * Storage key: omnidash_layout_v2:{userId}:{breakpoint} — consolidates all widget
 * positions into a single scoped key instead of per-widget omni_widget_pos_* keys.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetPositionMap {
  [widgetId: string]: WidgetPosition;
}

const STORAGE_PREFIX = 'omnidash_layout_v2';
const LEGACY_KEY_PREFIX = 'omni_widget_pos_';

/** Minimum pointer travel (px) before drag cancels the long-press timer. */
export const DRAG_THRESHOLD_PX = 8;

export const SNAP_GRID = 20;
const MAX_SEARCH_RADIUS = 800;

function storageKey(userId: string, breakpoint: string): string {
  return `${STORAGE_PREFIX}:${userId}:${breakpoint}`;
}

export function detectBreakpoint(): string {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth >= 1024 ? 'desktop' : 'mobile';
}

export function saveLayout(userId: string, breakpoint: string, positions: WidgetPositionMap): void {
  try {
    localStorage.setItem(storageKey(userId, breakpoint), JSON.stringify(positions));
  } catch {
    // quota exceeded or private browsing
  }
}

export function loadLayout(userId: string, breakpoint: string): WidgetPositionMap {
  try {
    const raw = localStorage.getItem(storageKey(userId, breakpoint));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: WidgetPositionMap = {};
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        val !== null &&
        typeof val === 'object' &&
        'x' in val &&
        'y' in val &&
        typeof (val as Record<string, unknown>).x === 'number' &&
        typeof (val as Record<string, unknown>).y === 'number'
      ) {
        result[key] = { x: (val as WidgetPosition).x, y: (val as WidgetPosition).y };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function clearLayout(userId: string, breakpoint: string): void {
  try {
    localStorage.removeItem(storageKey(userId, breakpoint));
  } catch {
    // silent
  }
}

/**
 * Reads all legacy omni_widget_pos_* keys, writes them into the new consolidated
 * key, and removes the old keys. Safe to call multiple times (idempotent).
 */
export function migrateFromLegacy(userId: string, breakpoint: string): void {
  try {
    const existing = loadLayout(userId, breakpoint);
    if (Object.keys(existing).length > 0) return; // already migrated

    const migrated: WidgetPositionMap = {};
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(LEGACY_KEY_PREFIX)) continue;
      keysToRemove.push(key);
      const widgetId = key.slice(LEGACY_KEY_PREFIX.length);
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed: unknown = JSON.parse(raw);
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          'x' in parsed &&
          'y' in parsed &&
          typeof (parsed as Record<string, unknown>).x === 'number' &&
          typeof (parsed as Record<string, unknown>).y === 'number'
        ) {
          migrated[widgetId] = { x: (parsed as WidgetPosition).x, y: (parsed as WidgetPosition).y };
        }
      } catch {
        // skip malformed entries
      }
    }

    if (Object.keys(migrated).length > 0) {
      saveLayout(userId, breakpoint, migrated);
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // silent
  }
}

// ── Collision Resolution ────────────────────────────────────────────────────

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

export function clampToCanvas(
  pos: WidgetPosition,
  widgetWidth: number,
  widgetHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): WidgetPosition {
  return {
    x: Math.max(0, Math.min(pos.x, canvasWidth - widgetWidth)),
    y: Math.max(0, Math.min(pos.y, canvasHeight - widgetHeight)),
  };
}

/**
 * Finds the nearest grid-snapped position for a widget that does not
 * overlap any sibling. Searches outward in square shells from the proposed
 * point. Returns the proposed position snapped to grid if no collision.
 */
export function resolveCollisions(
  proposed: { left: number; top: number; width: number; height: number },
  siblingRects: Rect[],
): { left: number; top: number } {
  const hasCollision = (left: number, top: number): boolean => {
    const r: Rect = { left, top, right: left + proposed.width, bottom: top + proposed.height };
    return siblingRects.some((s) => rectsOverlap(r, s));
  };

  const snapLeft = Math.round(proposed.left / SNAP_GRID) * SNAP_GRID;
  const snapTop = Math.round(proposed.top / SNAP_GRID) * SNAP_GRID;

  if (!hasCollision(snapLeft, snapTop)) {
    return { left: snapLeft, top: snapTop };
  }

  for (let radius = SNAP_GRID; radius <= MAX_SEARCH_RADIUS; radius += SNAP_GRID) {
    for (let dx = -radius; dx <= radius; dx += SNAP_GRID) {
      for (const dy of [-radius, radius]) {
        const l = snapLeft + dx;
        const t = snapTop + dy;
        if (t >= 0 && !hasCollision(l, t)) return { left: l, top: t };
      }
    }
    for (let dy = -radius + SNAP_GRID; dy < radius; dy += SNAP_GRID) {
      for (const dx of [-radius, radius]) {
        const l = snapLeft + dx;
        const t = snapTop + dy;
        if (t >= 0 && !hasCollision(l, t)) return { left: l, top: t };
      }
    }
  }

  return { left: snapLeft, top: snapTop };
}

// ── Magnetic Alignment ──────────────────────────────────────────────────────

export const ALIGN_THRESHOLD_PX = 10;

/**
 * Given a proposed rect and sibling rects, returns a snapped {left, top}
 * if any sibling edge (left/right/top/bottom) or center axis is within
 * ALIGN_THRESHOLD_PX. Returns the original proposed left/top unchanged
 * if nothing is in range. Magnetic, not forced — small threshold only.
 *
 * The x and y axes are resolved independently: an axis snaps only when it has
 * a match in range, otherwise it keeps its proposed value. Pure function — no
 * DOM access — so it is unit-testable in isolation.
 */
export function resolveAlignment(
  proposed: { left: number; top: number; width: number; height: number },
  siblingRects: Rect[],
): { left: number; top: number } {
  const pLeft = proposed.left;
  const pRight = proposed.left + proposed.width;
  const pCenterX = proposed.left + proposed.width / 2;
  const pTop = proposed.top;
  const pBottom = proposed.top + proposed.height;
  const pCenterY = proposed.top + proposed.height / 2;

  // Best deltas (added to left/top) for the closest in-range match per axis.
  let bestDx: number | null = null;
  let bestDxDist = Infinity;
  let bestDy: number | null = null;
  let bestDyDist = Infinity;

  const consider = (
    from: number,
    to: number,
    setter: (delta: number, dist: number) => void,
  ) => {
    const dist = Math.abs(from - to);
    if (dist <= ALIGN_THRESHOLD_PX) setter(to - from, dist);
  };

  for (const s of siblingRects) {
    const sCenterX = (s.left + s.right) / 2;
    const sCenterY = (s.top + s.bottom) / 2;

    // x-axis: proposed left/right/center against sibling left/right/center.
    const xPairs: Array<[number, number]> = [
      [pLeft, s.left], [pLeft, s.right],
      [pRight, s.left], [pRight, s.right],
      [pCenterX, sCenterX],
    ];
    for (const [from, to] of xPairs) {
      consider(from, to, (delta, dist) => {
        if (dist < bestDxDist) { bestDxDist = dist; bestDx = delta; }
      });
    }

    // y-axis: proposed top/bottom/center against sibling top/bottom/center.
    const yPairs: Array<[number, number]> = [
      [pTop, s.top], [pTop, s.bottom],
      [pBottom, s.top], [pBottom, s.bottom],
      [pCenterY, sCenterY],
    ];
    for (const [from, to] of yPairs) {
      consider(from, to, (delta, dist) => {
        if (dist < bestDyDist) { bestDyDist = dist; bestDy = delta; }
      });
    }
  }

  return {
    left: bestDx !== null ? proposed.left + bestDx : proposed.left,
    top: bestDy !== null ? proposed.top + bestDy : proposed.top,
  };
}
