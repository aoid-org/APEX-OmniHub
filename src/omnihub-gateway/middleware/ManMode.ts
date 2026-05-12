/**
 * ManMode — Manual Approval Node (MAN Mode) State Suspension
 * @version 1.0.0
 * @module src/omnihub-gateway/middleware/ManMode
 *
 * MAN Mode (Manual Approval Node) is APEX's state suspension protocol
 * for high-stakes operations. When activated, it:
 *
 *   1. **Suspends** the current workflow/task state
 *   2. **Alerts** designated human operators via configured channels
 *   3. **Blocks** execution until Manual Approval Node approval or rejection
 *   4. **Resumes** or **aborts** based on operator decision
 *
 * Integration:
 * - Triggered by TriforceGuardian when risk level exceeds threshold
 * - Integrates with Temporal for workflow state suspension
 * - SSE channel for real-time MAN Mode alert delivery
 *
 * APEX STANDARDS ENFORCED:
 * - Fail-closed: If MAN Mode alert cannot be delivered, operation is denied
 * - Auditable: All suspensions and resolutions are logged
 * - Timeout: Suspended operations auto-deny after configurable timeout
 * - Non-blocking to gateway: Suspension is async; other requests continue
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { GatewayContext, JsonRpcRequest } from '../types';

// ============================================================================
// Types
// ============================================================================

export type ManModeDecision = 'approved' | 'rejected' | 'timeout';

export type ManModeRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ManModeTrigger {
  /** JSON-RPC methods that trigger MAN Mode */
  readonly methods: readonly string[];
  /** Minimum risk level to trigger */
  readonly minRiskLevel: ManModeRiskLevel;
  /** Description of why this trigger exists */
  readonly reason: string;
}

export interface SuspendedOperation {
  readonly suspensionId: string;
  readonly request: JsonRpcRequest;
  readonly context: GatewayContext;
  readonly riskLevel: ManModeRiskLevel;
  readonly reason: string;
  readonly suspendedAt: string;
  readonly timeoutMs: number;
  readonly decision?: ManModeDecision;
  readonly decidedAt?: string;
  readonly decidedBy?: string;
}

export interface ManModeAlert {
  readonly suspensionId: string;
  readonly method: string;
  readonly riskLevel: ManModeRiskLevel;
  readonly reason: string;
  readonly tenantId: string;
  readonly deviceId: string;
  readonly params: Record<string, unknown>;
  readonly suspendedAt: string;
  readonly expiresAt: string;
}

/**
 * Callback invoked when a MAN Mode alert needs to be delivered.
 * Implementation should push to SSE channel, Slack, email, etc.
 */
export type AlertDispatcher = (alert: ManModeAlert) => Promise<boolean>;

// ============================================================================
// MAN Mode Controller
// ============================================================================

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const RISK_RANK: Record<ManModeRiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/** Maximum number of resolved operations retained for audit trail. */
const MAX_RESOLVED_HISTORY = 500;

export class ManModeController {
  private readonly triggers: ManModeTrigger[] = [];
  private readonly suspended = new Map<string, SuspendedOperation>();
  private readonly pendingResolvers = new Map<string, {
    resolve: (decision: ManModeDecision) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private alertDispatcher: AlertDispatcher | null = null;
  private readonly defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = DEFAULT_TIMEOUT_MS) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Set the alert dispatcher for MAN Mode notifications.
   */
  setAlertDispatcher(dispatcher: AlertDispatcher): void {
    this.alertDispatcher = dispatcher;
  }

  /**
   * Register a trigger rule for MAN Mode activation.
   */
  addTrigger(trigger: ManModeTrigger): void {
    this.triggers.push(trigger);
  }

  /**
   * Check if a request should trigger MAN Mode.
   * Returns the matched trigger or null.
   */
  shouldTrigger(
    request: JsonRpcRequest,
    riskLevel: ManModeRiskLevel = 'medium',
  ): ManModeTrigger | null {
    for (const trigger of this.triggers) {
      if (
        trigger.methods.includes(request.method) &&
        RISK_RANK[riskLevel] >= RISK_RANK[trigger.minRiskLevel]
      ) {
        return trigger;
      }
    }
    return null;
  }

  /**
   * Suspend an operation and wait for Manual Approval Node decision.
   *
   * Flow:
   * 1. Create suspension record
   * 2. Dispatch MAN Mode alert
   * 3. Return a Promise that resolves when operator decides (or timeout)
   */
  async suspend(
    request: JsonRpcRequest,
    context: GatewayContext,
    riskLevel: ManModeRiskLevel,
    reason: string,
  ): Promise<ManModeDecision> {
    const suspensionId = `man-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const suspendedAt = new Date().toISOString();
    const timeoutMs = this.defaultTimeoutMs;

    const operation: SuspendedOperation = {
      suspensionId,
      request,
      context,
      riskLevel,
      reason,
      suspendedAt,
      timeoutMs,
    };

    this.suspended.set(suspensionId, operation);

    // Dispatch alert
    const alert: ManModeAlert = {
      suspensionId,
      method: request.method,
      riskLevel,
      reason,
      tenantId: context.tenantId,
      deviceId: context.deviceId,
      params: request.params ?? {},
      suspendedAt,
      expiresAt: new Date(Date.now() + timeoutMs).toISOString(),
    };

    if (this.alertDispatcher) {
      const delivered = await this.alertDispatcher(alert);
      if (!delivered) {
        // Fail-closed: alert not delivered → deny
        this.resolveInternal(suspensionId, 'rejected', 'system:alert-failed');
        return 'rejected';
      }
    }

    // Wait for Manual Approval Node decision or timeout
    return new Promise<ManModeDecision>((resolve) => {
      // Auto-timeout timer — cleaned up on resolve to prevent resource leaks
      const timer = setTimeout(() => {
        if (this.pendingResolvers.has(suspensionId)) {
          this.resolveInternal(suspensionId, 'timeout', 'system:timeout');
          resolve('timeout');
        }
      }, timeoutMs);

      this.pendingResolvers.set(suspensionId, { resolve, timer });
    });
  }

  /**
   * Resolve a suspended operation with a Manual Approval Node decision.
   * Called by the MAN Mode UI or API when an operator makes a decision.
   */
  resolve(suspensionId: string, decision: 'approved' | 'rejected', decidedBy: string): boolean {
    return this.resolveInternal(suspensionId, decision, decidedBy);
  }

  /**
   * Get a suspended operation by ID.
   */
  getSuspension(suspensionId: string): SuspendedOperation | undefined {
    return this.suspended.get(suspensionId);
  }

  /**
   * List all currently suspended operations.
   */
  listSuspended(): SuspendedOperation[] {
    return Array.from(this.suspended.values()).filter((op) => !op.decision);
  }

  /**
   * List all resolved operations (for audit trail).
   */
  listResolved(): SuspendedOperation[] {
    return Array.from(this.suspended.values()).filter((op) => !!op.decision);
  }

  /**
   * Get count of pending suspensions.
   */
  get pendingCount(): number {
    return this.pendingResolvers.size;
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private resolveInternal(
    suspensionId: string,
    decision: ManModeDecision,
    decidedBy: string,
  ): boolean {
    const operation = this.suspended.get(suspensionId);
    if (!operation) return false;

    // Update record
    this.suspended.set(suspensionId, {
      ...operation,
      decision,
      decidedAt: new Date().toISOString(),
      decidedBy,
    });

    // Clear the timeout timer and resolve the pending promise
    const resolver = this.pendingResolvers.get(suspensionId);
    if (resolver) {
      clearTimeout(resolver.timer);
      resolver.resolve(decision);
      this.pendingResolvers.delete(suspensionId);
    }

    // Prune resolved operations to prevent unbounded memory growth
    this.pruneResolved();

    return true;
  }

  /**
   * Evict oldest resolved operations when history exceeds limit.
   */
  private pruneResolved(): void {
    const resolved = Array.from(this.suspended.entries())
      .filter(([, op]) => op.decision !== undefined);

    if (resolved.length <= MAX_RESOLVED_HISTORY) return;

    // Sort by decidedAt ascending — oldest first
    resolved.sort((a, b) =>
      (a[1].decidedAt ?? '').localeCompare(b[1].decidedAt ?? ''),
    );

    const toRemove = resolved.length - MAX_RESOLVED_HISTORY;
    for (let i = 0; i < toRemove; i++) {
      this.suspended.delete(resolved[i][0]);
    }
  }
}

// ============================================================================
// Default Triggers (High-Stakes Operations)
// ============================================================================

/**
 * Register default MAN Mode triggers for common high-stakes operations.
 */
export function registerDefaultTriggers(controller: ManModeController): void {
  controller.addTrigger({
    methods: ['tools/call'],
    minRiskLevel: 'high',
    reason: 'Tool execution with high risk level requires Manual Approval Node approval',
  });

  controller.addTrigger({
    methods: ['tasks/send'],
    minRiskLevel: 'critical',
    reason: 'Critical A2A task dispatch requires Manual Approval Node approval',
  });

  // Financial operations
  controller.addTrigger({
    methods: ['payments/execute', 'invoices/create', 'subscriptions/modify'],
    minRiskLevel: 'medium',
    reason: 'Financial operations require Manual Approval Node approval',
  });

  // Destructive operations
  controller.addTrigger({
    methods: ['resources/delete', 'data/purge', 'agents/deregister'],
    minRiskLevel: 'low',
    reason: 'Destructive operations always require Manual Approval Node approval',
  });

  // Deployment operations
  controller.addTrigger({
    methods: ['deploy/production', 'migrations/execute'],
    minRiskLevel: 'medium',
    reason: 'Production deployments and migrations require Manual Approval Node approval',
  });
}
