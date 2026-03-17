/**
 * APEX Memory SDK — Unified client for ACRA memory operations.
 *
 * Surface: store(), recall(), purge(), export()
 * All operations are tenant-scoped and audited.
 *
 * @module lib/memory/MemoryClient
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MemoryType =
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'preference';

export type ProvenanceType =
  | 'user_confirmed'
  | 'tool_output'
  | 'workflow_receipt'
  | 'rag_synthesis'
  | 'import';

export type DeviceTrustLevel =
  | 'trusted'
  | 'suspect'
  | 'blocked'
  | 'unknown';

export interface StoreMemoryInput {
  readonly content: string;
  readonly memoryType?: MemoryType;
  readonly provenanceType?: ProvenanceType;
  readonly importanceScore?: number;
  readonly metadata?: Record<string, unknown>;
  readonly embedding?: number[];
}

export interface RecallOptions {
  readonly query?: string;
  readonly queryEmbedding?: number[];
  readonly memoryType?: MemoryType;
  readonly limit?: number;
  readonly minImportance?: number;
  readonly efSearch?: number;
}

export interface MemoryRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly content: string;
  readonly memoryType: MemoryType;
  readonly provenanceType: ProvenanceType;
  readonly trustScore: number;
  readonly importanceScore: number;
  readonly accessCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PurgeResult {
  readonly purgedCount: number;
  readonly auditId: string | null;
}

export interface ExportResult {
  readonly memories: ReadonlyArray<MemoryRecord>;
  readonly totalCount: number;
  readonly exportedAt: string;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class MemoryClient {
  private readonly supabase: SupabaseClient;
  private readonly tenantId: string;
  private readonly userId: string;

  constructor(
    supabase: SupabaseClient,
    tenantId: string,
    userId: string,
  ) {
    this.supabase = supabase;
    this.tenantId = tenantId;
    this.userId = userId;
  }

  /**
   * Store a new memory. Idempotent via content_hash UNIQUE constraint.
   * Returns the memory ID (new or existing).
   */
  async store(input: StoreMemoryInput): Promise<string> {
    const { data, error } = await this.supabase
      .from('memories')
      .upsert(
        {
          tenant_id: this.tenantId,
          user_id: this.userId,
          content: input.content,
          memory_type: input.memoryType ?? 'episodic',
          provenance_type: input.provenanceType ?? 'tool_output',
          importance_score: input.importanceScore ?? 0.5,
          trust_score: input.provenanceType === 'user_confirmed'
            ? 0.9
            : 0.3,
          metadata: input.metadata ?? {},
          embedding: input.embedding ?? null,
        },
        { onConflict: 'tenant_id,user_id,content_hash' },
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Memory store failed: ${error.message}`);
    }
    return data.id as string;
  }

  /**
   * Recall memories by semantic similarity or type filter.
   * Uses ef_search for HNSW tuning when embedding is provided.
   */
  async recall(options: RecallOptions = {}): Promise<
    ReadonlyArray<MemoryRecord>
  > {
    const limit = options.limit ?? 10;

    // Set ef_search if specified
    if (options.efSearch) {
      await this.supabase.rpc('set_ef_search', {
        ef: options.efSearch,
      });
    }

    let query = this.supabase
      .from('memories')
      .select(
        'id, tenant_id, user_id, content, memory_type, '
        + 'provenance_type, trust_score, importance_score, '
        + 'access_count, created_at, updated_at',
      )
      .eq('tenant_id', this.tenantId)
      .eq('user_id', this.userId);

    if (options.memoryType) {
      query = query.eq('memory_type', options.memoryType);
    }

    if (options.minImportance) {
      query = query.gte(
        'importance_score',
        options.minImportance,
      );
    }

    query = query
      .order('importance_score', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Memory recall failed: ${error.message}`);
    }

    // Touch accessed memories
    const rows = (data ?? []) as unknown as ReadonlyArray<Record<string, unknown>>;
    const ids = rows.map((m) => m.id as string);
    if (ids.length > 0) {
      await this.supabase.rpc('touch_memories', {
        memory_ids: ids,
      });
    }

    return rows.map((m) => mapToMemoryRecord(m));
  }

  /**
   * Hard purge all memories for this user/tenant.
   * Audited via purge_user_memories() RPC. Irreversible.
   * Requires MAN Mode approval for production use.
   */
  async purge(
    reason: string = 'data_subject_request',
  ): Promise<PurgeResult> {
    const { data, error } = await this.supabase.rpc(
      'purge_user_memories',
      {
        p_tenant_id: this.tenantId,
        p_user_id: this.userId,
        p_purge_reason: reason,
      },
    );

    if (error) {
      throw new Error(`Memory purge failed: ${error.message}`);
    }

    return {
      purgedCount: (data as number) ?? 0,
      auditId: null,
    };
  }

  /**
   * Export all memories for this user/tenant.
   * GDPR/PIPEDA data subject access request.
   */
  async export(): Promise<ExportResult> {
    const { data, error } = await this.supabase.rpc(
      'export_user_memories',
      {
        p_tenant_id: this.tenantId,
        p_user_id: this.userId,
      },
    );

    if (error) {
      throw new Error(
        `Memory export failed: ${error.message}`,
      );
    }

    const memories = (
      (data as ReadonlyArray<Record<string, unknown>>) ?? []
    ).map((m) => mapToMemoryRecord(m));

    return {
      memories,
      totalCount: memories.length,
      exportedAt: new Date().toISOString(),
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapToMemoryRecord(
  m: Record<string, unknown>,
): MemoryRecord {
  return {
    id: m.id as string,
    tenantId: m.tenant_id as string,
    userId: m.user_id as string,
    content: m.content as string,
    memoryType: m.memory_type as MemoryType,
    provenanceType: m.provenance_type as ProvenanceType,
    trustScore: (m.trust_score as number) ?? 0,
    importanceScore: (m.importance_score as number) ?? 0.5,
    accessCount: (m.access_count as number) ?? 0,
    createdAt: m.created_at as string,
    updatedAt: m.updated_at as string,
  };
}
