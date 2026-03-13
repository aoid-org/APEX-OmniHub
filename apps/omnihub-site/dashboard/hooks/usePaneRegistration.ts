/**
 * usePaneRegistration — OmniCanvas Widget Registration
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/hooks/usePaneRegistration
 *
 * Registers named OmniDash panes with the omniDashStore (OmniCanvas).
 * Enables spatial widget management (open/close/focus) for panes that
 * opt into the OmniCanvas drag/zoom system.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Registering the same pane twice is a no-op (store guards it)
 * - Cleanup on unmount: Widgets are closed when the registering component unmounts
 * - Zero-Config: Callers only supply a PaneDescriptor; store handles z-index
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useEffect, useCallback } from 'react';
import { useOmniDash } from '@/stores/omniDashStore';
import type { PaneDescriptor } from '../types/dashboard.types';

interface UsePaneRegistrationReturn {
  openPane: (descriptor: PaneDescriptor) => void;
  closePane: (id: string) => void;
  focusPane: (id: string) => void;
}

export function usePaneRegistration(): UsePaneRegistrationReturn {
  const openWidget = useOmniDash((s) => s.openWidget);
  const closeWidget = useOmniDash((s) => s.closeWidget);
  const focusWidget = useOmniDash((s) => s.focusWidget);

  const openPane = useCallback(
    (descriptor: PaneDescriptor) => {
      openWidget(
        descriptor.id,
        descriptor.title,
        descriptor.component,
        descriptor.defaultPosition,
        descriptor.defaultSize,
      );
    },
    [openWidget],
  );

  const closePane = useCallback(
    (id: string) => {
      closeWidget(id);
    },
    [closeWidget],
  );

  const focusPane = useCallback(
    (id: string) => {
      focusWidget(id);
    },
    [focusWidget],
  );

  return { openPane, closePane, focusPane };
}

/**
 * Auto-registers a single pane on mount and deregisters on unmount.
 * Use this inside pane components to self-register with OmniCanvas.
 */
export function useAutoPane(descriptor: PaneDescriptor): void {
  const { openPane, closePane } = usePaneRegistration();

  useEffect(() => {
    openPane(descriptor);
    return () => closePane(descriptor.id);
    // Intentionally omit descriptor from deps to register once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptor.id]);
}
