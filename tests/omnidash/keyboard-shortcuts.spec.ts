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

describe('useOmniDashKeyboardShortcuts', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation.pathname = '/omnidash';
  });

  const createKeyboardEvent = (key: string, options?: Partial<KeyboardEventInit>) => {
    return new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
  };

  it('should navigate to Pipeline when P is pressed', () => {
    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const event = createKeyboardEvent('P');
    document.dispatchEvent(event);

    expect(mockNavigate).toHaveBeenCalledWith('/omnidash/pipeline');
  });

  it('should navigate to KPIs when K is pressed', () => {
    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const event = createKeyboardEvent('K');
    document.dispatchEvent(event);

    expect(mockNavigate).toHaveBeenCalledWith('/omnidash/kpis');
  });

  it('should navigate to Home when H is pressed', () => {
    mockLocation.pathname = '/omnidash/pipeline';

    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const event = createKeyboardEvent('H');
    document.dispatchEvent(event);

    expect(mockNavigate).toHaveBeenCalledWith('/omnidash');
  });

  it('should handle lowercase keys', () => {
    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const event = createKeyboardEvent('p');
    document.dispatchEvent(event);

    expect(mockNavigate).toHaveBeenCalledWith('/omnidash/pipeline');
  });

  it('should not navigate if already on target page', () => {
    mockLocation.pathname = '/omnidash';

    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const event = createKeyboardEvent('H');
    document.dispatchEvent(event);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should ignore shortcuts when typing in input field', () => {
    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = createKeyboardEvent('P');
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    document.dispatchEvent(event);

    expect(mockNavigate).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should ignore shortcuts when typing in textarea', () => {
    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const event = createKeyboardEvent('P');
    Object.defineProperty(event, 'target', { value: textarea, enumerable: true });
    document.dispatchEvent(event);

    expect(mockNavigate).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('should ignore shortcuts when Ctrl is pressed', () => {
    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const event = createKeyboardEvent('P', { ctrlKey: true });
    document.dispatchEvent(event);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should ignore shortcuts when Alt is pressed', () => {
    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const event = createKeyboardEvent('P', { altKey: true });
    document.dispatchEvent(event);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should ignore shortcuts when Meta key is pressed', () => {
    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const event = createKeyboardEvent('P', { metaKey: true });
    document.dispatchEvent(event);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should navigate to all defined shortcuts', () => {
    // Set initial location to a page that's not in our shortcuts list
    mockLocation.pathname = '/some-other-page';

    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const shortcuts = [
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

    shortcuts.forEach(({ key, path }) => {
      mockNavigate.mockClear();
      // Update location to ensure we're not on the target page
      mockLocation.pathname = '/some-other-page';

      const event = createKeyboardEvent(key);
      document.dispatchEvent(event);
      expect(mockNavigate).toHaveBeenCalledWith(path);
    });
  });

  it('should ignore non-shortcut keys', () => {
    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const event = createKeyboardEvent('X');
    document.dispatchEvent(event);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should prevent default behavior when shortcut is triggered', () => {
    renderHook(() => useOmniDashKeyboardShortcuts(), {
      wrapper: BrowserRouter,
    });

    const event = createKeyboardEvent('P');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
