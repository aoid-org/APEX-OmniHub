/**
 * OmniDash Keyboard Shortcuts Tests
 *
 * Tests keyboard panel toggling for OmniDash pages:
 * - Verifies shortcuts work (H, P, K, O, I, E, N, R, A)
 * - Ensures shortcuts are disabled when typing
 * - Validates panel opening behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOmniDashKeyboardShortcuts } from '@/omnidash/useOmniDashKeyboardShortcuts';

const mockOpenPanel = vi.fn();

// Helper to create keyboard events
const createKeyboardEvent = (key: string, options?: Partial<KeyboardEventInit>) =>
  new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });

// Helper to render the hook
const renderShortcutsHook = () =>
  renderHook(() => useOmniDashKeyboardShortcuts(mockOpenPanel));

// Helper to dispatch key and verify panel behavior
const dispatchKeyAndExpect = (key: string, expectedPanel?: string | null) => {
  const event = createKeyboardEvent(key);
  document.dispatchEvent(event);
  if (expectedPanel === undefined) {
    expect(mockOpenPanel).not.toHaveBeenCalled();
    return;
  }
  expect(mockOpenPanel).toHaveBeenCalledWith(expectedPanel);
};

// Shortcut definitions for data-driven tests
const ALL_SHORTCUTS = [
  { key: 'H', panel: null },
  { key: 'P', panel: 'pipeline' },
  { key: 'K', panel: 'kpis' },
  { key: 'O', panel: 'ops' },
  { key: 'I', panel: 'integrations' },
  { key: 'E', panel: 'events' },
  { key: 'N', panel: 'entities' },
  { key: 'R', panel: 'runs' },
  { key: 'A', panel: 'approvals' },
];

describe('useOmniDashKeyboardShortcuts', () => {
  beforeEach(() => {
    mockOpenPanel.mockClear();
  });

  afterEach(() => {
    mockOpenPanel.mockClear();
  });

  it('should open Pipeline panel when P is pressed', () => {
    renderShortcutsHook();
    dispatchKeyAndExpect('P', 'pipeline');
  });

  it('should open KPIs panel when K is pressed', () => {
    renderShortcutsHook();
    dispatchKeyAndExpect('K', 'kpis');
  });

  it('should reset panel to Home when H is pressed', () => {
    renderShortcutsHook();
    dispatchKeyAndExpect('H', null);
  });

  it('should handle lowercase keys', () => {
    renderShortcutsHook();
    dispatchKeyAndExpect('p', 'pipeline');
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

  it.each(ALL_SHORTCUTS)('should open $panel when $key is pressed', ({ key, panel }) => {
    renderShortcutsHook();
    dispatchKeyAndExpect(key, panel);
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
