import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { OMNIDASH_NAV_ITEMS } from './types';

/**
 * OmniDash Keyboard Shortcuts Hook
 *
 * Enables keyboard navigation for OmniDash pages:
 * - H: Home (Today)
 * - P: Pipeline
 * - K: KPIs
 * - O: Ops
 * - I: Integrations
 * - E: Events
 * - N: Entities
 * - R: Runs
 * - A: Approvals
 *
 * Shortcuts are disabled when user is typing in an input field.
 */
export function useOmniDashKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/select or contentEditable
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isTyping) {
        return;
      }

      // Ignore if modifier keys are pressed (Ctrl, Alt, Meta)
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Find matching nav item by shortcut key
      const pressedKey = event.key.toUpperCase();
      const matchingItem = OMNIDASH_NAV_ITEMS.find(
        (item) => item.shortcut?.toUpperCase() === pressedKey
      );

      if (matchingItem) {
        // Prevent default behavior (e.g., quick find)
        event.preventDefault();

        // Only navigate if we're not already on that page
        if (location.pathname !== matchingItem.to) {
          navigate(matchingItem.to);
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [navigate, location.pathname]);
}
