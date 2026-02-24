/**
 * OmniDash Keyboard Shortcuts Tests
 *
 * Tests keyboard navigation for OmniDash pages:
 * - Verifies shortcuts work (H, P, K, O, I, E, N, R, A)
 * - Ensures shortcuts are disabled when typing
 * - Validates navigation behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useOmniDashKeyboardShortcuts } from '@/omnidash/useOmniDashKeyboardShortcuts';

const mockOpenPanel = vi.fn();

// Helper to create keyboard events
const createKeyboardEvent = (key: string, options?: Partial<KeyboardEventInit>) =>
  new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });

// Helper to render the hook with router context
const renderShortcutsHook = () =>
  renderHook(() => useOmniDashKeyboardShortcuts(mockOpenPanel), { wrapper: BrowserRouter });

// Helper to dispatch key and verify navigation
const dispatchKeyAndExpect = (key: string, expectedKey?: string | null) => {
  const event = createKeyboardEvent(key);
  document.dispatchEvent(event);
  if (expectedKey !== undefined) {
    expect(mockOpenPanel).toHaveBeenCalledWith(expectedKey);
  } else {
    expect(mockOpenPanel).not.toHaveBeenCalled();
  }
};

// Shortcut definitions for data-driven tests
const ALL_SHORTCUTS = [
  { key: 'H', path: null },
  { key: 'P', path: 'pipeline' },
  { key: 'K', path: 'kpis' },
  { key: 'O', path: 'ops' },
  { key: 'I', path: 'integrations' },
  { key: 'E', path: 'events' },
  { key: 'N', path: 'entities' },
  { key: 'R', path: 'runs' },
  { key: 'A', path: 'approvals' },
];

describe('useOmniDashKeyboardShortcuts', () => {
  beforeEach(() => {
    mockOpenPanel.mockClear();
  });

  describe('All Shortcuts', () => {
    ALL_SHORTCUTS.forEach(({ key, path }) => {
      it(`should navigate to ${path === null ? "'home' (null)" : path} when '${key}' is pressed`, () => {
        renderShortcutsHook();
        dispatchKeyAndExpect(key, path);
      });
      
      it(`should handle lowercase key '${key.toLowerCase()}'`, () => {
        renderShortcutsHook();
        dispatchKeyAndExpect(key.toLowerCase(), path);
      });
    });
  });

  it('should ignore shortcuts when typing in input field', () => {
    renderShortcutsHook();
    const input = document.createElement('input');
    document.body.appendChild(input);
    const event = createKeyboardEvent('P');
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    document.dispatchEvent(event);
    expect(mockOpenPanel).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('should ignore shortcuts when typing in textarea', () => {
    renderShortcutsHook();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const event = createKeyboardEvent('P');
    Object.defineProperty(event, 'target', { value: textarea, enumerable: true });
    document.dispatchEvent(event);
    expect(mockOpenPanel).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it.each([
    { modifier: 'ctrlKey', name: 'Ctrl' },
    { modifier: 'altKey', name: 'Alt' },
    { modifier: 'metaKey', name: 'Meta' },
  ])('should ignore shortcuts when $name is pressed', ({ modifier }) => {
    renderShortcutsHook();
    const event = createKeyboardEvent('P', { [modifier]: true });
    document.dispatchEvent(event);
    expect(mockOpenPanel).not.toHaveBeenCalled();
  });

  it('should ignore non-shortcut keys', () => {
    renderShortcutsHook();
    dispatchKeyAndExpect('X');
  });

  it('should prevent default behavior when shortcut is triggered', () => {
    renderShortcutsHook();
    const event = createKeyboardEvent('P');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
