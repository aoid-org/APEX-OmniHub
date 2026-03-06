/**
 * APEX OmniDash — Spatial State Store (Layer 7: Global State)
 * @version 6.1.0
 * @module apps/omnihub-site/src/stores/omniDashStore
 *
 * Zustand store for OmniDash spatial workspace state.
 * Follows established APEX patterns from omniModalStore.ts.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: bringToFront() with already-top widget is a no-op
 * - Modularity: Pure Zustand store — zero React dependencies in logic
 * - Regression-Free: All position mutations are immutable spreads
 * - Overload-Free: Debounced persistence prevents write storms
 * - Performance: Position updates during drag bypass React entirely (useRef in WidgetShell)
 * - Security: structuredClone sanitization on restore from localStorage
 * - Durability: 500ms debounced localStorage persistence with graceful fallback
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';
import {
  bringToFront as computeBringToFront,
  normalizeZStack,
  needsNormalization,
  CANVAS_Z_BASE,
  PIP_Z_FLOOR,
  type WidgetLayoutMap,
} from '@/lib/ZIndexManager';

// ============================================================================
// Types
// ============================================================================

export interface WidgetLayout {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly z: number;
}

export interface PipWindow {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly z: number;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'apex.omnidash.spatial-layout';
const DEBOUNCE_MS = 500;

/** Canonical widget IDs for the OmniDash spatial canvas. */
export const WIDGET_IDS = {
  HERO: 'hero-bipane',
  OMNI_TRACE: 'omni-trace',
  INTEGRATED_APPS: 'integrated-apps',
  OPS_CONTROLS: 'ops-controls',
  ECOSYSTEM: 'ecosystem',
  ANALYTICS: 'analytics',
  SECURITY: 'security-audit',
} as const;

export type CanonicalWidgetId = (typeof WIDGET_IDS)[keyof typeof WIDGET_IDS];

/**
 * Default layout for a fresh workspace.
 * Positioned as a tiled grid with 16px gaps.
 */
const INITIAL_LAYOUTS: Readonly<Record<string, WidgetLayout>> = {
  [WIDGET_IDS.HERO]:            { x: 0,   y: 0,   w: 720, h: 320, z: CANVAS_Z_BASE },
  [WIDGET_IDS.OPS_CONTROLS]:    { x: 740, y: 0,   w: 320, h: 200, z: CANVAS_Z_BASE + 1 },
  [WIDGET_IDS.ECOSYSTEM]:       { x: 740, y: 220, w: 320, h: 200, z: CANVAS_Z_BASE + 2 },
  [WIDGET_IDS.OMNI_TRACE]:      { x: 0,   y: 340, w: 520, h: 220, z: CANVAS_Z_BASE + 3 },
  [WIDGET_IDS.ANALYTICS]:       { x: 540, y: 340, w: 260, h: 220, z: CANVAS_Z_BASE + 4 },
  [WIDGET_IDS.SECURITY]:        { x: 820, y: 340, w: 240, h: 220, z: CANVAS_Z_BASE + 5 },
  [WIDGET_IDS.INTEGRATED_APPS]: { x: 0,   y: 580, w: 1060, h: 280, z: CANVAS_Z_BASE + 6 },
};

// ============================================================================
// Persistence Utilities
// ============================================================================

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function persistToStorage(layouts: Readonly<Record<string, WidgetLayout>>): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    try {
      const serialized = JSON.stringify(layouts);
      globalThis.localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // localStorage full or disabled — graceful degradation
      console.warn('[OmniDash] Layout persistence failed — storage unavailable.');
    }
  }, DEBOUNCE_MS);
}

function restoreFromStorage(): Readonly<Record<string, WidgetLayout>> | null {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    // structuredClone sanitizes against prototype pollution
    const parsed: unknown = structuredClone(JSON.parse(raw));

    // Validate shape
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const validated: Record<string, WidgetLayout> = {};

    for (const [key, value] of Object.entries(record)) {
      if (isValidLayout(value)) {
        validated[key] = value;
      }
    }

    return Object.keys(validated).length > 0 ? validated : null;
  } catch {
    // Corrupt data — fall back to defaults
    return null;
  }
}

function isValidLayout(value: unknown): value is WidgetLayout {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.x === 'number' &&
    typeof obj.y === 'number' &&
    typeof obj.w === 'number' &&
    typeof obj.h === 'number' &&
    typeof obj.z === 'number' &&
    Number.isFinite(obj.x) &&
    Number.isFinite(obj.y) &&
    Number.isFinite(obj.w) &&
    Number.isFinite(obj.h) &&
    Number.isFinite(obj.z)
  );
}

// ============================================================================
// Store Interface
// ============================================================================

interface OmniDashState {
  /** Widget spatial coordinates. Key = widget ID, value = { x, y, w, h, z }. */
  readonly layouts: Readonly<Record<string, WidgetLayout>>;

  /** Active PiP floating windows. */
  readonly pipWindows: readonly PipWindow[];

  /** Bring a widget to the foreground (Z-Index Engine). Idempotent if already on top. */
  bringToFront: (widgetId: string) => void;

  /** Update a widget's position after drag completes. Triggers debounced persistence. */
  updatePosition: (widgetId: string, x: number, y: number) => void;

  /** Update a widget's size after resize completes. Triggers debounced persistence. */
  updateSize: (widgetId: string, w: number, h: number) => void;

  /** Open a PiP floating window for deep interactions. */
  openPiP: (type: string, title: string) => void;

  /** Close a PiP floating window by ID. */
  closePiP: (pipId: string) => void;

  /** Reset all layouts to factory defaults. */
  resetLayouts: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useOmniDashStore = create<OmniDashState>((set, get) => ({
  layouts: restoreFromStorage() ?? { ...INITIAL_LAYOUTS },
  pipWindows: [],

  bringToFront: (widgetId: string) => {
    const { layouts } = get();

    if (!layouts[widgetId]) return; // Unknown widget — no-op

    // Cast to WidgetLayoutMap for ZIndexManager
    const zMap: WidgetLayoutMap = layouts;
    const { newZ, normalized } = computeBringToFront(widgetId, zMap);

    if (normalized) {
      // Normalization required — recompute all z-values
      const normalizedZ = normalizeZStack(zMap);
      const updatedLayouts = { ...layouts };

      for (const [id, { z }] of Object.entries(normalizedZ)) {
        if (updatedLayouts[id]) {
          updatedLayouts[id] = { ...updatedLayouts[id], z };
        }
      }

      // Elevate target widget above the normalized stack
      updatedLayouts[widgetId] = { ...updatedLayouts[widgetId], z: newZ };

      set({ layouts: updatedLayouts });
      persistToStorage(updatedLayouts);
    } else {
      // Simple elevation
      const currentZ = layouts[widgetId].z;
      if (currentZ === newZ) return; // Already on top — idempotent

      const updatedLayouts = {
        ...layouts,
        [widgetId]: { ...layouts[widgetId], z: newZ },
      };

      set({ layouts: updatedLayouts });
      persistToStorage(updatedLayouts);
    }
  },

  updatePosition: (widgetId: string, x: number, y: number) => {
    const { layouts } = get();

    if (!layouts[widgetId]) return;

    const updatedLayouts = {
      ...layouts,
      [widgetId]: { ...layouts[widgetId], x, y },
    };

    set({ layouts: updatedLayouts });
    persistToStorage(updatedLayouts);
  },

  updateSize: (widgetId: string, w: number, h: number) => {
    const { layouts } = get();

    if (!layouts[widgetId]) return;

    // Enforce minimum dimensions
    const clampedW = Math.max(200, w);
    const clampedH = Math.max(120, h);

    const updatedLayouts = {
      ...layouts,
      [widgetId]: { ...layouts[widgetId], w: clampedW, h: clampedH },
    };

    set({ layouts: updatedLayouts });
    persistToStorage(updatedLayouts);
  },

  openPiP: (type: string, title: string) => {
    const { pipWindows } = get();

    // Prevent duplicate PiP windows of the same type (idempotent)
    if (pipWindows.some((w) => w.type === type)) return;

    const newPiP: PipWindow = {
      id: `pip-${type}-${Date.now()}`,
      type,
      title,
      x: 100,
      y: 80,
      w: 600,
      h: 450,
      z: PIP_Z_FLOOR + pipWindows.length,
    };

    set({ pipWindows: [...pipWindows, newPiP] });
  },

  closePiP: (pipId: string) => {
    const { pipWindows } = get();
    set({ pipWindows: pipWindows.filter((w) => w.id !== pipId) });
  },

  resetLayouts: () => {
    const freshLayouts = { ...INITIAL_LAYOUTS };
    set({ layouts: freshLayouts, pipWindows: [] });
    persistToStorage(freshLayouts);
  },
}));

// ============================================================================
// Safety: Run normalization check on store init if restored data is inflated
// ============================================================================

const initialLayouts = useOmniDashStore.getState().layouts;
if (needsNormalization(initialLayouts)) {
  const normalized = normalizeZStack(initialLayouts);
  const updatedLayouts: Record<string, WidgetLayout> = {};

  for (const [id, layout] of Object.entries(initialLayouts)) {
    updatedLayouts[id] = {
      ...layout,
      z: normalized[id]?.z ?? layout.z,
    };
  }

  useOmniDashStore.setState({ layouts: updatedLayouts });
  persistToStorage(updatedLayouts);
}
