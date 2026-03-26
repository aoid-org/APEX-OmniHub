import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseIdempotencyStore } from '../../../src/omnihub-gateway/SupabaseIdempotencyStore';
import type { IdempotencyEntry } from '../../../src/omnihub-gateway/types';

describe('SupabaseIdempotencyStore', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock object shape is dynamic
  let mockSupabase: any;
  let store: SupabaseIdempotencyStore;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    };
    store = new SupabaseIdempotencyStore(mockSupabase);
  });

  describe('get()', () => {
    it('returns undefined if receipt is not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      const result = await store.get('test-key');
      expect(result).toBeUndefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('idempotency_receipts');
      expect(mockSupabase.eq).toHaveBeenCalledWith('idempotency_key', 'test-key');
    });

    it('returns mapped entry if receipt is found and not expired', async () => {
      const futureDate = new Date(Date.now() + 100000).toISOString();
      const dbRecord = {
        idempotency_key: 'test-key',
        tenant_id: 'tenant-123',
        correlation_id: 'corr-123',
        event_type: 'test.event',
        request_payload: { state: 'completed', namespace: 'test', result: { foo: 'bar' } },
        created_at: new Date().toISOString(),
        expires_at: futureDate,
      };

      mockSupabase.single.mockResolvedValueOnce({ data: dbRecord, error: null });
      const result = await store.get('test-key');

      expect(result).toBeDefined();
      expect(result?.key).toBe('test-key');
      expect(result?.state).toBe('completed');
      expect(result?.tenantId).toBe('tenant-123');
      expect(result?.result).toEqual({ foo: 'bar' });
    });

    it('returns undefined and deletes receipt if it is expired', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const dbRecord = {
        idempotency_key: 'test-key',
        // ...
        expires_at: pastDate,
      };

      mockSupabase.single.mockResolvedValueOnce({ data: dbRecord, error: null });
      const result = await store.get('test-key');
      expect(result).toBeUndefined();
      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });

  describe('set()', () => {
    it('inserts a new receipt linking metadata and ttl correctly', async () => {
      const entry: IdempotencyEntry = {
        key: 'test-key',
        namespace: 'test-ns',
        state: 'pending',
        createdAt: new Date().toISOString(),
        ttlMs: 3600000,
        tenantId: 'tenant-123',
        correlationId: 'corr-123',
        eventType: 'test.event',
      };

      mockSupabase.insert.mockResolvedValueOnce({ error: null });
      await store.set('test-key', entry);

      expect(mockSupabase.from).toHaveBeenCalledWith('idempotency_receipts');
      expect(mockSupabase.insert).toHaveBeenCalled();
      // Inspect the object passed to insert
      const insertArgs = mockSupabase.insert.mock.calls[0][0];
      expect(insertArgs.idempotency_key).toBe('test-key');
      expect(insertArgs.tenant_id).toBe('tenant-123');
      expect(insertArgs.correlation_id).toBe('corr-123');
      expect(insertArgs.event_type).toBe('test.event');
      expect(insertArgs.request_payload.state).toBe('pending');
    });

    it('falls back to default tenant/correlation id if missing in entry', async () => {
      const entry: IdempotencyEntry = {
        key: 'test-key',
        namespace: 'test-ns',
        state: 'pending',
        createdAt: new Date().toISOString(),
        ttlMs: 3600000,
      };

      mockSupabase.insert.mockResolvedValueOnce({ error: null });
      await store.set('test-key', entry);

      const insertArgs = mockSupabase.insert.mock.calls[0][0];
      expect(insertArgs.tenant_id).toBe('system');
      expect(insertArgs.correlation_id).toBeDefined();
    });
  });

  describe('delete()', () => {
    it('deletes the receipt and returns true on success', async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      const result = await store.delete('test-key');
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('idempotency_receipts');
    });
  });
});
