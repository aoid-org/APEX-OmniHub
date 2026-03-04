/**
 * APEX Memory SDK — Barrel Export
 *
 * Usage:
 *   import { MemoryClient } from '@/lib/memory';
 *   const memory = new MemoryClient(supabase, tenantId, userId);
 *   await memory.store({ content: '...' });
 *   const results = await memory.recall({ limit: 5 });
 *
 * @module lib/memory
 */
export {
  MemoryClient,
  type MemoryType,
  type ProvenanceType,
  type DeviceTrustLevel,
  type StoreMemoryInput,
  type RecallOptions,
  type MemoryRecord,
  type PurgeResult,
  type ExportResult,
} from './MemoryClient';
