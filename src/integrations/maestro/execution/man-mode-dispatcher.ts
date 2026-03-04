/**
 * MAN Mode Risk Lane Dispatcher
 *
 * Routes tasks through GREEN / YELLOW / RED lanes with isolated side effects.
 * One lane must never affect another.
 *
 * GREEN  → execute; console.debug only; no UI notification.
 * YELLOW → toast with "Action Flagged" title; auto-continue if enabled, else hold.
 * RED    → isolate affected task; push persistent notification-center entry.
 *
 * @module integrations/maestro/execution/man-mode-dispatcher
 */

import type { RiskLane } from '../types';

/** Minimal toast interface matching src/components/ui/use-toast */
export type ToastFn = (
  opts: { title: string; description: string; variant?: string },
) => void;

/** Notification push interface matching NotificationCenter */
export type NotificationPushFn = (
  notification: {
    id: string;
    taskId: string;
    title: string;
    description: string;
    lane: 'RED';
  },
) => void;

export interface ManModeDispatcherDeps {
  readonly toast: ToastFn;
  readonly pushNotification: NotificationPushFn;
}

export interface DispatchOptions {
  readonly taskId: string;
  readonly taskLabel: string;
  readonly riskLane: RiskLane;
  readonly autoContineEnabled?: boolean;
}

export interface DispatchResult {
  readonly action: 'execute' | 'hold' | 'blocked';
  readonly lane: RiskLane;
}

/**
 * Dispatch a task through the MAN Mode risk lanes.
 *
 * Deterministic: same inputs always produce same outputs.
 * No side effects leak between lanes.
 */
/**
 * Push a blocking notification for RED-tier risk events.
 * Extracted to avoid near-identical pushNotification blocks
 * across RED, BLOCKED, and default cases (SonarCloud dedup).
 */
function blockTask(
  pushNotification: NotificationPushFn,
  taskId: string,
  taskLabel: string,
  description: string,
): void {
  pushNotification({
    id: `man-${taskId}-${Date.now()}`,
    taskId,
    title: 'Action Blocked',
    description,
    lane: 'RED',
  });
}

export function dispatchManMode(
  deps: ManModeDispatcherDeps,
  options: DispatchOptions
): DispatchResult {
  const { toast, pushNotification } = deps;
  const { taskId, taskLabel, riskLane, autoContineEnabled } = options;

  switch (riskLane) {
    case 'GREEN': {
      // GREEN → execute; console.debug only; no UI notification
      // eslint-disable-next-line no-console -- Intentional debug-only log for GREEN lane
      console.debug(`[MAN-MODE] GREEN lane: executing "${taskLabel}" (${taskId})`);
      return { action: 'execute', lane: 'GREEN' };
    }

    case 'YELLOW': {
      // YELLOW → toast with title: "Action Flagged"
      toast({
        title: 'Action Flagged',
        description: `${taskLabel} requires review.`,
      });

      if (autoContineEnabled) {
        return { action: 'execute', lane: 'YELLOW' };
      }
      return { action: 'hold', lane: 'YELLOW' };
    }

    case 'RED': {
      blockTask(pushNotification, taskId, taskLabel, `${taskLabel} blocked. Approval required.`);
      return { action: 'blocked', lane: 'RED' };
    }

    case 'BLOCKED': {
      blockTask(pushNotification, taskId, taskLabel, `${taskLabel} blocked. Approval required.`);
      return { action: 'blocked', lane: 'BLOCKED' };
    }

    default: {
      // Fail-closed: unknown lanes are treated as RED
      blockTask(pushNotification, taskId, taskLabel, `${taskLabel} blocked. Unknown risk lane.`);
      return { action: 'blocked', lane: riskLane };
    }
  }
}
