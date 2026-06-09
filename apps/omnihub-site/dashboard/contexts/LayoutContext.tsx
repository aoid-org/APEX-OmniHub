/**
 * LayoutContext — OmniDash Layout State Context
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/contexts/LayoutContext
 *
 * Provided by OmniDashShell. Consumed by SettingsModule and any dashboard
 * component that needs layout state (hiddenWidgets, panelLayout, etc.).
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { createContext, useContext } from 'react';
import type { PanelLayout } from '../types/dashboard.types';

export interface LayoutContextValue {
  hiddenWidgets: readonly string[];
  panelLayout: PanelLayout;
  toggleWidget: (id: string) => void;
  setPanelLayout: (l: PanelLayout) => void;
  resetWidgetPositions: () => void;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayoutContext(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (ctx === null) {
    throw new Error('useLayoutContext must be used inside LayoutContext.Provider');
  }
  return ctx;
}
