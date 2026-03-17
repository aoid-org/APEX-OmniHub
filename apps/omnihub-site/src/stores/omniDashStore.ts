/**
 * OmniDash Spatial State — "The Canvas Mind"
 * @version 1.0.0
 * @module apps/omnihub-site/src/stores/omniDashStore
 *
 * Global Zustand store for the OmniCanvas spatial windowing system.
 * Manages widget positions, sizes, visibility, z-index ordering,
 * and floating (PiP) window state.
 *
 * Follows the omniModalStore.ts structured-clone sanitisation pattern.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: openWidget(id, config) with same args → same state
 * - Modularity: Pure Zustand store — zero React rendering dependencies
 * - Overload-Free: Max 20 widgets enforced — rejects beyond ceiling
 * - Regression-Free: structuredClone sanitises all external data at boundary
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';
import { ZIndexManager, Z_FLOATING } from '../lib/ZIndexManager';

// ============================================================================
// Types
// ============================================================================

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetConfig {
  readonly id: string;
  readonly title: string;
  readonly component: string;
  position: WidgetPosition;
  size: WidgetSize;
  zIndex: number;
  minimised: boolean;
  maximised: boolean;
}

export interface FloatingWindowConfig {
  readonly id: string;
  readonly title: string;
  readonly component: string;
  position: WidgetPosition;
  size: WidgetSize;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_WIDGETS = 20;

const DEFAULT_WIDGET_SIZE: WidgetSize = { width: 480, height: 360 };
const DEFAULT_FLOATING_SIZE: WidgetSize = { width: 320, height: 240 };

// ============================================================================
// Store
// ============================================================================

interface OmniDashState {
  readonly widgets: ReadonlyMap<string, WidgetConfig>;
  readonly floatingWindows: ReadonlyMap<string, FloatingWindowConfig>;
  readonly canvasOffset: WidgetPosition;
  readonly canvasScale: number;
  readonly zManager: ZIndexManager;

  // Widget operations
  openWidget: (id: string, title: string, component: string, position?: WidgetPosition, size?: WidgetSize) => void;
  closeWidget: (id: string) => void;
  moveWidget: (id: string, position: WidgetPosition) => void;
  resizeWidget: (id: string, size: WidgetSize) => void;
  focusWidget: (id: string) => void;
  minimiseWidget: (id: string) => void;
  maximiseWidget: (id: string) => void;
  restoreWidget: (id: string) => void;

  // Floating window operations
  openFloating: (id: string, title: string, component: string, position?: WidgetPosition) => void;
  closeFloating: (id: string) => void;
  moveFloating: (id: string, position: WidgetPosition) => void;

  // Canvas operations
  panCanvas: (offset: WidgetPosition) => void;
  zoomCanvas: (scale: number) => void;
  resetCanvas: () => void;
}

export const useOmniDash = create<OmniDashState>((set, get) => {
  const zManager = new ZIndexManager();

  return {
    widgets: new Map(),
    floatingWindows: new Map(),
    canvasOffset: { x: 0, y: 0 },
    canvasScale: 1,
    zManager,

    // ── Widget Operations ──────────────────────────────

    openWidget: (id, title, component, position, size) => {
      const state = get();
      if (state.widgets.size >= MAX_WIDGETS && !state.widgets.has(id)) {
        console.warn(`[OmniDash] Widget ceiling reached (${MAX_WIDGETS}). Rejected: ${id}`);
        return;
      }

      const existing = state.widgets.get(id);
      if (existing) {
        // Already open — focus it
        const z = zManager.bringToFront(id);
        const next = new Map(state.widgets);
        next.set(id, { ...existing, zIndex: z, minimised: false });
        set({ widgets: next });
        return;
      }

      const z = zManager.register(id);
      const cascade = state.widgets.size * 30;
      const widget: WidgetConfig = {
        id,
        title: structuredClone(title),
        component: structuredClone(component),
        position: position ? structuredClone(position) : { x: 60 + cascade, y: 60 + cascade },
        size: size ? structuredClone(size) : { ...DEFAULT_WIDGET_SIZE },
        zIndex: z,
        minimised: false,
        maximised: false,
      };
      const next = new Map(state.widgets);
      next.set(id, widget);
      set({ widgets: next });
    },

    closeWidget: (id) => {
      zManager.unregister(id);
      const next = new Map(get().widgets);
      next.delete(id);
      set({ widgets: next });
    },

    moveWidget: (id, position) => {
      const state = get();
      const widget = state.widgets.get(id);
      if (!widget) return;
      const next = new Map(state.widgets);
      next.set(id, { ...widget, position: structuredClone(position) });
      set({ widgets: next });
    },

    resizeWidget: (id, size) => {
      const state = get();
      const widget = state.widgets.get(id);
      if (!widget) return;
      const next = new Map(state.widgets);
      next.set(id, { ...widget, size: structuredClone(size), maximised: false });
      set({ widgets: next });
    },

    focusWidget: (id) => {
      const state = get();
      const widget = state.widgets.get(id);
      if (!widget) return;
      const z = zManager.bringToFront(id);
      const next = new Map(state.widgets);
      next.set(id, { ...widget, zIndex: z });
      set({ widgets: next });
    },

    minimiseWidget: (id) => {
      const state = get();
      const widget = state.widgets.get(id);
      if (!widget) return;
      const next = new Map(state.widgets);
      next.set(id, { ...widget, minimised: true });
      set({ widgets: next });
    },

    maximiseWidget: (id) => {
      const state = get();
      const widget = state.widgets.get(id);
      if (!widget) return;
      const z = zManager.bringToFront(id);
      const next = new Map(state.widgets);
      next.set(id, { ...widget, maximised: true, minimised: false, zIndex: z });
      set({ widgets: next });
    },

    restoreWidget: (id) => {
      const state = get();
      const widget = state.widgets.get(id);
      if (!widget) return;
      const next = new Map(state.widgets);
      next.set(id, { ...widget, maximised: false, minimised: false });
      set({ widgets: next });
    },

    // ── Floating Window Operations ─────────────────────

    openFloating: (id, title, component, position) => {
      const floating: FloatingWindowConfig = {
        id,
        title: structuredClone(title),
        component: structuredClone(component),
        position: position ? structuredClone(position) : { x: window.innerWidth - 360, y: window.innerHeight - 280 },
        size: { ...DEFAULT_FLOATING_SIZE },
      };
      const next = new Map(get().floatingWindows);
      next.set(id, floating);
      set({ floatingWindows: next });
    },

    closeFloating: (id) => {
      const next = new Map(get().floatingWindows);
      next.delete(id);
      set({ floatingWindows: next });
    },

    moveFloating: (id, position) => {
      const state = get();
      const floating = state.floatingWindows.get(id);
      if (!floating) return;
      const next = new Map(state.floatingWindows);
      next.set(id, { ...floating, position: structuredClone(position) });
      set({ floatingWindows: next });
    },

    // ── Canvas Operations ──────────────────────────────

    panCanvas: (offset) => {
      set({ canvasOffset: structuredClone(offset) });
    },

    zoomCanvas: (scale) => {
      set({ canvasScale: Math.max(0.25, Math.min(2, scale)) });
    },

    resetCanvas: () => {
      set({ canvasOffset: { x: 0, y: 0 }, canvasScale: 1 });
    },
  };
});

export { Z_FLOATING };
