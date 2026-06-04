/**
 * ApexAgentAvatar — Component Tests
 * @module tests/omnidash/apex-agent-avatar.spec
 *
 * OMNI-TEST UNIVERSAL — AAA pattern enforced.
 * Covers: localStorage persona persistence, storage event listener,
 * size variants, click handler, status indicator toggle.
 *
 * APEX REGRESSION SHIELD:
 * - Component must NOT use static PNG imports (tested in no-static-imports suite below)
 * - All avatar src values must start with /avatars/
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApexAgentAvatar from '@/dashboard/components/ApexAgentAvatar';

// No PNG vi.mock() stubs needed — component uses contract public paths, not bundled imports.

describe('ApexAgentAvatar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Default rendering', () => {
    it('renders with default Navigator persona when localStorage is empty', () => {
      // Arrange — no localStorage entry
      // Act
      render(<ApexAgentAvatar />);
      // Assert
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Navigator avatar');
    });

    it('avatar src starts with /avatars/ (not a bundled import)', () => {
      render(<ApexAgentAvatar />);
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toMatch(/^\/avatars\//);
    });

    it('img has loading=lazy and decoding=async', () => {
      render(<ApexAgentAvatar />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('decoding', 'async');
    });

    it('renders status indicator by default (showStatus=true)', () => {
      render(<ApexAgentAvatar />);
      // The status dot has title="Agent active"
      expect(screen.getByTitle('Agent active')).toBeInTheDocument();
    });

    it('hides status indicator when showStatus=false', () => {
      render(<ApexAgentAvatar showStatus={false} />);
      expect(screen.queryByTitle('Agent active')).not.toBeInTheDocument();
    });
  });

  describe('localStorage persona hydration', () => {
    it('reads saved persona from localStorage on mount', async () => {
      // Arrange
      localStorage.setItem('apex.agent.persona', 'Sentinel');

      // Act
      await act(async () => {
        render(<ApexAgentAvatar />);
      });

      // Assert
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Sentinel avatar');
      expect(img.getAttribute('src')).toMatch(/^\/avatars\//);
    });

    it('ignores invalid persona values not in AVATAR_PATH_MAP', async () => {
      // Arrange
      localStorage.setItem('apex.agent.persona', 'UnknownBot');

      // Act
      await act(async () => {
        render(<ApexAgentAvatar />);
      });

      // Assert — falls back to initial state (Navigator)
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Navigator avatar');
    });
  });

  describe('Storage event listener', () => {
    it('updates persona when storage event fires with valid persona', async () => {
      // Arrange
      const { rerender } = render(<ApexAgentAvatar />);
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Navigator avatar');

      // Act — simulate storage change from another tab
      await act(async () => {
        globalThis.dispatchEvent(
          new StorageEvent('storage', {
            key: 'apex.agent.persona',
            newValue: 'Pulse',
          }),
        );
      });

      // Re-render to pick up state
      rerender(<ApexAgentAvatar />);

      // Assert
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Pulse avatar');
    });

    it('ignores storage events for unrelated keys', async () => {
      render(<ApexAgentAvatar />);

      await act(async () => {
        globalThis.dispatchEvent(
          new StorageEvent('storage', {
            key: 'some.other.key',
            newValue: 'Companion',
          }),
        );
      });

      // Navigator persona unchanged
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Navigator avatar');
    });
  });

  describe('Size variants', () => {
    it.each(['sm', 'md', 'lg', 'xl'] as const)(
      'renders size=%s without crashing',
      (size) => {
        render(<ApexAgentAvatar size={size} />);
        expect(screen.getByRole('img')).toBeInTheDocument();
      },
    );
  });

  describe('Click handler', () => {
    it('calls onClick when button is clicked with handler', () => {
      // Arrange
      const onClickMock = vi.fn();
      render(<ApexAgentAvatar onClick={onClickMock} />);

      // Act
      screen.getByRole('button').click();

      // Assert
      expect(onClickMock).toHaveBeenCalledOnce();
    });

    it('renders button as disabled when no onClick is provided', () => {
      render(<ApexAgentAvatar />);
      // disabled attribute should be present when onClick is undefined
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('renders "Change persona" hover hint when onClick is provided', () => {
      render(<ApexAgentAvatar onClick={() => undefined} />);
      // The hint text is always in the DOM (opacity toggled via CSS)
      expect(screen.getByText('Change persona')).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('removes storage event listener on unmount (no memory leak)', () => {
      const removeSpy = vi.spyOn(globalThis, 'removeEventListener');
      const { unmount } = render(<ApexAgentAvatar />);
      unmount();
      expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });
  });
});
