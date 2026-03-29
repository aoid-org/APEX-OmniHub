import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { MemoryClient } from '../../src/lib/memory/MemoryClient';
import type { SupabaseClient } from '@supabase/supabase-js';

interface MockBuilder {
  select: Mock;
  eq: Mock;
  order: Mock;
  limit: Mock;
  then: Mock;
}

describe('MemoryClient.touch_memories_bulk() logic coverage', () => {
  let mc: MemoryClient;
  let rpcSpy: Mock;
  let fromSpy: Mock;

  beforeEach(() => {
    rpcSpy = vi.fn().mockResolvedValue({ data: null, error: null });

    // Mock builder with explicit typing to avoid 'any' where possible
    const builder: MockBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: { data: { id: string }[] | null; error: Error | null }) => void) => {
        resolve({ data: [{ id: 'mem-1' }, { id: 'mem-2' }], error: null });
      }),
    };

    fromSpy = vi.fn().mockReturnValue(builder);

    const supabaseMock = {
      from: fromSpy,
      rpc: rpcSpy,
    } as unknown as SupabaseClient;

    mc = new MemoryClient(supabaseMock, 'tenant-1', 'user-1'); // NOSONAR
  });

  it('should call touch_memories_bulk when recall returns memories', async () => {
    const results = await mc.recall({ limit: 2 });

    expect(results).toHaveLength(2);
    expect(rpcSpy).toHaveBeenCalledWith('touch_memories_bulk', {
      memory_ids: ['mem-1', 'mem-2'], // NOSONAR
    });
  });

  it('should not call touch_memories_bulk when recall returns no memories', async () => {
    // Override builder to return empty data
    const emptyBuilder: MockBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: { data: unknown[] | null; error: Error | null }) => void) => {
        resolve({ data: [], error: null });
      }),
    };
    fromSpy.mockReturnValue(emptyBuilder);

    const results = await mc.recall();

    expect(results).toHaveLength(0);
    // Explicitly check for no calls with the RPC name
    const calls = rpcSpy.mock.calls;
    const touchCalls = calls.filter(call => call[0] === 'touch_memories_bulk');
    expect(touchCalls).toHaveLength(0);
  });
});
