import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryClient } from '../../src/lib/memory/MemoryClient';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('MemoryClient.touch_memories_bulk() logic coverage', () => {
  let mc: MemoryClient;
  let rpcSpy: any;
  let fromSpy: any;

  beforeEach(() => {
    rpcSpy = vi.fn().mockResolvedValue({ data: null, error: null });

    // Mock builder
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: any) => resolve({ data: [{ id: 'mem-1' }, { id: 'mem-2' }], error: null })),
    };

    fromSpy = vi.fn().mockReturnValue(builder);

    const supabaseMock = {
      from: fromSpy,
      rpc: rpcSpy,
    } as unknown as SupabaseClient;

    mc = new MemoryClient(supabaseMock, 'tenant-1', 'user-1');
  });

  it('should call touch_memories_bulk when recall returns memories', async () => {
    const results = await mc.recall({ limit: 2 });

    expect(results).toHaveLength(2);
    expect(rpcSpy).toHaveBeenCalledWith('touch_memories_bulk', {
      memory_ids: ['mem-1', 'mem-2'],
    });
  });

  it('should not call touch_memories_bulk when recall returns no memories', async () => {
    // Override builder to return empty data
    fromSpy.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: [], error: null }),
    } as any);

    const results = await mc.recall();

    expect(results).toHaveLength(0);
    expect(rpcSpy).not.toHaveBeenCalledWith('touch_memories_bulk', expect.anything());
  });
});
