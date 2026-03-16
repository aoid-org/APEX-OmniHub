/**
 * MemoryClient — Unit & Integration Tests
 *
 * Covers the full public API surface:
 *   store()   — idempotent upsert, trust-score logic, error handling
 *   recall()  — filter by type, minImportance, efSearch, empty results
 *   purge()   — RPC delegation, error handling, return shape
 *   export()  — RPC delegation, field mapping, error handling
 *
 * All Supabase calls are mocked; no network required.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  MemoryClient,
  type StoreMemoryInput,
  type MemoryRecord,
} from '../../src/lib/memory/MemoryClient';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Mock factory ─────────────────────────────────────────────────────────────

/**
 * Creates a minimal Supabase client mock with chainable query builder.
 * Each test overrides the resolved value via the exposed spy.
 */
function makeSupabaseMock() {
  // Shared spies exposed to tests
  const upsertSpy = vi.fn();
  const rpcSpy = vi.fn();
  const selectSpy = vi.fn();
  const eqSpy = vi.fn();
  const gteSpy = vi.fn();
  const orderSpy = vi.fn();
  const limitSpy = vi.fn();
  const singleSpy = vi.fn();

  // Build a chainable builder where terminal calls resolve via spy
  const makeBuilder = (terminalSpy: typeof singleSpy) => {
    const builder: Record<string, unknown> = {};
    const _chain = () => builder;

    builder.select = (..._args: unknown[]) => { selectSpy(..._args); return builder; };
    builder.eq = (..._args: unknown[]) => { eqSpy(..._args); return builder; };
    builder.gte = (..._args: unknown[]) => { gteSpy(..._args); return builder; };
    builder.order = (..._args: unknown[]) => { orderSpy(..._args); return builder; };
    builder.limit = (..._args: unknown[]) => { limitSpy(..._args); return builder; };
    builder.single = (..._args: unknown[]) => terminalSpy(..._args);

    // Make the builder itself thenable (for queries that don't call .single())
    builder.then = (resolve: (v: unknown) => unknown) => {
      return Promise.resolve(terminalSpy()).then(resolve);
    };

    return builder;
  };

  const client = {
    from: vi.fn((_table: string) => ({
      upsert: (...args: unknown[]) => {
        upsertSpy(...args);
        return makeBuilder(singleSpy);
      },
      select: (...args: unknown[]) => {
        selectSpy(...args);
        return makeBuilder(singleSpy);
      },
    })),
    rpc: rpcSpy,
  } as unknown as SupabaseClient;

  return {
    client,
    spies: { upsertSpy, rpcSpy, selectSpy, eqSpy, gteSpy, orderSpy, limitSpy, singleSpy },
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-abc';
const USER_ID = 'user-xyz';

const SAMPLE_MEMORY_ROW = {
  id: 'mem-001',
  tenant_id: TENANT_ID,
  user_id: USER_ID,
  content: 'The user prefers dark mode.',
  memory_type: 'preference',
  provenance_type: 'user_confirmed',
  trust_score: 0.9,
  importance_score: 0.8,
  access_count: 3,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
};

const SAMPLE_MEMORY_RECORD: MemoryRecord = {
  id: 'mem-001',
  tenantId: TENANT_ID,
  userId: USER_ID,
  content: 'The user prefers dark mode.',
  memoryType: 'preference',
  provenanceType: 'user_confirmed',
  trustScore: 0.9,
  importanceScore: 0.8,
  accessCount: 3,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
};

// ─── store() ─────────────────────────────────────────────────────────────────

describe('MemoryClient.store()', () => {
  it('returns the new memory ID on success', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.singleSpy.mockResolvedValue({ data: { id: 'mem-001' }, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    const id = await mc.store({ content: 'Hello world' });

    expect(id).toBe('mem-001');
  });

  it('sends correct tenant_id and user_id', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.singleSpy.mockResolvedValue({ data: { id: 'mem-002' }, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.store({ content: 'Test content' });

    const upsertPayload = spies.upsertSpy.mock.calls[0][0];
    expect(upsertPayload).toMatchObject({
      tenant_id: TENANT_ID,
      user_id: USER_ID,
      content: 'Test content',
    });
  });

  it('defaults memory_type to "episodic"', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.singleSpy.mockResolvedValue({ data: { id: 'mem-003' }, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.store({ content: 'No type given' });

    const payload = spies.upsertSpy.mock.calls[0][0];
    expect(payload.memory_type).toBe('episodic');
  });

  it('sets trust_score=0.9 for user_confirmed provenance', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.singleSpy.mockResolvedValue({ data: { id: 'mem-004' }, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.store({ content: 'Confirmed fact', provenanceType: 'user_confirmed' });

    const payload = spies.upsertSpy.mock.calls[0][0];
    expect(payload.trust_score).toBe(0.9);
  });

  it('sets trust_score=0.3 for non-user_confirmed provenance', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.singleSpy.mockResolvedValue({ data: { id: 'mem-005' }, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.store({ content: 'Tool output', provenanceType: 'tool_output' });

    const payload = spies.upsertSpy.mock.calls[0][0];
    expect(payload.trust_score).toBe(0.3);
  });

  it('passes custom importanceScore and metadata', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.singleSpy.mockResolvedValue({ data: { id: 'mem-006' }, error: null });

    const input: StoreMemoryInput = {
      content: 'Critical info',
      importanceScore: 0.99,
      metadata: { source: 'gpt-4o' },
    };
    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.store(input);

    const payload = spies.upsertSpy.mock.calls[0][0];
    expect(payload.importance_score).toBe(0.99);
    expect(payload.metadata).toEqual({ source: 'gpt-4o' });
  });

  it('passes embedding when provided', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.singleSpy.mockResolvedValue({ data: { id: 'mem-007' }, error: null });

    const embedding = [0.1, 0.2, 0.3];
    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.store({ content: 'Embedded', embedding });

    const payload = spies.upsertSpy.mock.calls[0][0];
    expect(payload.embedding).toEqual(embedding);
  });

  it('throws with descriptive message on Supabase error', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.singleSpy.mockResolvedValue({ data: null, error: { message: 'unique violation' } });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await expect(mc.store({ content: 'Fail' })).rejects.toThrow(
      'Memory store failed: unique violation',
    );
  });
});

// ─── recall() ────────────────────────────────────────────────────────────────

describe('MemoryClient.recall()', () => {
  function makeRecallMock(rows: Record<string, unknown>[]) {
    const { client, spies } = makeSupabaseMock();

    // recall() doesn't call .single() — it awaits the query builder directly
    // so we need to make the builder resolve with the row set
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn().mockReturnValue(builder);
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.gte = vi.fn().mockReturnValue(builder);
    builder.order = vi.fn().mockReturnValue(builder);
    builder.limit = vi.fn().mockReturnValue(builder);
    // thenable: data/error resolution
    builder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve);

    (client.from as ReturnType<typeof vi.fn>).mockReturnValue(builder);

    // touch_memory RPC returns ok
    spies.rpcSpy.mockResolvedValue({ data: null, error: null });

    return { client, spies, builder };
  }

  it('returns empty array when no memories exist', async () => {
    const { client, spies } = makeRecallMock([]);
    spies.rpcSpy.mockResolvedValue({ data: null, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    const results = await mc.recall();

    expect(results).toHaveLength(0);
  });

  it('maps database rows to MemoryRecord shape', async () => {
    const { client } = makeRecallMock([SAMPLE_MEMORY_ROW]);

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    const results = await mc.recall();

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(SAMPLE_MEMORY_RECORD);
  });

  it('calls touch_memories RPC for returned memories', async () => {
    const { client, spies } = makeRecallMock([SAMPLE_MEMORY_ROW]);

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.recall();

    expect(spies.rpcSpy).toHaveBeenCalledWith('touch_memories', {
      memory_ids: [SAMPLE_MEMORY_ROW.id],
    });
  });

  it('calls set_ef_search RPC when efSearch option is provided', async () => {
    const { client, spies } = makeRecallMock([]);

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.recall({ efSearch: 200 });

    expect(spies.rpcSpy).toHaveBeenCalledWith('set_ef_search', { ef: 200 });
  });

  it('does NOT call set_ef_search when efSearch is omitted', async () => {
    const { client, spies } = makeRecallMock([]);

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.recall({});

    const rpcCalls = spies.rpcSpy.mock.calls.map((c) => c[0]);
    expect(rpcCalls).not.toContain('set_ef_search');
  });

  it('applies memoryType filter via .eq()', async () => {
    const { client, builder } = makeRecallMock([]);

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.recall({ memoryType: 'semantic' });

    const eqCalls = (builder.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls).toContainEqual(['memory_type', 'semantic']);
  });

  it('applies minImportance filter via .gte()', async () => {
    const { client, builder } = makeRecallMock([]);

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.recall({ minImportance: 0.7 });

    const gteCalls = (builder.gte as ReturnType<typeof vi.fn>).mock.calls;
    expect(gteCalls).toContainEqual(['importance_score', 0.7]);
  });

  it('respects custom limit', async () => {
    const { client, builder } = makeRecallMock([]);

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.recall({ limit: 25 });

    const limitCalls = (builder.limit as ReturnType<typeof vi.fn>).mock.calls;
    expect(limitCalls).toContainEqual([25]);
  });

  it('defaults limit to 10', async () => {
    const { client, builder } = makeRecallMock([]);

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.recall();

    const limitCalls = (builder.limit as ReturnType<typeof vi.fn>).mock.calls;
    expect(limitCalls).toContainEqual([10]);
  });

  it('throws with descriptive message on Supabase error', async () => {
    const { client } = makeSupabaseMock();

    const builder: Record<string, unknown> = {};
    builder.select = vi.fn().mockReturnValue(builder);
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.gte = vi.fn().mockReturnValue(builder);
    builder.order = vi.fn().mockReturnValue(builder);
    builder.limit = vi.fn().mockReturnValue(builder);
    builder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: { message: 'connection refused' } }).then(resolve);

    (client.from as ReturnType<typeof vi.fn>).mockReturnValue(builder);
    (client.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await expect(mc.recall()).rejects.toThrow('Memory recall failed: connection refused');
  });
});

// ─── purge() ─────────────────────────────────────────────────────────────────

describe('MemoryClient.purge()', () => {
  it('calls purge_user_memories RPC with correct params', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: 7, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.purge('data_subject_request');

    expect(spies.rpcSpy).toHaveBeenCalledWith('purge_user_memories', {
      p_tenant_id: TENANT_ID,
      p_user_id: USER_ID,
      p_purge_reason: 'data_subject_request',
    });
  });

  it('returns purgedCount from RPC response', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: 42, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    const result = await mc.purge();

    expect(result.purgedCount).toBe(42);
  });

  it('returns purgedCount=0 when RPC returns null', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: null, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    const result = await mc.purge();

    expect(result.purgedCount).toBe(0);
  });

  it('defaults reason to "data_subject_request"', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: 0, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.purge(); // no reason arg

    const rpcArgs = spies.rpcSpy.mock.calls[0][1];
    expect(rpcArgs.p_purge_reason).toBe('data_subject_request');
  });

  it('throws with descriptive message on RPC error', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await expect(mc.purge()).rejects.toThrow('Memory purge failed: permission denied');
  });

  it('returns auditId as null (reserved for future audit log)', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: 5, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    const result = await mc.purge();

    expect(result.auditId).toBeNull();
  });
});

// ─── export() ────────────────────────────────────────────────────────────────

describe('MemoryClient.export()', () => {
  it('calls export_user_memories RPC with correct params', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: [], error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.export();

    expect(spies.rpcSpy).toHaveBeenCalledWith('export_user_memories', {
      p_tenant_id: TENANT_ID,
      p_user_id: USER_ID,
    });
  });

  it('returns ExportResult with memories, totalCount and exportedAt', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: [SAMPLE_MEMORY_ROW], error: null });

    const before = Date.now();
    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    const result = await mc.export();
    const after = Date.now();

    expect(result.memories).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    // exportedAt must be a valid ISO timestamp within the test execution window
    const exportTs = new Date(result.exportedAt).getTime();
    expect(exportTs).toBeGreaterThanOrEqual(before);
    expect(exportTs).toBeLessThanOrEqual(after);
  });

  it('maps database rows to MemoryRecord shape', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: [SAMPLE_MEMORY_ROW], error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    const result = await mc.export();

    expect(result.memories[0]).toEqual(SAMPLE_MEMORY_RECORD);
  });

  it('returns empty memories array when no data', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: null, error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    const result = await mc.export();

    expect(result.memories).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  it('exports multiple memories preserving order', async () => {
    const row2 = { ...SAMPLE_MEMORY_ROW, id: 'mem-002', content: 'Second memory' };
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: [SAMPLE_MEMORY_ROW, row2], error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    const result = await mc.export();

    expect(result.memories).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    expect(result.memories[0].id).toBe('mem-001');
    expect(result.memories[1].id).toBe('mem-002');
  });

  it('throws with descriptive message on RPC error', async () => {
    const { client, spies } = makeSupabaseMock();
    spies.rpcSpy.mockResolvedValue({ data: null, error: { message: 'export quota exceeded' } });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await expect(mc.export()).rejects.toThrow('Memory export failed: export quota exceeded');
  });
});

// ─── Integration-style: multi-operation sequence ──────────────────────────────

describe('MemoryClient — operation sequences', () => {
  it('store → recall → purge lifecycle completes without error', async () => {
    const { client, spies } = makeSupabaseMock();

    // store returns an ID
    spies.singleSpy.mockResolvedValueOnce({ data: { id: 'mem-seq-001' }, error: null });

    // recall: build a thenable query mock
    const recallBuilder: Record<string, unknown> = {};
    recallBuilder.select = vi.fn().mockReturnValue(recallBuilder);
    recallBuilder.eq = vi.fn().mockReturnValue(recallBuilder);
    recallBuilder.gte = vi.fn().mockReturnValue(recallBuilder);
    recallBuilder.order = vi.fn().mockReturnValue(recallBuilder);
    recallBuilder.limit = vi.fn().mockReturnValue(recallBuilder);
    let recallCalled = false;
    recallBuilder.then = (resolve: (v: unknown) => unknown) => {
      recallCalled = true;
      return Promise.resolve({ data: [SAMPLE_MEMORY_ROW], error: null }).then(resolve);
    };

    (client.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: spies.singleSpy }),
        }),
      })
      .mockReturnValue(recallBuilder);

    // RPC: touch_memories + purge_user_memories
    spies.rpcSpy
      .mockResolvedValueOnce({ data: null, error: null }) // touch_memories
      .mockResolvedValueOnce({ data: 1, error: null });   // purge_user_memories

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);

    const storedId = await mc.store({ content: 'Sequence test', provenanceType: 'user_confirmed' });
    expect(storedId).toBe('mem-seq-001');

    const recalled = await mc.recall({ limit: 1 });
    expect(recallCalled).toBe(true);
    expect(recalled).toHaveLength(1);

    const purgeResult = await mc.purge('test_sequence');
    expect(purgeResult.purgedCount).toBe(1);
  });

  it('export after store returns correct total count', async () => {
    const { client, spies } = makeSupabaseMock();

    // store
    spies.singleSpy.mockResolvedValueOnce({ data: { id: 'mem-exp-001' }, error: null });
    (client.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: spies.singleSpy }),
      }),
    });

    // export RPC
    spies.rpcSpy.mockResolvedValue({ data: [SAMPLE_MEMORY_ROW], error: null });

    const mc = new MemoryClient(client, TENANT_ID, USER_ID);
    await mc.store({ content: 'Export sequence' });

    const exported = await mc.export();
    expect(exported.totalCount).toBe(1);
    expect(exported.memories[0].tenantId).toBe(TENANT_ID);
  });
});
