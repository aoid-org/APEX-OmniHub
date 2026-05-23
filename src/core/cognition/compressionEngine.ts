/**
 * CompressionEngine — Map-Reduce Summarization + Entity Extraction
 * @version 1.0.0
 * @module src/core/cognition/compressionEngine
 *
 * Standalone compression utilities for the OmniCognition subsystem.
 * Implements the APEX-MEMORY III.1 Compression Protocol:
 * - Primacy-Recency Split
 * - Semantic Deduplication
 * - Map-Reduce Chunking
 * - Entity Extraction
 *
 * All functions are pure — no side effects, no mutations.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export const CompressibleEntrySchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  timestamp: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CompressibleEntry = z.infer<typeof CompressibleEntrySchema>;

export interface CompressionResult {
  /** Entries preserved verbatim (primacy + recency zones) */
  readonly preserved: readonly CompressibleEntry[];
  /** Compressed summaries of middle entries */
  readonly summaries: readonly string[];
  /** Extracted entities from compressed content */
  readonly entities: readonly string[];
  /** Number of entries that were compressed */
  readonly compressedCount: number;
  /** Compression ratio (original / compressed) */
  readonly ratio: number;
}

export interface DeduplicationResult {
  /** Unique entries after deduplication */
  readonly unique: readonly CompressibleEntry[];
  /** Number of duplicates removed */
  readonly duplicatesRemoved: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default chunk size for map-reduce */
const DEFAULT_CHUNK_SIZE = 5;

/** Similarity threshold for deduplication (0–1, Jaccard index) */
const SIMILARITY_THRESHOLD = 0.8;

// ============================================================================
// Entity Extraction
// ============================================================================

/**
 * Extract named entities from text.
 *
 * Detects:
 * - PascalCase identifiers (e.g., CognitionManager, TaskComplexityScorer)
 * - File paths (e.g., src/core/cognition/brain.md)
 * - dotted identifiers (e.g., omniModalStore.ts)
 * - ALL_CAPS constants (e.g., CACHE_VERSION, SHORT_TERM_MAX)
 *
 * Returns deduplicated array of entity strings.
 */
export function extractEntities(text: string): string[] {
  const patterns = [
    // PascalCase identifiers (2+ words)
    /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g,
    // File paths
    /(?:src|lib|components|pages|stores|core|public)\/[\w/.-]+/g,
    // Dotted file names
    /\b\w+\.\w{2,4}\b/g,
    // ALL_CAPS constants (3+ chars)
    /\b[A-Z][A-Z_]{2,}\b/g,
  ];

  const found = new Set<string>();
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      found.add(match[0]);
    }
  }

  return Array.from(found).sort((a, b) => a.localeCompare(b));
}

// ============================================================================
// Semantic Deduplication
// ============================================================================

/**
 * Compute Jaccard similarity between two strings (word-level).
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
export function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Deduplicate entries by semantic similarity.
 * Keeps the first (canonical) instance when entries exceed the similarity threshold.
 */
export function deduplicateEntries(
  entries: readonly CompressibleEntry[],
  threshold: number = SIMILARITY_THRESHOLD,
): DeduplicationResult {
  const unique: CompressibleEntry[] = [];

  // ⚡ Bolt: Cache tokenized sets to prevent O(N^2) string splits and Set instantiations
  const uniqueWordsList: Set<string>[] = [];

  for (const entry of entries) {
    const entryWords = new Set(entry.content.toLowerCase().split(/\s+/).filter(Boolean));
    const entrySize = entryWords.size;
    let isDuplicate = false;

    for (let i = 0; i < unique.length; i++) {
      const existingWords = uniqueWordsList[i];
      const existingSize = existingWords.size;

      if (entrySize === 0 && existingSize === 0) {
        if (threshold <= 1) {
          isDuplicate = true;
          break;
        }
      } else if (entrySize === 0 || existingSize === 0) {
        continue;
      } else {
        let intersection = 0;
        for (const word of entryWords) {
          if (existingWords.has(word)) intersection++;
        }

        const union = entrySize + existingSize - intersection;
        const similarity = union === 0 ? 0 : intersection / union;

        if (similarity >= threshold) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      unique.push(entry);
      uniqueWordsList.push(entryWords);
    }
  }

  return {
    unique,
    duplicatesRemoved: entries.length - unique.length,
  };
}

// ============================================================================
// Map-Reduce Compression
// ============================================================================

/**
 * Chunk an array into groups of the specified size.
 */
function chunkArray<T>(arr: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Summarize a chunk of entries into a single summary string.
 * Concatenates content with semicolons, preserving temporal ordering.
 */
function summarizeChunk(chunk: readonly CompressibleEntry[]): string {
  return chunk.map((e) => e.content).join('; ');
}

/**
 * Compress an array of entries using the Primacy-Recency Split algorithm.
 *
 * @param entries - The entries to compress
 * @param chunkSize - Number of entries per map-reduce chunk (default: 5)
 * @returns CompressionResult with preserved entries, summaries, and entities
 */
export function compressEntries(
  entries: readonly CompressibleEntry[],
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): CompressionResult {
  if (entries.length <= 10) {
    // Too few entries to compress meaningfully
    return {
      preserved: entries,
      summaries: [],
      entities: [],
      compressedCount: 0,
      ratio: 1,
    };
  }

  const total = entries.length;

  // Primacy-Recency Split: preserve first 20% + last 10%
  const primacyCount = Math.max(1, Math.ceil(total * 0.2));
  const recencyCount = Math.max(1, Math.ceil(total * 0.1));

  const primacyZone = entries.slice(0, primacyCount);
  const recencyZone = entries.slice(total - recencyCount);
  const middleZone = entries.slice(primacyCount, total - recencyCount);

  // Deduplicate middle zone before compression
  const { unique: dedupedMiddle } = deduplicateEntries(middleZone);

  // Map-Reduce: chunk and summarize
  const chunks = chunkArray(dedupedMiddle, chunkSize);
  const summaries = chunks.map(summarizeChunk);

  // Extract entities from all summaries
  const allEntities = summaries.flatMap(extractEntities);
  const uniqueEntities = Array.from(new Set(allEntities)).sort((a, b) => a.localeCompare(b));

  // Calculate compression ratio
  const originalLength = entries.reduce((sum, e) => sum + e.content.length, 0);
  const compressedLength = summaries.reduce((sum, s) => sum + s.length, 0);
  const preservedLength = [...primacyZone, ...recencyZone].reduce(
    (sum, e) => sum + e.content.length,
    0,
  );
  const ratio =
    compressedLength + preservedLength > 0
      ? originalLength / (compressedLength + preservedLength)
      : 1;

  return {
    preserved: [...primacyZone, ...recencyZone],
    summaries,
    entities: uniqueEntities,
    compressedCount: middleZone.length,
    ratio,
  };
}

// ============================================================================
// Quality Gate
// ============================================================================

/**
 * Verify that compression retained at least the specified percentage
 * of original entities. Per APEX-MEMORY III.1: >=90% retention required.
 *
 * @param originalEntities - Entities from the original content
 * @param compressedEntities - Entities from the compressed output
 * @param threshold - Required retention ratio (default: 0.9)
 * @returns true if quality gate passes
 */
export function verifyRetention(
  originalEntities: readonly string[],
  compressedEntities: readonly string[],
  threshold: number = 0.9,
): boolean {
  if (originalEntities.length === 0) return true;

  const originalSet = new Set(originalEntities);
  const compressedSet = new Set(compressedEntities);

  let retained = 0;
  for (const entity of originalSet) {
    if (compressedSet.has(entity)) retained++;
  }

  return retained / originalSet.size >= threshold;
}
