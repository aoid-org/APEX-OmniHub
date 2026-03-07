/**
 * MAN Mode Dispatcher — Vitest unit tests
 *
 * Asserts correct call args for all three lanes:
 * - GREEN → console.debug only, no toast, no notification
 * - YELLOW → toast called with exact args, auto-continue vs hold
 * - RED → pushNotification called with exact args
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dispatchManMode,
  type ToastFn,
  type NotificationPushFn,
  type ManModeDispatcherDeps,
} from '@/integrations/maestro/execution/man-mode-dispatcher';

describe('dispatchManMode', () => {
  let toast: ReturnType<typeof vi.fn<ToastFn>>;
  let pushNotification: ReturnType<typeof vi.fn<NotificationPushFn>>;
  let deps: ManModeDispatcherDeps;

  beforeEach(() => {
    toast = vi.fn<ToastFn>();
    pushNotification = vi.fn<NotificationPushFn>();
    deps = { toast, pushNotification };
  });

  // ─── GREEN LANE ──────────────────────────────────────────────────────────────

  it('GREEN lane: executes with console.debug only, no toast, no notification', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const result = dispatchManMode(deps, {
      taskId: 'task-001',
      taskLabel: 'Send welcome email',
      riskLane: 'GREEN',
    });

    expect(result).toEqual({ action: 'execute', lane: 'GREEN' });
    expect(debugSpy).toHaveBeenCalledOnce();
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining('GREEN lane')
    );
    expect(toast).not.toHaveBeenCalled();
    expect(pushNotification).not.toHaveBeenCalled();

    debugSpy.mockRestore();
  });

  // ─── YELLOW LANE ─────────────────────────────────────────────────────────────

  it('YELLOW lane: fires toast with exact title and description', () => {
    const result = dispatchManMode(deps, {
      taskId: 'task-002',
      taskLabel: 'Bulk data export',
      riskLane: 'YELLOW',
      autoContineEnabled: false,
    });

    expect(result).toEqual({ action: 'hold', lane: 'YELLOW' });
    expect(toast).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith({
      title: 'Action Flagged',
      description: 'Bulk data export requires review.',
    });
    expect(pushNotification).not.toHaveBeenCalled();
  });

  it('YELLOW lane with auto-continue: proceeds after toast', () => {
    const result = dispatchManMode(deps, {
      taskId: 'task-003',
      taskLabel: 'Update config',
      riskLane: 'YELLOW',
      autoContineEnabled: true,
    });

    expect(result).toEqual({ action: 'execute', lane: 'YELLOW' });
    expect(toast).toHaveBeenCalledOnce();
    expect(pushNotification).not.toHaveBeenCalled();
  });

  // ─── RED LANE ────────────────────────────────────────────────────────────────

  it('RED lane: blocks task and pushes persistent notification', () => {
    const result = dispatchManMode(deps, {
      taskId: 'task-004',
      taskLabel: 'Delete production database',
      riskLane: 'RED',
    });

    expect(result).toEqual({ action: 'blocked', lane: 'RED' });
    expect(toast).not.toHaveBeenCalled();
    expect(pushNotification).toHaveBeenCalledOnce();
    expect(pushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-004',
        title: 'Action Blocked',
        description: 'Delete production database blocked. Approval required.',
        lane: 'RED',
      })
    );
  });

  // ─── BLOCKED LANE (same as RED) ──────────────────────────────────────────────

  it('BLOCKED lane: treated same as RED', () => {
    const result = dispatchManMode(deps, {
      taskId: 'task-005',
      taskLabel: 'Modify FSM states',
      riskLane: 'BLOCKED',
    });

    expect(result).toEqual({ action: 'blocked', lane: 'BLOCKED' });
    expect(pushNotification).toHaveBeenCalledOnce();
    expect(toast).not.toHaveBeenCalled();
  });

  // ─── ISOLATION ───────────────────────────────────────────────────────────────

  it('lanes are isolated: GREEN never triggers toast or notification', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    // Run all three lanes sequentially
    dispatchManMode(deps, { taskId: 'g-1', taskLabel: 'G', riskLane: 'GREEN' });
    dispatchManMode(deps, { taskId: 'y-1', taskLabel: 'Y', riskLane: 'YELLOW' });
    dispatchManMode(deps, { taskId: 'r-1', taskLabel: 'R', riskLane: 'RED' });

    // toast called exactly once (YELLOW only)
    expect(toast).toHaveBeenCalledTimes(1);
    // pushNotification called exactly once (RED only)
    expect(pushNotification).toHaveBeenCalledTimes(1);
    // console.debug called once (GREEN only)
    expect(debugSpy).toHaveBeenCalledTimes(1);

    debugSpy.mockRestore();
  });
});
