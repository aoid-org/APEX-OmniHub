/**
 * OmniDash Keyboard Shortcuts Tests
 *
 * Tests keyboard panel opening behavior for OmniDash pages:
 * - Verifies shortcuts work (H, P, K, O, I, E, N, R, A, W)
 * - Ensures shortcuts are disabled when typing
 * - Validates panel-open behavior
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOmniDashKeyboardShortcuts } from '@/omnidash/useOmniDashKeyboardShortcuts';

const mockOpenPanel = vi.fn();

const createKeyboardEvent = (key: string, options?: Partial<KeyboardEventInit>) =>
  new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });

const renderShortcutsHook = () => renderHook(() => useOmniDashKeyboardShortcuts(mockOpenPanel));

const dispatchKeyAndExpectPanel = (key: string, expectedPanelKey: string | null) => {
  const event = createKeyboardEvent(key);
  document.dispatchEvent(event);
  expect(mockOpenPanel).toHaveBeenCalledWith(expectedPanelKey);
};

const dispatchKeyAndExpectNoPanelOpen = (key: string) => {
  const event = createKeyboardEvent(key);
  document.dispatchEvent(event);
  expect(mockOpenPanel).not.toHaveBeenCalled();
};

const ALL_SHORTCUTS = [
  { key: 'H', panelKey: null },
  { key: 'P', panelKey: 'pipeline' },
  { key: 'K', panelKey: 'kpis' },
  { key: 'O', panelKey: 'ops' },
  { key: 'I', panelKey: 'integrations' },
  { key: 'E', panelKey: 'events' },
  { key: 'N', panelKey: 'entities' },
  { key: 'R', panelKey: 'runs' },
  { key: 'A', panelKey: 'approvals' },
  { key: 'W', panelKey: 'workflows' },
];

describe('useOmniDashKeyboardShortcuts', () => {

  afterEach(() => {
    mockOpenPanel.mockClear();
  });

  it('should open Pipeline panel when P is pressed', () => {
    renderShortcutsHook();
    dispatchKeyAndExpectPanel('P', 'pipeline');
  });

  it('should open KPIs panel when K is pressed', () => {
    renderShortcutsHook();
    dispatchKeyAndExpectPanel('K', 'kpis');
  });

  it('should open Home panel when H is pressed', () => {
    renderShortcutsHook();
    dispatchKeyAndExpectPanel('H', null);
  });

  it('should handle lowercase keys', () => {
    renderShortcutsHook();
    dispatchKeyAndExpectPanel('p', 'pipeline');
  });

  it('should ignore shortcuts when typing in input field', () => {
    renderShortcutsHook();
    const input = document.createElement('input');
    document.body.appendChild(input);
    const event = createKeyboardEvent('P');
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    document.dispatchEvent(event);
    expect(mockOpenPanel).not.toHaveBeenCalled();
    input.remove();
  });

  it('should ignore shortcuts when typing in textarea', () => {
    renderShortcutsHook();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const event = createKeyboardEvent('P');
    Object.defineProperty(event, 'target', { value: textarea, enumerable: true });
    document.dispatchEvent(event);
    expect(mockOpenPanel).not.toHaveBeenCalled();
    textarea.remove();
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

  it.each(ALL_SHORTCUTS)('should open $panelKey when $key is pressed', ({ key, panelKey }) => {
    renderShortcutsHook();
    dispatchKeyAndExpectPanel(key, panelKey);
  });

  it('should ignore non-shortcut keys', () => {
    renderShortcutsHook();
    dispatchKeyAndExpectNoPanelOpen('X');
  });

  it('should prevent default behavior when shortcut is triggered', () => {
    renderShortcutsHook();
    const event = createKeyboardEvent('P');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
