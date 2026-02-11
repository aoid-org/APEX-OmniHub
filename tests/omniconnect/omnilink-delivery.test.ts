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
});
