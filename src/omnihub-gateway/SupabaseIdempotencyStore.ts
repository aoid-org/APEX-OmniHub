/**
 * SupabaseIdempotencyStore — Database-backed Idempotency Storage
 * @version 1.0.0
 * @module src/omnihub-gateway/SupabaseIdempotencyStore
 *
 * Implements the IdempotencyStore interface using Supabase to enable
 * cross-instance deduplication and process survival.
 *
 * APEX STANDARDS ENFORCED:
 * - Fail-closed: Missing metadata defaults to internal constants.
 * - TTL-bounded: Relies on pg_cron or runtime cleanup for expired receipts.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdempotencyEntry } from './types';
import type { IdempotencyStore } from './IdempotencyManager';

export class SupabaseIdempotencyStore implements IdempotencyStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async get(key: string): Promise<IdempotencyEntry | undefined> {
    const { data, error } = await this.supabase
      .from('idempotency_receipts')
      .select('*')
      .eq('idempotency_key', key)
      .single();

    if (error || !data) {
      // PGRST116 is Supabase error for "No rows found"
      return undefined;
    }

    // Check TTL expiration at runtime (defense-in-depth)
    const expiresAt = new Date(data.expires_at).getTime();
    if (Date.now() > expiresAt) {
      await this.delete(key);
      return undefined;
    }

    return {
      key: data.idempotency_key,
      namespace: data.request_payload?.namespace || 'unknown',
      state: data.request_payload?.state || 'pending',
      createdAt: data.created_at,
      completedAt: data.updated_at,
      result: data.request_payload?.result,
      ttlMs: data.request_payload?.ttlMs || 86400000,
      tenantId: data.tenant_id,
      correlationId: data.correlation_id,
      eventType: data.event_type,
    };
  }

  async set(key: string, entry: IdempotencyEntry): Promise<void> {
    const tenantId = entry.tenantId || 'system';
    const correlationId = entry.correlationId || `corr-${key}`;
    const eventType = entry.eventType || 'system.internal';
    const expiresAt = new Date(Date.now() + entry.ttlMs).toISOString();

    const record = {
      idempotency_key: key,
      tenant_id: tenantId,
      correlation_id: correlationId,
      event_type: eventType,
      request_payload: {
        namespace: entry.namespace,
        state: entry.state,
        result: entry.result,
        ttlMs: entry.ttlMs,
      },
      attempt_count: 1,
      expires_at: expiresAt,
    };

    // Upsert to handle state transitions and prevent duplicate-key errors
    const { error } = await this.supabase
      .from('idempotency_receipts')
      .upsert(record, { onConflict: 'idempotency_key' });

    if (error) {
      throw new Error(`Idempotency upsert failed: ${error.message}`);
    }
  }

  async delete(key: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('idempotency_receipts')
      .delete()
      .eq('idempotency_key', key);

    return !error;
  }
}
