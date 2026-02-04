/**
 * Data Plane Types - SOVEREIGN DATA PLANE INTEGRATION
 * Single-port adapter for multi-store routing (Supabase, Turso, TiDB)
 * NO Cloudflare. Enterprise-grade. Atomic. Idempotent.
 */

export interface DeviceInfo {
  device_id: string;
  device_info: string;
  status: 'trusted' | 'pending' | 'blocked';
  last_seen: string;
}

export interface DeviceRegistryStore {
  /**
   * Get all devices for a user
   */
  getDevices(userId: string): Promise<DeviceInfo[]>;

  /**
   * Upsert a device (idempotent)
   */
  upsertDevice(userId: string, device: DeviceInfo): Promise<void>;
}

export interface EmbeddingMeta {
  source?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface VectorPersistenceStore {
  /**
   * Store an embedding vector with metadata
   */
  putEmbedding(id: string, embedding: number[], meta: EmbeddingMeta): Promise<void>;

  /**
   * Retrieve an embedding by ID
   */
  getEmbedding(id: string): Promise<{ embedding: number[]; meta: EmbeddingMeta } | null>;
}

export interface DataPlane {
  deviceRegistry: DeviceRegistryStore;
  vectorPersistence?: VectorPersistenceStore;
}

export type DataPlaneMode = 'supabase' | 'turso' | 'dual';
export type VectorPersistenceMode = 'off' | 'tidb';
