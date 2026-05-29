import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UniversalSyncEngine, LegacyCsvSyncAdapter, LegacyCsvRow } from '../../src/omniconnect/sync/UniversalSync';
import { SyncStatus, SyncOperation } from '../../src/omniconnect/types/sync';
import * as monitoring from '../../src/lib/monitoring';

vi.mock('../../src/lib/monitoring', () => ({
  logSecurityEvent: vi.fn(),
}));

describe('Universal Synchronized Orchestrator', () => {
  let engine: UniversalSyncEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new UniversalSyncEngine();
    engine.registerAdapter('legacy-csv-import', new LegacyCsvSyncAdapter());
  });

  const validRow: LegacyCsvRow = {
    external_id: 'ext-123',
    tenant_ref: 'tenant-abc',
    user_email: 'actor@test.com',
    action: 'ADD',
    data: 'valid data',
    sync_id: 'sync-req-1',
  };

  it('successfully applies a valid record', async () => {
    const result = await engine.process('legacy-csv-import', validRow);
    expect(result.syncStatus).toBe(SyncStatus.APPLIED);
    expect(result.operation).toBe(SyncOperation.CREATE);
    expect(monitoring.logSecurityEvent).toHaveBeenCalledWith(
      'universal_sync_processed',
      expect.objectContaining({ status: SyncStatus.APPLIED })
    );
  });

  it('rejects duplicate idempotency keys', async () => {
    await engine.process('legacy-csv-import', validRow);
    
    // Send exact same sync_id again
    const duplicate = await engine.process('legacy-csv-import', validRow);
    expect(duplicate.syncStatus).toBe(SyncStatus.DUPLICATE);
  });

  it('detects conflicts on create if record already exists', async () => {
    // Requires a different idempotency key but same tenant/object
    const firstRow = { ...validRow, sync_id: 'sync-req-10' };
    const secondRow = { ...validRow, sync_id: 'sync-req-11' };

    await engine.process('legacy-csv-import', firstRow);
    
    // Attempt to CREATE again for same tenant/object
    const conflict = await engine.process('legacy-csv-import', secondRow);
    expect(conflict.syncStatus).toBe(SyncStatus.CONFLICT_PENDING_REVIEW);
  });

  it('rejects malformed payloads gracefully (terminal failure)', async () => {
    const malformedRow = { ...validRow, action: 'UPDATE', data: 'MALFORMED', sync_id: 'sync-req-99' };
    const result = await engine.process('legacy-csv-import', malformedRow);
    
    expect(result.syncStatus).toBe(SyncStatus.FAILED_TERMINAL);
  });

  it('enforces tenant isolation', async () => {
    const noTenantRow = { ...validRow, tenant_ref: '', sync_id: 'sync-req-100' };
    const result = await engine.process('legacy-csv-import', noTenantRow);
    
    expect(result.syncStatus).toBe(SyncStatus.REJECTED);
    expect(result.policyResult?.allowed).toBe(false);
  });
});
