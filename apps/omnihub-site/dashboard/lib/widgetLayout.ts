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

interface Rect {
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
