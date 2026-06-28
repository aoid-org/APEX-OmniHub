/**
 * useLayoutPersistence — OmniDash Layout State Persistence
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/hooks/useLayoutPersistence
 *
 * Persists OmniDashShell UI state (activeNav, isDark, ops) to localStorage.
 * Hydrates from storage on mount. Writes on every state change.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Same state always produces identical storage key
 * - Fail-Safe: Parse errors fall back to defaults silently
 * - Zero side-effects: No global mutations outside returned setters
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  DashboardNavSection,
  OmniDashOpsState,
  PersistedLayoutState,
  PanelLayout,
} from '../types/dashboard.types';
import {
  DEFAULT_OPS_STATE,
  DEFAULT_PERSISTED_LAYOUT,
  LAYOUT_STORAGE_KEY,
} from '../types/dashboard.types';

interface UseLayoutPersistenceReturn {
  activeNav: DashboardNavSection;
  setActiveNav: Dispatch<SetStateAction<DashboardNavSection>>;
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
  ops: OmniDashOpsState;
  setOps: Dispatch<SetStateAction<OmniDashOpsState>>;
  panelLayout: PanelLayout;
  setPanelLayout: (l: PanelLayout) => void;
  hiddenWidgets: readonly string[];
  toggleWidget: (id: string) => void;
  /** Atomically show/hide a group of widgets in one persisted update (idempotent). */
  setGroupHidden: (ids: readonly string[], hidden: boolean) => void;
  resetWidgetPositions: () => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: Dispatch<SetStateAction<boolean>>;
}

function loadPersistedState(key: string): PersistedLayoutState {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PersistedLayoutState>;
    const persistedOps = parsed.ops;
    const rawPanelLayout = parsed.panelLayout;
    const panelLayout: PanelLayout =
      rawPanelLayout === 'reversed' ? 'reversed' : 'standard';
    const hiddenWidgets: readonly string[] = Array.isArray(parsed.hiddenWidgets)
      ? (parsed.hiddenWidgets as string[])
      : DEFAULT_PERSISTED_LAYOUT.hiddenWidgets;
    return {
      activeNav: (parsed.activeNav as DashboardNavSection) ?? DEFAULT_PERSISTED_LAYOUT.activeNav,
      isDark: parsed.isDark ?? DEFAULT_PERSISTED_LAYOUT.isDark,
      ops: persistedOps ? { ...DEFAULT_OPS_STATE, ...persistedOps } : DEFAULT_OPS_STATE,
      panelLayout,
      hiddenWidgets,
      hasSeenOnboarding: parsed.hasSeenOnboarding ?? DEFAULT_PERSISTED_LAYOUT.hasSeenOnboarding,
    };
  } catch {
    return defaultState();
  }
}

function defaultState(): PersistedLayoutState {
  return { ...DEFAULT_PERSISTED_LAYOUT };
}

export function useLayoutPersistence(userId?: string): UseLayoutPersistenceReturn {
  const storageKey = userId ? `${LAYOUT_STORAGE_KEY}:${userId}` : LAYOUT_STORAGE_KEY;
  const initial = loadPersistedState(storageKey);

  const [activeNav, setActiveNav] = useState<DashboardNavSection>(initial.activeNav);
  const [isDark, setIsDark] = useState<boolean>(initial.isDark);
  const [ops, setOps] = useState<OmniDashOpsState>(initial.ops);
  const [panelLayout, setPanelLayout] = useState<PanelLayout>(initial.panelLayout);
  const [hiddenWidgets, setHiddenWidgets] = useState<readonly string[]>(initial.hiddenWidgets);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(initial.hasSeenOnboarding);

  const persist = useCallback(
    (
      key: string,
      nav: DashboardNavSection,
      dark: boolean,
      opsState: OmniDashOpsState,
      layout: PanelLayout,
      hidden: readonly string[],
      seenOnboarding: boolean,
    ) => {
      try {
        const state: PersistedLayoutState = {
          activeNav: nav,
          isDark: dark,
          ops: opsState,
          panelLayout: layout,
          hiddenWidgets: hidden,
          hasSeenOnboarding: seenOnboarding,
        };
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // localStorage unavailable (private browsing, quota exceeded) — silent fail
      }
    },
    [],
  );

  useEffect(() => {
    persist(storageKey, activeNav, isDark, ops, panelLayout, hiddenWidgets, hasSeenOnboarding);

    // Apply theme system tokens globally
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [storageKey, activeNav, isDark, ops, panelLayout, hiddenWidgets, hasSeenOnboarding, persist]);



  const toggleWidget = useCallback((id: string) => {
    setHiddenWidgets((prev) => {
      if (prev.includes(id)) {
        return prev.filter((w) => w !== id);
      }
      return [...prev, id];
    });
  }, []);

  const setGroupHidden = useCallback((ids: readonly string[], hidden: boolean) => {
    setHiddenWidgets((prev) => {
      const set = new Set(prev);
      let changed = false;
      for (const id of ids) {
        if (hidden && !set.has(id)) { set.add(id); changed = true; }
        if (!hidden && set.has(id)) { set.delete(id); changed = true; }
      }
      // Idempotent: identical state returns the same reference (no re-render/persist).
      return changed ? Array.from(set) : prev;
    });
  }, []);

  const resetWidgetPositions = useCallback(() => {
    try {
      // Clear new consolidated layout keys
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('omnidash_layout_v2:') || key?.startsWith('omni_widget_pos_')) {
          keys.push(key);
        }
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // silent fail
    }
  }, []);

  return {
    activeNav,
    setActiveNav,
    isDark,
    setIsDark,
    ops,
    setOps,
    panelLayout,
    setPanelLayout,
    hiddenWidgets,
    toggleWidget,
    setGroupHidden,
    resetWidgetPositions,
    hasSeenOnboarding,
    setHasSeenOnboarding,
  };
}
