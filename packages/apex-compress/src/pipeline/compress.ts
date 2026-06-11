/**
 * Unified Input Compression Pipeline
 * @module pipeline/compress
 *
 * Chains all input-side compression phases:
 *   Phase 1: Heuristic Pruner (15–25% reduction)
 *   Phase 2: Telegraph English (40–65% reduction)
 *
 * Also exposes standalone functions for:
 *   - compressSchema() — TSCG schema compression
 *   - compressJsonPayload() — TOON serialization
 *   - buildOutputSchema() — Key aliasing for output schemas
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { CompressionConfig, CompressionResult } from '../types';
import { CompressionConfigSchema } from '../types';
import { pruneHeuristic } from '../core/heuristic-pruner';
import { compressTelegraphEnglish } from '../core/telegraph-english';
import { serializeToTOON, serializeTabularTOON } from '../core/toon-serializer';
import { compressToolSchema, type ToolSchema } from '../core/schema-compressor';
import {
  buildKeyAliasMap,
  buildCompressedSchemaInstruction,
  type KeyAliasMap,
} from '../core/key-aliaser';
import { estimateTokens, estimateReduction } from '../utils/token-estimator';

// ============================================================================
// Text Compression (Phases 1 + 2)
// ============================================================================

/**
 * Run the full input compression pipeline on text.
 *
 * Use for: system prompts, instruction blocks, context payloads.
 * NEVER use for: user messages, code, JSON data values.
 *
 * @param text - Input text to compress
 * @param config - Partial compression configuration (defaults applied)
 * @returns Compression result with metrics
 */
export function compress(
  text: string,
  config: Partial<CompressionConfig> = {},
): CompressionResult {
  const cfg = CompressionConfigSchema.parse(config);
  const phasesApplied: string[] = [];
  let current = text;

  // Phase 1: Heuristic Pruner
  if (cfg.enableHeuristicPruner) {
    current = pruneHeuristic(current, cfg.attentionSinks);
    phasesApplied.push('heuristic-pruner');
  }

  // Phase 2: Telegraph English
  if (cfg.enableTelegraphEnglish) {
    current = compressTelegraphEnglish(current, cfg.attentionSinks);
    phasesApplied.push('telegraph-english');
  }

  const originalTokenEstimate = estimateTokens(text);
  const compressedTokenEstimate = estimateTokens(current);

  return {
    original: text,
    compressed: current,
    originalTokenEstimate,
    compressedTokenEstimate,
    reductionPercent: estimateReduction(text, current),
    phasesApplied,
  };
}

// ============================================================================
// Schema Compression (Phase 4: TSCG)
// ============================================================================

/**
 * Compress a tool schema using the 8-operator TSCG pipeline.
 *
 * Use for: MCP tool schemas, function declarations, agent tool catalogs.
 *
 * @param schema - Tool/function declaration schema
 * @returns Compressed schema + reverse keyMap for inflation
 */
export function compressSchema(schema: ToolSchema) {
  return compressToolSchema(schema);
}

// ============================================================================
// JSON Payload Compression (Phase 3: TOON)
// ============================================================================

/**
 * Serialize a JSON object to TOON notation for LLM ingestion.
 *
 * Use for: structured data payloads, configuration objects.
 *
 * @param obj - Plain JavaScript object
 * @returns TOON-formatted string
 */
export function compressJsonPayload(obj: Record<string, unknown>): string {
  return serializeToTOON(obj);
}

/**
 * Serialize a uniform array of objects using TOON tabular headers.
 *
 * Achieves 43–60.7% reduction on flat, repetitive datasets by
 * declaring keys once in a schema header instead of repeating per row.
 *
 * @param name - Array name for the header
 * @param items - Array of uniform objects
 * @returns TOON tabular string
 */
export function compressTabularPayload(
  name: string,
  items: Array<Record<string, unknown>>,
): string {
  return serializeTabularTOON(name, items);
}

// ============================================================================
// Output Schema Aliasing (Phase 7: Key Aliasing)
// ============================================================================

/**
 * Build a compressed output schema instruction for LLM prompt injection.
 *
 * Use for: telling the LLM to respond with aliased single-char keys,
 * then inflating the response back to full keys post-generation.
 *
 * @param schema - Full output schema with verbose keys
 * @returns Compressed instruction string + bidirectional alias map
 */
export function buildOutputSchema(
  schema: Record<string, unknown>,
): { instruction: string; map: KeyAliasMap } {
  const keys = extractAllKeys(schema);
  const map = buildKeyAliasMap(keys);
  const instruction = buildCompressedSchemaInstruction(schema, map);
  return { instruction, map };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Recursively extract all keys from a nested object.
 */
function extractAllKeys(
  obj: unknown,
  keys: string[] = [],
): string[] {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      keys.push(k);
      extractAllKeys(v, keys);
    }
  }
  return keys;
}
