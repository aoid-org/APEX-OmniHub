/**
 * OmniDash Keyboard Shortcuts Tests
 *
 * FIXED:
 * - Wrapped DOM events in act() to prevent "updates outside act" warnings
 * - Added try/finally for safe DOM cleanup (prevents cascading test failures)
 * - Fixed useLocation mock referencing (returns new object for proper hook dependency tracking)
 * - Properly hoisted mocks for Vitest compatibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useOmniDashKeyboardShortcuts } from '@/omnidash/useOmniDashKeyboardShortcuts';

// 1. HOIST MOCKS: Define mocks using vi.hoisted so they are accessible inside vi.mock factory
const { mockNavigate, mockLocation } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLocation: { pathname: '/omnidash' },
}));

// 2. MOCK ROUTER: Mock the hooks to return our hoisted spies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    // FIX 3: Return a shallow copy so referential equality checks in hooks work correctly
    // (React won't re-run effects if the object reference is identical)
    useLocation: () => ({ ...mockLocation }),
  };
});

// Helper to create keyboard events
const createKeyboardEvent = (key: string, options?: Partial<KeyboardEventInit>) =>
  new KeyboardEvent('keydown', {
    key,
    code: `Key${key.toUpperCase()}`, // Best practice: explicit code
    bubbles: true,
    cancelable: true,
    ...options
  });

// Helper to render the hook
// Note: BrowserRouter wrapper is kept for context, but mocks intercept the main hooks.
const renderShortcutsHook = () =>
  renderHook(() => useOmniDashKeyboardShortcuts(), { wrapper: BrowserRouter });

// Helper to dispatch key and verify navigation
const dispatchKeyAndExpect = (key: string, expectedPath?: string) => {
  const event = createKeyboardEvent(key);

  // FIX 2: Wrap native events in act() to flush React updates immediately
  act(() => {
    document.dispatchEvent(event);
  });

  if (expectedPath) {
    expect(mockNavigate).toHaveBeenCalledWith(expectedPath);
  } else {
    expect(mockNavigate).not.toHaveBeenCalled();
  }
};

// Shortcut definitions for data-driven tests
const ALL_SHORTCUTS = [
  { key: 'H', path: '/omnidash' },
  { key: 'P', path: '/omnidash/pipeline' },
  { key: 'K', path: '/omnidash/kpis' },
  { key: 'O', path: '/omnidash/ops' },
  { key: 'I', path: '/omnidash/integrations' },
  { key: 'E', path: '/omnidash/events' },
  { key: 'N', path: '/omnidash/entities' },
  { key: 'R', path: '/omnidash/runs' },
  { key: 'A', path: '/omnidash/approvals' },
];

describe('useOmniDashKeyboardShortcuts', () => {
  beforeEach(() => {
    // Reset mocks and state before each test
    mockNavigate.mockReset();
    mockLocation.pathname = '/omnidash';
  });

  it('should navigate to Pipeline when P is pressed', () => {
    renderShortcutsHook();
    dispatchKeyAndExpect('P', '/omnidash/pipeline');
  });

  it('should navigate to KPIs when K is pressed', () => {
    renderShortcutsHook();
    dispatchKeyAndExpect('K', '/omnidash/kpis');
  });

  it('should navigate to Home when H is pressed', () => {
    mockLocation.pathname = '/omnidash/pipeline';
    renderShortcutsHook();
    dispatchKeyAndExpect('H', '/omnidash');
  });

  it('should handle lowercase keys', () => {
    renderShortcutsHook();
    dispatchKeyAndExpect('p', '/omnidash/pipeline');
  });

  it('should not navigate if already on target page', () => {
    mockLocation.pathname = '/omnidash';
    renderShortcutsHook();
    dispatchKeyAndExpect('H');
  });

  it('should ignore shortcuts when typing in input field', () => {
    renderShortcutsHook();

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // FIX 1: Use try/finally to ensure cleanup happens even if expect fails
    try {
      const event = createKeyboardEvent('P');

      act(() => {
        // Dispatch from input so event.target is correct
        input.dispatchEvent(event);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    } finally {
      // Guaranteed cleanup prevents leaking elements into other tests
      document.body.removeChild(input);
    }
  });

  it('should ignore shortcuts when typing in textarea', () => {
    renderShortcutsHook();

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    try {
      const event = createKeyboardEvent('P');

      act(() => {
        textarea.dispatchEvent(event);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(textarea);
    }
  });

  it.each([
    { modifier: 'ctrlKey', name: 'Ctrl' },
    { modifier: 'altKey', name: 'Alt' },
    { modifier: 'metaKey', name: 'Meta' },
  ])('should ignore shortcuts when $name is pressed', ({ modifier }) => {
    renderShortcutsHook();
    const event = createKeyboardEvent('P', { [modifier]: true });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each(ALL_SHORTCUTS)('should navigate to $path when $key is pressed', ({ key, path }) => {
    mockLocation.pathname = '/some-other-page';
    mockNavigate.mockClear();

    renderShortcutsHook();
    dispatchKeyAndExpect(key, path);
  });

  it('should ignore non-shortcut keys', () => {
    renderShortcutsHook();
    dispatchKeyAndExpect('X');
  });

  it('should prevent default behavior when shortcut is triggered', () => {
    renderShortcutsHook();
    const event = createKeyboardEvent('P');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    act(() => {
      document.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});