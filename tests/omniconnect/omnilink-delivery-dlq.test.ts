import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OmniLinkDelivery } from '@/omniconnect/delivery/omnilink-delivery';
import { TranslatedEvent } from '@/omniconnect/translation/translator';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock requestOmniLink to fail
vi.mock('@/integrations/omnilink', () => ({
  requestOmniLink: vi.fn().mockRejectedValue(new Error('Network error')),
}));

describe('OmniLinkDelivery DLQ', () => {
  let delivery: OmniLinkDelivery;

  beforeEach(() => {
    vi.clearAllMocks();
    delivery = new OmniLinkDelivery();
  });

  it('should insert into DLQ on delivery failure', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any).mockImplementation(mockFrom);

    const event: TranslatedEvent = {
      eventId: 'evt-1',
      correlationId: 'corr-1',
      appId: 'test-app',
      userId: 'user-1',
      payload: { foo: 'bar' },
      metadata: { risk_lane: 'RED' },
    };

    await delivery.deliverBatch([event], 'test-app', 'corr-1');

    expect(mockFrom).toHaveBeenCalledWith('ingress_buffer');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      correlation_id: 'corr-1',
      raw_input: JSON.stringify(event),
      error_reason: 'Network error',
      status: 'pending',
      risk_score: 100,
      source_type: 'omnilink_delivery_failure',
      user_id: 'user-1',
    }));
  });
});
