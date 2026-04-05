import { describe, it, expect, vi } from 'vitest';
import {
  ManModeController,
  registerDefaultTriggers,
} from '../../../src/omnihub-gateway/middleware/ManMode';
import type { GatewayContext, JsonRpcRequest } from '../../../src/omnihub-gateway/types';

function makeRequest(method = 'tools/call'): JsonRpcRequest {
  return { jsonrpc: '2.0', id: '1', method, params: {} };
}

function makeContext(overrides?: Partial<GatewayContext>): GatewayContext {
  return {
    tenantId: 'tenant-1',
    deviceId: 'device-1',
    trustTier: 'OPERATOR',
    correlationId: 'corr-1',
    idempotencyKey: 'idem-1',
    ...overrides,
  } as GatewayContext;
}

describe('ManModeController', () => {
  describe('shouldTrigger', () => {
    it('returns null when no triggers are registered', () => {
      const controller = new ManModeController();
      const result = controller.shouldTrigger(makeRequest(), 'high');
      expect(result).toBeNull();
    });

    it('returns trigger when method and risk level match', () => {
      const controller = new ManModeController();
      registerDefaultTriggers(controller);
      const result = controller.shouldTrigger(makeRequest('tools/call'), 'high');
      expect(result).not.toBeNull();
      expect(result?.methods).toContain('tools/call');
    });

    it('returns null when risk level is below trigger threshold', () => {
      const controller = new ManModeController();
      registerDefaultTriggers(controller);
      const result = controller.shouldTrigger(makeRequest('tools/call'), 'low');
      expect(result).toBeNull();
    });

    it('matches financial operations at medium risk', () => {
      const controller = new ManModeController();
      registerDefaultTriggers(controller);
      const result = controller.shouldTrigger(makeRequest('payments/execute'), 'medium');
      expect(result).not.toBeNull();
    });

    it('matches destructive operations at low risk', () => {
      const controller = new ManModeController();
      registerDefaultTriggers(controller);
      const result = controller.shouldTrigger(makeRequest('resources/delete'), 'low');
      expect(result).not.toBeNull();
    });
  });

  describe('suspend — fail-closed', () => {
    it('rejects when alert dispatcher returns false', async () => {
      const controller = new ManModeController();
      controller.setAlertDispatcher(vi.fn().mockResolvedValue(false));

      const decision = await controller.suspend(
        makeRequest(),
        makeContext(),
        'high',
        'fail-closed test',
      );

      expect(decision).toBe('rejected');
    });

    it('dispatches alert with correct payload', async () => {
      const dispatcher = vi.fn().mockResolvedValue(false);
      const controller = new ManModeController();
      controller.setAlertDispatcher(dispatcher);

      await controller.suspend(
        makeRequest('payments/execute'),
        makeContext({ tenantId: 't-42' }),
        'critical',
        'payment alert',
      );

      expect(dispatcher).toHaveBeenCalledOnce();
      const alert = dispatcher.mock.calls[0][0];
      expect(alert.method).toBe('payments/execute');
      expect(alert.tenantId).toBe('t-42');
      expect(alert.riskLevel).toBe('critical');
      expect(alert.reason).toBe('payment alert');
      expect(alert.suspensionId).toBeDefined();
      expect(alert.expiresAt).toBeDefined();
    });
  });

  describe('suspend — resolve flow', () => {
    it('resolves with approved when operator approves', async () => {
      const controller = new ManModeController(60_000);
      controller.setAlertDispatcher(vi.fn().mockResolvedValue(true));

      const promise = controller.suspend(
        makeRequest(),
        makeContext(),
        'high',
        'approve test',
      );

      // Must await a microtask so the dispatcher promise resolves
      // and the pending resolver is registered
      await new Promise((r) => setTimeout(r, 10));

      const suspended = controller.listSuspended();
      expect(suspended).toHaveLength(1);

      controller.resolve(suspended[0].suspensionId, 'approved', 'op-1');
      const decision = await promise;
      expect(decision).toBe('approved');
    });

    it('pendingCount decreases after resolve', async () => {
      const controller = new ManModeController(60_000);
      controller.setAlertDispatcher(vi.fn().mockResolvedValue(true));

      const promise = controller.suspend(
        makeRequest(),
        makeContext(),
        'high',
        'count test',
      );

      await new Promise((r) => setTimeout(r, 10));
      expect(controller.pendingCount).toBe(1);

      const id = controller.listSuspended()[0].suspensionId;
      controller.resolve(id, 'rejected', 'op-1');
      await promise;

      expect(controller.pendingCount).toBe(0);
    });
  });

  describe('listResolved', () => {
    it('returns resolved operations', async () => {
      const controller = new ManModeController();
      controller.setAlertDispatcher(vi.fn().mockResolvedValue(false));

      await controller.suspend(makeRequest(), makeContext(), 'high', 'r1');
      await controller.suspend(makeRequest(), makeContext(), 'high', 'r2');

      const resolved = controller.listResolved();
      expect(resolved).toHaveLength(2);
      resolved.forEach((op) => expect(op.decision).toBe('rejected'));
    });
  });

  describe('getSuspension / resolve edge cases', () => {
    it('returns undefined for unknown suspension ID', () => {
      const controller = new ManModeController();
      expect(controller.getSuspension('nonexistent')).toBeUndefined();
    });

    it('returns false when resolving unknown ID', () => {
      const controller = new ManModeController();
      expect(controller.resolve('nonexistent', 'approved', 'op-1')).toBe(false);
    });

    it('getSuspension returns the operation after suspend', async () => {
      const controller = new ManModeController();
      controller.setAlertDispatcher(vi.fn().mockResolvedValue(false));

      await controller.suspend(makeRequest(), makeContext(), 'critical', 'test');

      const resolved = controller.listResolved();
      const op = controller.getSuspension(resolved[0].suspensionId);
      expect(op).toBeDefined();
      expect(op?.riskLevel).toBe('critical');
      expect(op?.decision).toBe('rejected');
      expect(op?.decidedBy).toBe('system:alert-failed');
    });
  });

  describe('registerDefaultTriggers', () => {
    it('registers deployment operation triggers', () => {
      const controller = new ManModeController();
      registerDefaultTriggers(controller);
      expect(controller.shouldTrigger(makeRequest('deploy/production'), 'medium')).not.toBeNull();
      expect(controller.shouldTrigger(makeRequest('migrations/execute'), 'medium')).not.toBeNull();
    });

    it('does not trigger for unknown methods', () => {
      const controller = new ManModeController();
      registerDefaultTriggers(controller);
      expect(controller.shouldTrigger(makeRequest('unknown/method'), 'critical')).toBeNull();
    });
  });
});
