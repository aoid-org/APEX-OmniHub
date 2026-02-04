/**
 * TiDB Vector Persistence Adapter
 * STUB ONLY - throws unless mode === 'tidb'
 * Will be implemented in Phase 4 with Python orchestrator integration
 */

import type { VectorPersistenceStore, EmbeddingMeta } from '../types';

export class TiDBVectorPersistence implements VectorPersistenceStore {
  async putEmbedding(_id: string, _embedding: number[], _meta: EmbeddingMeta): Promise<void> {
    throw new Error('TiDB Vector Persistence not implemented - enable in orchestrator/infrastructure/tidb_persistence.py');
  }
  
  async getEmbedding(_id: string): Promise<{ embedding: number[]; meta: EmbeddingMeta } | null> {
    throw new Error('TiDB Vector Persistence not implemented - enable in orchestrator/infrastructure/tidb_persistence.py');
  }
}
