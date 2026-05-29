import { describe, it, expect, beforeEach } from 'vitest';
import { withSpan, getCollectedSpans, clearCollectedSpans } from '../../src/lib/telemetry/tracer';
import { logAuditEvent, getAuditLedger, clearAuditLedgerForTests } from '../../src/lib/telemetry/audit';
import { getSystemHealth } from '../../src/lib/telemetry/health';

describe('APEX-OmniHub Observability & Audit', () => {

  beforeEach(() => {
    clearCollectedSpans();
    clearAuditLedgerForTests();
  });

  describe('Tracing Engine', () => {
    it('creates spans with redacted PII and safe attributes', async () => {
      await withSpan({
        tenantId: 'tenant-123456789',
        actorId: 'user-987654321',
        action: 'query_data',
        module: 'SupabaseDB',
        stateKind: 'QUERY',
      }, async (span) => {
        expect(span.attributes.tenantId).toBe('redacted-tenant-1...');
        expect(span.attributes.actorId).toBe('redacted-user-987...');
        expect(span.attributes.action).toBe('query_data');
      });

      const spans = getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].status).toBe('OK');
      expect(spans[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it('captures errors gracefully', async () => {
      await expect(withSpan({
        action: 'fail_test',
        module: 'EdgeRequest',
        stateKind: 'MUTATION'
      }, async () => {
        throw new Error('Simulated failure');
      })).rejects.toThrow('Simulated failure');

      const spans = getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].status).toBe('ERROR');
      expect(spans[0].error?.message).toBe('Simulated failure');
    });
  });

  describe('Audit Ledger', () => {
    it('appends events securely with redacted metadata', () => {
      logAuditEvent(
        'admin-user',
        'acme-tenant',
        'UPDATE_POLICY',
        'resource:web3:contract',
        'SUCCESS',
        'Policy updated by admin',
        {
          someConfig: 'public_value',
          userToken: 'secret_jwt_token_123',
          apiKey: 'super_secret_key'
        }
      );

      const ledger = getAuditLedger();
      expect(ledger).toHaveLength(1);
      expect(ledger[0].actorId).toBe('redacted-admin-us...');
      expect(ledger[0].metadata?.someConfig).toBe('public_value');
      expect(ledger[0].metadata?.userToken).toBe('[REDACTED]');
      expect(ledger[0].metadata?.apiKey).toBe('[REDACTED]');
    });
  });

  describe('System Health Reporter', () => {
    it('returns structured subsystem statuses', () => {
      const health = getSystemHealth();
      
      expect(health.timestamp).toBeDefined();
      expect(health.subsystems).toHaveProperty('SupabaseDB');
      expect(health.subsystems).toHaveProperty('Web3');
      
      // Since we hardcoded Web3 as unavailable, overall should be degraded
      expect(health.overall).toBe('degraded');
    });
  });

});
