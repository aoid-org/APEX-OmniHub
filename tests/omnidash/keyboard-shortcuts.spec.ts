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

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/omnidash' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Helper to create keyboard events
const createKeyboardEvent = (key: string, options?: Partial<KeyboardEventInit>) =>
  new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });

// Helper to render the hook with router context
const renderShortcutsHook = () =>
  renderHook(() => useOmniDashKeyboardShortcuts(), { wrapper: BrowserRouter });

// Helper to dispatch key and verify navigation
const dispatchKeyAndExpect = (key: string, expectedPath?: string) => {
  const event = createKeyboardEvent(key);
  document.dispatchEvent(event);
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
    mockNavigate.mockClear();
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
    const event = createKeyboardEvent('P');
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    document.dispatchEvent(event);
    expect(mockNavigate).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('should ignore shortcuts when typing in textarea', () => {
    renderShortcutsHook();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const event = createKeyboardEvent('P');
    Object.defineProperty(event, 'target', { value: textarea, enumerable: true });
    document.dispatchEvent(event);
    expect(mockNavigate).not.toHaveBeenCalled();
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
    document.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
