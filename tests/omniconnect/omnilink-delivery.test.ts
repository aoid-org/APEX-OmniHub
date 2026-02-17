import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OmniLinkDelivery } from '@/omniconnect/delivery/omnilink-delivery';
import { requestOmniLink } from '@/integrations/omnilink';
import { waitWithBackoff } from '@/lib/backoff';
import { TranslatedEvent } from '@/omniconnect/translation/translator';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/omnilink', () => ({
  requestOmniLink: vi.fn(),
}));

vi.mock('@/lib/backoff', () => ({
  waitWithBackoff: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('OmniLinkDelivery', () => {
  let delivery: OmniLinkDelivery;

  const mockEvent: TranslatedEvent = {
    eventId: 'evt-1',
    correlationId: 'corr-1',
    appId: 'test-app',
    userId: 'user-1',
    payload: { foo: 'bar' },
    metadata: { risk_lane: 'RED' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delivery = new OmniLinkDelivery();

    // Mock Supabase DLQ insertion
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any).mockReturnValue({ insert: mockInsert });
  });

  describe('Retry Logic', () => {
    it('should succeed on the first attempt', async () => {
      vi.mocked(requestOmniLink).mockResolvedValueOnce({ success: true });

      await delivery.deliverBatch([mockEvent], 'test-app', 'corr-1');

      expect(requestOmniLink).toHaveBeenCalledTimes(1);
      expect(waitWithBackoff).not.toHaveBeenCalled();
    });

    it('should retry on failure and succeed eventually', async () => {
      // Fail twice, then succeed
      vi.mocked(requestOmniLink)
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
        .mockResolvedValueOnce({ success: true });

      await delivery.deliverBatch([mockEvent], 'test-app', 'corr-1');

      // Should be called 3 times total
      expect(requestOmniLink).toHaveBeenCalledTimes(3);

      // Should wait twice
      expect(waitWithBackoff).toHaveBeenCalledTimes(2);
      // Verify backoff calls
      expect(waitWithBackoff).toHaveBeenNthCalledWith(1, 1, { baseMs: 1000 });
      expect(waitWithBackoff).toHaveBeenNthCalledWith(2, 2, { baseMs: 1000 });
    });

    it('should exhaust retries and fail', async () => {
      // Fail 3 times (maxRetries is 3 by default)
      vi.mocked(requestOmniLink).mockRejectedValue(new Error('Persistent error'));

      // deliverBatch catches the error and logs to DLQ, so it won't throw
      // But we can verify it tried 3 times
      await delivery.deliverBatch([mockEvent], 'test-app', 'corr-1');

      expect(requestOmniLink).toHaveBeenCalledTimes(3);
      expect(waitWithBackoff).toHaveBeenCalledTimes(2); // Wait after 1st and 2nd attempt
    });
  });

  describe('DLQ Integration', () => {
    it('should insert into DLQ on delivery failure', async () => {
      // Ensure failure for all retries
      vi.mocked(requestOmniLink).mockRejectedValue(new Error('Network error'));

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from as any).mockImplementation(mockFrom);

      await delivery.deliverBatch([mockEvent], 'test-app', 'corr-1');

      // Verify DLQ insertion after all retries fail
      expect(mockFrom).toHaveBeenCalledWith('ingress_buffer');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        correlation_id: 'corr-1',
        raw_input: JSON.stringify(mockEvent),
        error_reason: 'Network error',
        status: 'pending',
        risk_score: 100,
        source_type: 'omnilink_delivery_failure',
        user_id: 'user-1',
      }));
    });
  });

  describe('retryFailedDeliveries', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSupabaseDLQ = (failedEvents: any[], error: any = null) => {
      const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockEq = vi.fn().mockReturnThis();
      const mockSelectChain = {
        eq: mockEq,
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: failedEvents, error })
      };

      const mockFrom = vi.fn().mockImplementation((table) => {
        if (table === 'ingress_buffer') {
          return {
            select: vi.fn().mockReturnValue(mockSelectChain),
            update: mockUpdate,
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return {};
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from as any).mockImplementation(mockFrom);

      return { mockUpdate, mockEq };
    };

    it('should retry pending events and mark as processed on success', async () => {
      const mockDLQEntry = {
        id: 'dlq-1',
        raw_input: JSON.stringify(mockEvent),
        status: 'pending',
        retry_count: 0
      };

      const { mockUpdate } = mockSupabaseDLQ([mockDLQEntry]);

      // Mock successful delivery
      vi.mocked(requestOmniLink).mockResolvedValue({ success: true });

      const count = await delivery.retryFailedDeliveries('test-app');

      expect(count).toBe(1);
      expect(requestOmniLink).toHaveBeenCalled();
      // Verify update status to failed (as temporary workaround for missing 'processed' status)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed'
      }));
    });

    it('should increment retry_count on failure', async () => {
      const mockDLQEntry = {
        id: 'dlq-2',
        raw_input: JSON.stringify(mockEvent),
        status: 'pending',
        retry_count: 1
      };

      const { mockUpdate } = mockSupabaseDLQ([mockDLQEntry]);

      // Mock failed delivery
      vi.mocked(requestOmniLink).mockRejectedValue(new Error('Retry failed'));

      const count = await delivery.retryFailedDeliveries('test-app');

      expect(count).toBe(0);

      // Verify update retry count
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        retry_count: 2,
        error_reason: 'Retry failed'
      }));
    });

    it('should handle raw_input as object (JSONB)', async () => {
      const mockDLQEntry = {
        id: 'dlq-3',
        raw_input: mockEvent, // Already an object
        status: 'pending',
        retry_count: 0
      };

      mockSupabaseDLQ([mockDLQEntry]);
      vi.mocked(requestOmniLink).mockResolvedValue({ success: true });

      const count = await delivery.retryFailedDeliveries('test-app');

      expect(count).toBe(1);
      expect(requestOmniLink).toHaveBeenCalledWith(expect.objectContaining({
        body: mockEvent
      }));
    });

    it('should filter by appId in DB query', async () => {
      const mockDLQEntry = {
        id: 'dlq-1',
        raw_input: JSON.stringify(mockEvent),
        status: 'pending',
        retry_count: 0
      };

      const { mockEq } = mockSupabaseDLQ([mockDLQEntry]);
      vi.mocked(requestOmniLink).mockResolvedValue({ success: true });

      const count = await delivery.retryFailedDeliveries('test-app');

      expect(count).toBe(1);
      // Verify DB filtering
      expect(mockEq).toHaveBeenCalledWith('raw_input->>appId', 'test-app');
    });
  });
});
