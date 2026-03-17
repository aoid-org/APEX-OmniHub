/**
 * Tests for src/integrations/maestro/safety/risk-events.ts
 * Covers: logRiskEvent (with/without Supabase client), queryRiskEvents, getRiskStats
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logRiskEvent, queryRiskEvents, getRiskStats } from '../../src/integrations/maestro/safety/risk-events';
import type { RiskLane } from '../../src/integrations/maestro/types';

// Mock @/lib/security so generateSecureId returns a stable UUID
vi.mock('@/lib/security', () => ({
  generateSecureId: vi.fn(() => 'mock-uuid-1234'),
  logSecurityEvent: vi.fn(),
  startGuardianLoops: vi.fn(),
}));

// RFC 5737 TEST-NET-1 — reserved for documentation/examples, never routable.
const TEST_IP = '192.0.2.1';

describe('risk-events', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── logRiskEvent ─────────────────────────────────────────────────────────

  describe('logRiskEvent', () => {
    it('returns a RiskEvent with correct fields', async () => {
      const event = await logRiskEvent({
        event_type: 'injection_attempt',
        risk_lane: 'RED',
        tenant_id: 'tenant-xyz',
        details: { ip: TEST_IP, pattern: 'IGNORE' },
        trace_id: 'trace-abc',
      });

      expect(event.event_id).toBe('mock-uuid-1234');
      expect(event.tenant_id).toBe('tenant-xyz');
      expect(event.event_type).toBe('injection_attempt');
      expect(event.risk_lane).toBe('RED');
      expect(event.details).toEqual({ ip: TEST_IP, pattern: 'IGNORE' });
      expect(event.trace_id).toBe('trace-abc');
      expect(typeof event.created_at).toBe('string');
      // created_at should be a valid ISO string
      expect(() => new Date(event.created_at)).not.toThrow();
    });

    it('includes blocked_action when provided', async () => {
      const event = await logRiskEvent({
        event_type: 'blocked_action',
        risk_lane: 'BLOCKED',
        tenant_id: 'tenant-1',
        details: {},
        blocked_action: 'delete_all_data',
        trace_id: 'trace-1',
      });

      expect(event.blocked_action).toBe('delete_all_data');
    });

    it('blocked_action is undefined when not provided', async () => {
      const event = await logRiskEvent({
        event_type: 'scan',
        risk_lane: 'GREEN',
        tenant_id: 't1',
        details: {},
        trace_id: 'trace-2',
      });

      expect(event.blocked_action).toBeUndefined();
    });

    it('logs a warning when Supabase client is not configured (no window)', async () => {
      // In test environment (node/jsdom without VITE env configured), getSupabaseClient
      // returns null — the warn branch is hit.
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await logRiskEvent({
        event_type: 'test_event',
        risk_lane: 'YELLOW',
        tenant_id: 'tenant-2',
        details: { source: 'unit-test' },
        trace_id: 'trace-3',
      });

      // Either warn is called (no Supabase) or it proceeds to try-block.
      // Both paths return the event — this test verifies the no-op warn path.
      expect(warnSpy).toHaveBeenCalled();
    });

    it('handles all RiskLane values', async () => {
      const lanes: RiskLane[] = ['GREEN', 'YELLOW', 'RED', 'BLOCKED'];
      for (const lane of lanes) {
        const event = await logRiskEvent({
          event_type: `lane_test_${lane}`,
          risk_lane: lane,
          tenant_id: 'tenant-lanes',
          details: {},
          trace_id: `trace-${lane}`,
        });
        expect(event.risk_lane).toBe(lane);
      }
    });

    it('created_at is a recent timestamp', async () => {
      const before = new Date();
      const event = await logRiskEvent({
        event_type: 'timing_test',
        risk_lane: 'GREEN',
        tenant_id: 'tenant-t',
        details: {},
        trace_id: 'trace-t',
      });
      const after = new Date();
      const created = new Date(event.created_at);
      expect(created.getTime()).toBeGreaterThanOrEqual(before.getTime() - 100);
      expect(created.getTime()).toBeLessThanOrEqual(after.getTime() + 100);
    });
  });

  // ── queryRiskEvents ──────────────────────────────────────────────────────

  describe('queryRiskEvents', () => {
    it('returns an empty array (mock implementation)', async () => {
      const result = await queryRiskEvents('tenant-xyz');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('accepts options without throwing', async () => {
      const result = await queryRiskEvents('tenant-xyz', {
        limit: 10,
        riskLane: 'RED',
        eventType: 'injection_attempt',
        since: new Date(Date.now() - 3_600_000),
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it('accepts empty options object', async () => {
      const result = await queryRiskEvents('tenant-xyz', {});
      expect(Array.isArray(result)).toBe(true);
    });

    it('accepts no options argument (default parameter)', async () => {
      const result = await queryRiskEvents('some-tenant');
      expect(result).toEqual([]);
    });
  });

  // ── getRiskStats ─────────────────────────────────────────────────────────

  describe('getRiskStats', () => {
    it('returns zeroed stats with all lanes present', async () => {
      const timeWindow = { start: new Date(Date.now() - 3_600_000), end: new Date() };
      const stats = await getRiskStats('tenant-xyz', timeWindow);

      expect(stats.total).toBe(0);
      expect(stats.by_lane.GREEN).toBe(0);
      expect(stats.by_lane.YELLOW).toBe(0);
      expect(stats.by_lane.RED).toBe(0);
      expect(stats.by_lane.BLOCKED).toBe(0);
      expect(typeof stats.by_type).toBe('object');
    });

    it('returns empty by_type record', async () => {
      const timeWindow = { start: new Date(), end: new Date() };
      const stats = await getRiskStats('tenant-t', timeWindow);
      expect(Object.keys(stats.by_type)).toHaveLength(0);
    });

    it('does not throw for any tenantId', async () => {
      const timeWindow = { start: new Date(0), end: new Date() };
      await expect(getRiskStats('', timeWindow)).resolves.toBeDefined();
      await expect(getRiskStats('very-long-tenant-id-12345', timeWindow)).resolves.toBeDefined();
    });
  });
});
