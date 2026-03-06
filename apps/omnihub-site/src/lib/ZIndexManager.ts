/**
 * APEX OmniDash — Z-Index Manager (Layer 4: Spatial Engine)
 * @version 6.1.0
 * @module apps/omnihub-site/src/lib/ZIndexManager
 *
 * Pure function module — zero React dependencies.
 * Replaces destructive AABB collision logic with an OS-level Spatial Layer Manager.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Same input → same output, every time
 * - Modularity: Pure functions only — no side effects, no DOM access
 * - Regression-Free: Normalization prevents z-index inflation runaway
 * - Performance: O(n) scan on widget count — trivial for <100 widgets
 * - Security: ReadonlyArray inputs prevent mutation of caller state
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ============================================================================
// Types
// ============================================================================

export interface ZIndexable {
  readonly z: number;
}

export type WidgetLayoutMap = Readonly<Record<string, ZIndexable>>;

// ============================================================================
// Constants
// ============================================================================

/** Base z-index for canvas widgets. Below this: shell elements. Above: PiP windows. */
export const CANVAS_Z_BASE = 10;

/** Z-index normalization threshold. When any widget exceeds this, compact the stack. */
const Z_NORMALIZATION_THRESHOLD = 900;

/** PiP windows live above this floor — never intersect with canvas widgets. */
export const PIP_Z_FLOOR = 1000;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate the next z-index to bring a widget to the foreground.
 *
 * @param layouts - Current widget layout map with z-index values
 * @returns The z-index value that places the widget above all others
 *
 * @example
 * ```ts
 * const nextZ = getNextZ({ a: { z: 5 }, b: { z: 12 }, c: { z: 3 } });
 * // nextZ === 13
 * ```
 */
export function getNextZ(layouts: WidgetLayoutMap): number {
  const zValues = Object.values(layouts).map((layout) => layout.z);

  if (zValues.length === 0) {
    return CANVAS_Z_BASE;
  }

  return Math.max(...zValues) + 1;
}

/**
 * Get the current maximum z-index across all widgets.
 *
 * @param layouts - Current widget layout map
 * @returns The highest z-index value, or CANVAS_Z_BASE if no widgets exist
 */
export function getMaxZ(layouts: WidgetLayoutMap): number {
  const zValues = Object.values(layouts).map((layout) => layout.z);

  if (zValues.length === 0) {
    return CANVAS_Z_BASE;
  }

  return Math.max(...zValues);
}

/**
 * Determine if z-index normalization is required.
 *
 * Z-index inflation occurs when users repeatedly click widgets, each time
 * incrementing the max z-index. Without normalization, z-values grow unbounded,
 * eventually crossing the PiP floor threshold and causing layer conflicts.
 *
 * @param layouts - Current widget layout map
 * @returns true if normalization is needed
 */
export function needsNormalization(layouts: WidgetLayoutMap): boolean {
  return getMaxZ(layouts) >= Z_NORMALIZATION_THRESHOLD;
}

/**
 * Normalize the z-index stack by compacting values to a sequential range.
 *
 * Preserves the relative stacking order while resetting values to start
 * from CANVAS_Z_BASE. This prevents z-index inflation from reaching the
 * PiP floor (1000+) and causing layer conflicts.
 *
 * @param layouts - Current widget layout map
 * @returns New layout map with compacted z-index values
 *
 * @example
 * ```ts
 * const normalized = normalizeZStack({
 *   a: { z: 450 },
 *   b: { z: 899 },
 *   c: { z: 200 },
 * });
 * // Result: { a: { z: 11 }, b: { z: 12 }, c: { z: 10 } }
 * ```
 */
export function normalizeZStack(layouts: WidgetLayoutMap): Record<string, ZIndexable> {
  const entries = Object.entries(layouts);

  if (entries.length === 0) {
    return {};
  }

  // Sort by current z-index to preserve relative order
  const sorted = [...entries].sort(
    ([, a], [, b]) => a.z - b.z,
  );

  // Reassign sequential z-values starting from CANVAS_Z_BASE
  const result: Record<string, ZIndexable> = {};
  sorted.forEach(([id], index) => {
    result[id] = { z: CANVAS_Z_BASE + index };
  });

  return result;
}

/**
 * Bring a specific widget to the front of the z-stack.
 *
 * This is the primary entry point for the Z-Index Engine.
 * Called on every pointer-down event on a widget.
 *
 * @param widgetId - The widget to elevate
 * @param layouts - Current widget layout map
 * @returns Updated z-index value for the target widget, and whether normalization was applied
 */
export function bringToFront(
  widgetId: string,
  layouts: WidgetLayoutMap,
): { readonly newZ: number; readonly normalized: boolean } {
  // If already at top, no-op (idempotent)
  const currentZ = layouts[widgetId]?.z ?? CANVAS_Z_BASE;
  const maxZ = getMaxZ(layouts);

  if (currentZ === maxZ && Object.keys(layouts).length > 1) {
    // Already on top — no change needed
    return { newZ: currentZ, normalized: false };
  }

  const nextZ = maxZ + 1;

  // Check if normalization is needed after this elevation
  if (nextZ >= Z_NORMALIZATION_THRESHOLD) {
    // Apply normalization first, then elevate
    const normalizedLayouts = normalizeZStack(layouts);
    const normalizedMax = getMaxZ(normalizedLayouts);
    return { newZ: normalizedMax + 1, normalized: true };
  }

  return { newZ: nextZ, normalized: false };
}
