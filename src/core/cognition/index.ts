/**
 * OmniCognition — Barrel Export
 * @module src/core/cognition
 */

export {
  CognitionManager,
  CognitiveFactSchema,
  SessionEntrySchema,
  CognitiveStateSchema,
  COGNITION_FILE_KEYS,
  type CognitiveFact,
  type SessionEntry,
  type CognitiveState,
  type CognitionFileKey,
} from './CognitionManager';

export {
  extractEntities,
  jaccardSimilarity,
  deduplicateEntries,
  compressEntries,
  verifyRetention,
  CompressibleEntrySchema,
  type CompressibleEntry,
  type CompressionResult,
  type DeduplicationResult,
} from './compressionEngine';
