/**
 * NotificationCenter - Component Tests
 * @module tests/omnidash/notification-center.spec
 *
 * OMNI-TEST UNIVERSAL - AAA pattern enforced.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationCenter } from '@/dashboard/components/NotificationCenter';
import { useNotificationStore } from '../../apps/omnihub-site/src/stores/notificationStore';

if (!(globalThis as Record<string, unknown>).PointerEvent) {
  class PointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    constructor(type: string, props: PointerEventInit & { button?: number; ctrlKey?: boolean }) {
      super(type, props);
      this.button = props?.button ?? 0;
      this.ctrlKey = props?.ctrlKey ?? false;
    }
  }
  (globalThis as Record<string, unknown>).PointerEvent = PointerEvent;
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.getState().clearAll();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Bell trigger button', () => {
    it('renders with correct aria-label', () => {
      render(<NotificationCenter />);
      const trigger = screen.getByTestId('notification-center-trigger');
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-label', 'Open notification center');
    });
  });

  describe('Dialog open on click', () => {
    it('opens MAN Mode Notifications dialog', () => {
      render(<NotificationCenter />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('MAN Mode Notifications')).toBeInTheDocument();
    });

    it('shows dialog description text', () => {
      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));
      expect(screen.getByText(/human authorization/i)).toBeInTheDocument();
    });
  });

  describe('Notification item rendering', () => {
    it('renders notification title and description', () => {
      act(() => {
        useNotificationStore.getState().addNotification({
          label: 'Delete Prod DB',
          description: 'Irreversible action.',
          badge: 'MAN_MODE',
        });
      });

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      expect(screen.getByText('Delete Prod DB')).toBeInTheDocument();
      expect(screen.getByText('Irreversible action.')).toBeInTheDocument();
    });

    it('shows Authorize and Reject for pending notification', () => {
      act(() => {
        useNotificationStore.getState().addNotification({
          label: 'Action',
          description: 'Desc',
          badge: 'MAN_MODE',
        });
      });

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      const notifications = useNotificationStore.getState().notifications;
      const tid = notifications[0].id;

      expect(screen.getByTestId(`approve-${tid}`)).toBeInTheDocument();
      expect(screen.getByTestId(`deny-${tid}`)).toBeInTheDocument();
    });

    it('does not show action buttons for approved/read notification', () => {
      act(() => {
        useNotificationStore.getState().addNotification({
          label: 'Approved',
          description: 'Done',
          badge: 'SUCCESS',
        });
      });

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      const notifications = useNotificationStore.getState().notifications;
      const tid = notifications[0].id;

      expect(screen.queryByTestId(`approve-${tid}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`deny-${tid}`)).not.toBeInTheDocument();
    });
  });

  describe('Approve / Deny interaction', () => {
    it('clicking Authorize removes action buttons', () => {
      act(() => {
        useNotificationStore.getState().addNotification({
          label: 'T',
          description: 'D',
          badge: 'MAN_MODE',
        });
      });

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      const notifications = useNotificationStore.getState().notifications;
      const tid = notifications[0].id;

      act(() => {
        fireEvent.click(screen.getByTestId(`approve-${tid}`));
      });

      expect(screen.queryByTestId(`approve-${tid}`)).not.toBeInTheDocument();
    });

    it('clicking Reject removes action buttons', () => {
      act(() => {
        useNotificationStore.getState().addNotification({
          label: 'T2',
          description: 'D2',
          badge: 'MAN_MODE',
        });
      });

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      const notifications = useNotificationStore.getState().notifications;
      const tid = notifications[0].id;

      act(() => {
        fireEvent.click(screen.getByTestId(`deny-${tid}`));
      });

      expect(screen.queryByTestId(`deny-${tid}`)).not.toBeInTheDocument();
    });
  });
});
