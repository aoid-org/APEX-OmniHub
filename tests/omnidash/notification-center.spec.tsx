/**
 * NotificationCenter - Component Tests
 * @module tests/omnidash/notification-center.spec
 *
 * OMNI-TEST UNIVERSAL - AAA pattern enforced.
 * Store uses useSyncExternalStore (module-level singleton), not Zustand.
 * Tests use pushNotification/approveTask/denyTask directly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationCenter } from '@/dashboard/components/NotificationCenter';
import {
  pushNotification,
  approveTask,
  denyTask,
} from '@/stores/notificationStore';

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

// Each test has a unique taskId so module-level state doesn't bleed
let _testSeq = 0;
function uniqueId(): string {
  return `nc-test-${_testSeq++}-${Date.now()}`;
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      const tid = uniqueId();
      pushNotification({
        id: tid,
        taskId: tid,
        title: 'Delete Prod DB',
        description: 'Irreversible action.',
        lane: 'RED',
      });

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      expect(screen.getByText('Delete Prod DB')).toBeInTheDocument();
      expect(screen.getByText('Irreversible action.')).toBeInTheDocument();
    });

    it('shows Authorize and Reject for pending notification', () => {
      const tid = uniqueId();
      pushNotification({ id: tid, taskId: tid, title: 'Action', description: 'Desc', lane: 'RED' });

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      expect(screen.getByTestId(`approve-${tid}`)).toBeInTheDocument();
      expect(screen.getByTestId(`deny-${tid}`)).toBeInTheDocument();
    });

    it('does not show action buttons for approved notification', () => {
      const tid = uniqueId();
      pushNotification({ id: tid, taskId: tid, title: 'Approved', description: 'Done', lane: 'RED' });
      approveTask(tid);

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      expect(screen.queryByTestId(`approve-${tid}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`deny-${tid}`)).not.toBeInTheDocument();
    });

    it('does not show action buttons for denied notification', () => {
      const tid = uniqueId();
      pushNotification({ id: tid, taskId: tid, title: 'Denied', description: 'Rejected', lane: 'RED' });
      denyTask(tid);

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      expect(screen.queryByTestId(`approve-${tid}`)).not.toBeInTheDocument();
    });
  });

  describe('Approve / Deny interaction', () => {
    it('clicking Authorize removes action buttons (status=approved)', () => {
      const tid = uniqueId();
      pushNotification({ id: tid, taskId: tid, title: 'T', description: 'D', lane: 'RED' });

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      act(() => {
        fireEvent.click(screen.getByTestId(`approve-${tid}`));
      });

      expect(screen.queryByTestId(`approve-${tid}`)).not.toBeInTheDocument();
    });

    it('clicking Reject removes action buttons (status=denied)', () => {
      const tid = uniqueId();
      pushNotification({ id: tid, taskId: tid, title: 'T2', description: 'D2', lane: 'RED' });

      render(<NotificationCenter />);
      fireEvent.click(screen.getByTestId('notification-center-trigger'));

      act(() => {
        fireEvent.click(screen.getByTestId(`deny-${tid}`));
      });

      expect(screen.queryByTestId(`deny-${tid}`)).not.toBeInTheDocument();
    });
  });
});
