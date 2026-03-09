/**
 * OmniDash Provider — Context Wrapper (Layer 7)
 * @version 1.0.0
 * @module apps/omnihub-site/src/providers/OmniDashProvider
 *
 * Mounts the OmniDash zustand store above the layout so all child
 * components share the same spatial state. This wrapper sits in App.tsx
 * around the /omnidash route.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useMemo, type ReactNode } from 'react';
import { useOmniDash } from '../stores/omniDashStore';
import { OmniDashContext, type OmniDashContextValue } from './OmniDashContext';

// ============================================================================
// Provider
// ============================================================================

interface OmniDashProviderProps {
  readonly children: ReactNode;
}

export function OmniDashProvider({ children }: OmniDashProviderProps) {
  const widgets = useOmniDash(s => s.widgets);
  const floatingWindows = useOmniDash(s => s.floatingWindows);
  const zManager = useOmniDash(s => s.zManager);

  const value = useMemo<OmniDashContextValue>(
    () => ({
      widgetCount: widgets.size,
      hasFloatingWindows: floatingWindows.size > 0,
      zManager,
    }),
    [widgets.size, floatingWindows.size, zManager],
  );

  return (
    <OmniDashContext.Provider value={value}>
      {children}
    </OmniDashContext.Provider>
  );
}
