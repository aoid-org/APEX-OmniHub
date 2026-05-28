/**
 * Universal Synchronized Orchestrator (USO) - Engine
 * 
 * Purpose: Normalize inputs from various rails (API, Webhook, Legacy Batch)
 * into the Canonical Sync Envelope, handling idempotency and conflicts.
 * 
 * Author: OmniLink APEX
 * Date: 2026-05-28
 */

import { SyncStatus, UniversalSyncEnvelope, SyncOperation } from '../types/sync';
import { logSecurityEvent } from '../../lib/monitoring';

export interface SyncAdapter<TRaw = unknown, TNormalized = unknown> {
  sourceSystem: string;
  normalize(raw: TRaw): UniversalSyncEnvelope<TNormalized>;
  apply(envelope: UniversalSyncEnvelope<TNormalized>): Promise<SyncStatus>;
}

// In-memory store for idempotency and conflict resolution in this proof rail
const proofStateStore = new Map<string, { version: number, data: unknown }>();
const idempotencyStore = new Set<string>();

export class UniversalSyncEngine {
  constructor(private adapters: Map<string, SyncAdapter> = new Map()) {}

  registerAdapter(sourceSystem: string, adapter: SyncAdapter) {
    this.adapters.set(sourceSystem, adapter);
  }

  async process<TRaw, TNormalized>(
    sourceSystem: string,
    rawPayload: TRaw
  ): Promise<UniversalSyncEnvelope<TNormalized>> {
    const adapter = this.adapters.get(sourceSystem) as SyncAdapter<TRaw, TNormalized>;
    
    if (!adapter) {
      throw new Error(`No adapter registered for source: ${sourceSystem}`);
    }

    const envelope = adapter.normalize(rawPayload);

    // 1. Idempotency Check
    if (idempotencyStore.has(envelope.idempotencyKey)) {
      envelope.syncStatus = SyncStatus.DUPLICATE;
      await this.audit(envelope);
      return envelope;
    }

    // 2. Tenant Isolation & Policy Check (Simulated for Proof Rail)
    if (!envelope.tenantId) {
      envelope.syncStatus = SyncStatus.REJECTED;
      envelope.policyResult = { allowed: false, reason: 'Missing tenant isolation' };
      await this.audit(envelope);
      return envelope;
    }

    envelope.policyResult = { allowed: true };

    // 3. Conflict Resolution Check (Basic timestamp/version logic)
    // If the record exists and this payload is somehow structurally older, conflict.
    // For this proof rail, we just accept or simulate conflict based on operation.
    const recordKey = `${envelope.tenantId}:${envelope.objectType}`;
    const existing = proofStateStore.get(recordKey);
    
    if (existing && envelope.operation === SyncOperation.CREATE) {
      envelope.syncStatus = SyncStatus.CONFLICT_PENDING_REVIEW;
      await this.audit(envelope);
      return envelope;
    }

    // 4. Apply via Adapter
    try {
      envelope.syncStatus = await adapter.apply(envelope);
      
      if (envelope.syncStatus === SyncStatus.APPLIED) {
        idempotencyStore.add(envelope.idempotencyKey);
        proofStateStore.set(recordKey, { version: existing ? existing.version + 1 : 1, data: envelope.afterPayload });
      }
    } catch (e) {
      envelope.syncStatus = SyncStatus.FAILED_RETRYABLE;
    }

    // 5. Audit Logging
    await this.audit(envelope);

    return envelope;
  }

  private async audit(envelope: UniversalSyncEnvelope) {
    envelope.auditId = `sync-audit-${Date.now()}`;
    await logSecurityEvent('universal_sync_processed', {
      source: envelope.sourceSystem,
      tenantId: envelope.tenantId,
      status: envelope.syncStatus,
      idempotencyKey: envelope.idempotencyKey
    });
  }
}

// ----------------------------------------------------------------------------
// Low-Risk Proof Rail: Legacy CSV Bulk Import
// ----------------------------------------------------------------------------

export interface LegacyCsvRow {
  external_id: string;
  tenant_ref: string;
  user_email: string;
  action: string;
  data: string;
  sync_id: string;
}

export class LegacyCsvSyncAdapter implements SyncAdapter<LegacyCsvRow, Record<string, string>> {
  sourceSystem = 'legacy-csv-import';

  normalize(raw: LegacyCsvRow): UniversalSyncEnvelope<Record<string, string>> {
    let op = SyncOperation.UPDATE;
    if (raw.action === 'ADD') op = SyncOperation.CREATE;
    if (raw.action === 'REMOVE') op = SyncOperation.DELETE;

    return {
      sourceSystem: this.sourceSystem,
      tenantId: raw.tenant_ref,
      actorId: raw.user_email,
      objectType: 'historical_record',
      operation: op,
      afterPayload: { data: raw.data, external_id: raw.external_id },
      causalTraceId: `csv-import-${raw.sync_id}`,
      idempotencyKey: raw.sync_id,
      syncStatus: SyncStatus.ACCEPTED,
      timestamp: new Date().toISOString(),
    };
  }

  async apply(envelope: UniversalSyncEnvelope<Record<string, string>>): Promise<SyncStatus> {
    if (envelope.afterPayload?.data === 'MALFORMED') {
      return SyncStatus.FAILED_TERMINAL;
    }
    return SyncStatus.APPLIED;
  }
}
