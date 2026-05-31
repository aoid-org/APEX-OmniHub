import { useEffect } from 'react';
import { OMNIDASH_NAV_ITEMS } from './types';

type PanelKey = string | null;

/**
 * OmniDash Keyboard Shortcuts Hook - SPA Edition
 *
 * Triggers Sheet panel open callbacks instead of router navigation.
 * No route changes. Pure SPA.
 *
 * Shortcuts (disabled while typing):
 *   H = Today (closes all panels)
 *   P = Pipeline  |  K = KPIs   |  O = Ops
 *   I = Integrations  |  E = Events  |  N = Entities
 *   R = Runs  |  A = Approvals  |  W = Workflows
 */
export function useOmniDashKeyboardShortcuts(
  openPanel: (key: PanelKey) => void
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore when user is focused inside an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) return;

      // Ignore modified shortcuts (Ctrl/Alt/Meta)
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const pressedKey = event.key.toUpperCase();
      const match = OMNIDASH_NAV_ITEMS.find(
        (item) => item.shortcut?.toUpperCase() === pressedKey
      );

      if (match) {
        event.preventDefault();
        // key === 'home' means Today - close all panels
        openPanel(match.key === 'home' ? null : match.key);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openPanel]);
}
