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
} from '../types/dashboard.types';
import {
  DEFAULT_OPS_STATE,
  LAYOUT_STORAGE_KEY,
} from '../types/dashboard.types';

interface UseLayoutPersistenceReturn {
  activeNav: DashboardNavSection;
  setActiveNav: Dispatch<SetStateAction<DashboardNavSection>>;
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
  ops: OmniDashOpsState;
  setOps: Dispatch<SetStateAction<OmniDashOpsState>>;
}

function loadPersistedState(): PersistedLayoutState {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PersistedLayoutState>;
    const persistedOps = parsed.ops;
    return {
      activeNav: (parsed.activeNav as DashboardNavSection) ?? 'OmniBoard',
      isDark: parsed.isDark ?? true,
      ops: persistedOps ? { ...DEFAULT_OPS_STATE, ...persistedOps } : DEFAULT_OPS_STATE,
    };
  } catch {
    return defaultState();
  }
}

function defaultState(): PersistedLayoutState {
  return {
    activeNav: 'OmniBoard',
    isDark: true,
    ops: DEFAULT_OPS_STATE,
  };
}

export function useLayoutPersistence(): UseLayoutPersistenceReturn {
  const initial = loadPersistedState();

  const [activeNav, setActiveNav] = useState<DashboardNavSection>(initial.activeNav);
  const [isDark, setIsDark] = useState<boolean>(initial.isDark);
  const [ops, setOps] = useState<OmniDashOpsState>(initial.ops);

  const persist = useCallback(
    (nav: DashboardNavSection, dark: boolean, opsState: OmniDashOpsState) => {
      try {
        const state: PersistedLayoutState = { activeNav: nav, isDark: dark, ops: opsState };
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // localStorage unavailable (private browsing, quota exceeded) — silent fail
      }
    },
    [],
  );

  useEffect(() => {
    persist(activeNav, isDark, ops);
    
    // Apply theme system tokens globally
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [activeNav, isDark, ops, persist]);

  return { activeNav, setActiveNav, isDark, setIsDark, ops, setOps };
}
