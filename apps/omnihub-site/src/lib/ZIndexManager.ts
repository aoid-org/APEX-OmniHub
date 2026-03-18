/**
 * APEX OmniDash — Z-Index Manager (Layer 4: Spatial Engine)
 * @version 1.0.0
 * @module apps/omnihub-site/src/lib/ZIndexManager
 *
 * Proprietary spatial layer math for the OmniCanvas windowing system.
 * Manages z-index allocation for overlapping widgets with deterministic
 * bring-to-front behaviour and layer ceiling enforcement.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: bringToFront(id) with same state → same result
 * - Modularity: Pure class — zero React dependencies, zero side effects
 * - Overload-Free: Fixed ceiling prevents runaway z-index inflation
 * - Regression-Free: Compact re-indexes from BASE when ceiling reached
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ============================================================================
// Constants
// ============================================================================

/** Base z-index for widgets on the canvas. */
const Z_BASE = 100;

/** Maximum z-index before compaction triggers. */
const Z_CEILING = 10_000;

/** Z-index reserved for floating PiP windows (always above widgets). */
export const Z_FLOATING = 15_000;

/** Z-index for modal overlays (always above everything). */
export const Z_MODAL = 20_000;

// ============================================================================
// Layer Entry
// ============================================================================

export interface LayerEntry {
  readonly id: string;
  zIndex: number;
}

// ============================================================================
// ZIndexManager
// ============================================================================

export class ZIndexManager {
  private readonly layers: Map<string, LayerEntry> = new Map();
  private counter = Z_BASE;

  /** Register a new widget and return its initial z-index. */
  register(id: string): number {
    if (this.layers.has(id)) {
      return this.layers.get(id)!.zIndex;
    }
    const zIndex = ++this.counter;
    this.layers.set(id, { id, zIndex });
    return zIndex;
  }

  /** Remove a widget from the layer stack. */
  unregister(id: string): void {
    this.layers.delete(id);
  }

  /** Bring a widget to the front. Returns its new z-index. */
  bringToFront(id: string): number {
    const entry = this.layers.get(id);
    if (!entry) return this.register(id);

    // If approaching ceiling, compact all layers
    if (this.counter >= Z_CEILING) {
      this.compact();
    }

    const newZ = ++this.counter;
    entry.zIndex = newZ;
    return newZ;
  }

  /** Send a widget to the back. Returns its new z-index. */
  sendToBack(id: string): number {
    const entry = this.layers.get(id);
    if (!entry) return Z_BASE;

    // Find the current minimum z-index
    let min = Z_CEILING;
    for (const layer of this.layers.values()) {
      if (layer.zIndex < min) min = layer.zIndex;
    }

    entry.zIndex = Math.max(Z_BASE, min - 1);
    return entry.zIndex;
  }

  /** Get the z-index for a widget. */
  getZ(id: string): number {
    return this.layers.get(id)?.zIndex ?? Z_BASE;
  }

  /** Get all layer entries sorted by z-index (ascending). */
  getSorted(): readonly LayerEntry[] {
    return [...this.layers.values()].sort((a, b) => a.zIndex - b.zIndex);
  }

  /** Check if a widget is the topmost layer. */
  isTop(id: string): boolean {
    const entry = this.layers.get(id);
    if (!entry) return false;
    for (const layer of this.layers.values()) {
      if (layer.zIndex > entry.zIndex) return false;
    }
    return true;
  }

  /** Compact all layers back to sequential z-indexes from BASE. */
  private compact(): void {
    const sorted = this.getSorted();
    let z = Z_BASE;
    for (const entry of sorted) {
      entry.zIndex = ++z;
    }
    this.counter = z;
  }

  /** Total number of registered widgets. */
  get size(): number {
    return this.layers.size;
  }
}
