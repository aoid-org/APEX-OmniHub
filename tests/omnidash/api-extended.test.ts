import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchSettings,
  updateSettings,
  fetchUsageMetering,
  aggregateUsageMetering,
  fetchMemoryHealthStats,
  restartRitual,
  upsertPipelineItem,
  fetchHealthSnapshot,
} from '../../src/omnidash/api';
import type { UsageMeteringRow } from '../../src/omnidash/api';

vi.mock('../../src/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../src/lib/monitoring', () => ({
  logError: vi.fn(),
}));

vi.mock('../../src/security/auditLog', () => ({
  recordAuditEvent: vi.fn(),
}));

import { supabase } from '../../src/integrations/supabase/client';

// ============================================================================
// Helpers
// ============================================================================
function makeChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockResolvedValue({ count: 0, error: null }),
    ...overrides,
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// fetchSettings - error branch
// ============================================================================
describe('fetchSettings error branch', () => {
  it('throws when supabase returns an error', async () => {
    const chain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    await expect(fetchSettings('u1')).rejects.toThrow();
  });

  it('throws during insert when seed insert fails', async () => {
    const chain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert error' } }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    await expect(fetchSettings('u1')).rejects.toThrow();
  });
});

// ============================================================================
// updateSettings
// ============================================================================
describe('updateSettings', () => {
  it('returns updated settings on success', async () => {
    const settings = { user_id: 'u1', demo_mode: true };
    const chain = makeChain({
      single: vi.fn().mockResolvedValue({ data: settings, error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    const result = await updateSettings('u1', { demo_mode: true });
    expect(result).toEqual(settings);
  });

  it('throws when supabase returns an error', async () => {
    const chain = makeChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'update error' } }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    await expect(updateSettings('u1', {})).rejects.toThrow();
  });
});

// ============================================================================
// upsertPipelineItem - stage='lost' branch (no next_touch_at required)
// ============================================================================
describe('upsertPipelineItem', () => {
  it('does not throw for stage=lost without next_touch_at', async () => {
    const item = {
      user_id: 'u1',
      account_name: 'Acme',
      product: 'Pro',
      owner: 'Me',
      stage: 'lost' as const,
    };
    const chain = makeChain({
      single: vi.fn().mockResolvedValue({ data: { ...item }, error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    await expect(upsertPipelineItem(item)).resolves.toBeDefined();
  });

  it('throws for non-lost stage without next_touch_at', async () => {
    const item = {
      user_id: 'u1',
      account_name: 'Acme',
      product: 'Pro',
      owner: 'Me',
      stage: 'lead' as const,
    };
    await expect(upsertPipelineItem(item)).rejects.toThrow('Next touch is required');
  });
});

// ============================================================================
// restartRitual - keepIds branch
// ============================================================================
describe('restartRitual', () => {
  it('calls update(is_active=true) when matching categories exist', async () => {
    const data = [
      { id: 'item-1', category: 'outcome' },
      { id: 'item-2', category: 'outreach' },
    ];
    const chain = makeChain({
      order: vi.fn().mockResolvedValue({ data, error: null }),
      update: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnThis(),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    await restartRitual('u1');
    expect(chain.update).toHaveBeenCalledWith({ is_active: false });
    expect(chain.in).toHaveBeenCalled();
  });

  it('skips update(is_active=true) when no matching categories', async () => {
    const chain = makeChain({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    await restartRitual('u1');
    expect(chain.in).not.toHaveBeenCalled();
  });

  it('throws when supabase returns an error', async () => {
    const chain = makeChain({
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    await expect(restartRitual('u1')).rejects.toThrow();
  });
});

// ============================================================================
// fetchUsageMetering
// ============================================================================
describe('fetchUsageMetering', () => {
  it('returns empty array when data is null', async () => {
    const chain = makeChain({
      limit: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    const result = await fetchUsageMetering('u1');
    expect(result).toEqual([]);
  });

  it('returns data when present', async () => {
    const rows = [{ id: 'r1', provider: 'openai', model: 'gpt-4', input_tokens: 100, output_tokens: 50 }];
    const chain = makeChain({
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    const result = await fetchUsageMetering('u1');
    expect(result).toEqual(rows);
  });

  it('throws when error is returned', async () => {
    const chain = makeChain({
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'metering error' } }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    await expect(fetchUsageMetering('u1')).rejects.toThrow();
  });
});

// ============================================================================
// aggregateUsageMetering
// ============================================================================
describe('aggregateUsageMetering', () => {
  it('returns empty array for empty input', () => {
    expect(aggregateUsageMetering([])).toEqual([]);
  });

  it('creates a summary entry for a single row', () => {
    const rows: UsageMeteringRow[] = [
      {
        id: 'r1',
        tenant_id: 't1',
        user_id: 'u1',
        provider: 'openai',
        model: 'gpt-4',
        input_tokens: 100,
        output_tokens: 50,
        region: 'us-east-1',
        timestamp: new Date().toISOString(),
      },
    ];
    const result = aggregateUsageMetering(rows);
    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe('openai');
    expect(result[0].model).toBe('gpt-4');
    expect(result[0].total_input_tokens).toBe(100);
    expect(result[0].total_output_tokens).toBe(50);
    expect(result[0].request_count).toBe(1);
  });

  it('merges rows with the same provider:model key', () => {
    const baseRow: UsageMeteringRow = {
      id: 'r1',
      tenant_id: 't1',
      user_id: 'u1',
      provider: 'openai',
      model: 'gpt-4',
      input_tokens: 0,
      output_tokens: 0,
      region: 'us-east-1',
      timestamp: new Date().toISOString(),
    };
    const rows: UsageMeteringRow[] = [
      { ...baseRow, id: 'r1', input_tokens: 100, output_tokens: 50 },
      { ...baseRow, id: 'r2', input_tokens: 200, output_tokens: 75 },
    ];
    const result = aggregateUsageMetering(rows);
    expect(result).toHaveLength(1);
    expect(result[0].total_input_tokens).toBe(300);
    expect(result[0].total_output_tokens).toBe(125);
    expect(result[0].request_count).toBe(2);
  });

  it('creates separate entries for different provider:model keys', () => {
    const rows: UsageMeteringRow[] = [
      {
        id: 'r1', tenant_id: 't1', user_id: 'u1', provider: 'openai', model: 'gpt-4',
        input_tokens: 100, output_tokens: 50, region: 'us', timestamp: new Date().toISOString(),
      },
      {
        id: 'r2', tenant_id: 't1', user_id: 'u1', provider: 'anthropic', model: 'claude-3',
        input_tokens: 200, output_tokens: 80, region: 'us', timestamp: new Date().toISOString(),
      },
    ];
    const result = aggregateUsageMetering(rows);
    expect(result).toHaveLength(2);
    // sorted by request_count descending (both are 1, so order may vary)
    const providers = result.map((r) => r.provider).sort();
    expect(providers).toEqual(['anthropic', 'openai']);
  });

  it('sorts by request_count descending', () => {
    const base = {
      tenant_id: 't1', user_id: 'u1', region: 'us', timestamp: new Date().toISOString(),
    };
    const rows: UsageMeteringRow[] = [
      { ...base, id: 'r1', provider: 'openai', model: 'gpt-4', input_tokens: 10, output_tokens: 5 },
      { ...base, id: 'r2', provider: 'anthropic', model: 'claude-3', input_tokens: 20, output_tokens: 8 },
      { ...base, id: 'r3', provider: 'anthropic', model: 'claude-3', input_tokens: 30, output_tokens: 12 },
    ];
    const result = aggregateUsageMetering(rows);
    expect(result[0].provider).toBe('anthropic');
    expect(result[0].request_count).toBe(2);
    expect(result[1].request_count).toBe(1);
  });
});

// ============================================================================
// fetchMemoryHealthStats
// ============================================================================
describe('fetchMemoryHealthStats', () => {
  it('returns empty stats on error', async () => {
    const chain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'view error' } }),
      gt: vi.fn().mockResolvedValue({ count: 0, error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    const result = await fetchMemoryHealthStats('u1');
    expect(result.total_memories).toBe(0);
    expect(result.episodic_count).toBe(0);
    expect(result.dedup_attempts).toBe(0);
  });

  it('returns stats when data is null (new user fallback)', async () => {
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }) as never;
      }
      // second call: idempotency_receipts count
      return makeChain({
        gt: vi.fn().mockResolvedValue({ count: 3, error: null }),
      }) as never;
    });
    const result = await fetchMemoryHealthStats('u1');
    expect(result.total_memories).toBe(0);
    expect(result.dedup_attempts).toBe(3);
  });

  it('returns populated stats when data is present', async () => {
    const mockData = {
      total_memories: 42,
      episodic_count: 10,
      semantic_count: 15,
      procedural_count: 5,
      preference_count: 8,
      embedded_count: 40,
      expired_count: 2,
      pending_reembed_count: 1,
      avg_importance: 0.75,
      avg_trust_score: 0.9,
      avg_access_count: 3.2,
      latest_memory_at: '2025-01-01T00:00:00Z',
      oldest_memory_at: '2024-01-01T00:00:00Z',
      current_embedding_model: 'text-embedding-ada-002',
      poisoned_candidate_count: 0,
    };
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }) as never;
      }
      return makeChain({
        gt: vi.fn().mockResolvedValue({ count: 5, error: null }),
      }) as never;
    });
    const result = await fetchMemoryHealthStats('u1');
    expect(result.total_memories).toBe(42);
    expect(result.episodic_count).toBe(10);
    expect(result.current_embedding_model).toBe('text-embedding-ada-002');
    expect(result.dedup_attempts).toBe(5);
  });
});

// ============================================================================
// fetchHealthSnapshot
// ============================================================================
describe('fetchHealthSnapshot', () => {
  it('returns lastUpdated as null when all tables return null', async () => {
    const chain = makeChain({
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    const result = await fetchHealthSnapshot('u1');
    expect(result.lastUpdated).toBeNull();
  });

  it('returns the most recent updated_at across tables', async () => {
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      const dates = [
        '2025-01-01T00:00:00Z',
        '2025-03-01T00:00:00Z', // most recent
        '2025-02-01T00:00:00Z',
        '2024-12-01T00:00:00Z',
        null,
      ];
      const updated_at = dates[callCount - 1] ?? null;
      return makeChain({
        limit: vi.fn().mockResolvedValue({
          data: updated_at ? [{ updated_at }] : [],
          error: null,
        }),
      }) as never;
    });
    const result = await fetchHealthSnapshot('u1');
    expect(result.lastUpdated).toBe('2025-03-01T00:00:00Z');
  });
});
