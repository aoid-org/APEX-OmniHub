/**
 * @module types
 * @description All shared interfaces and Zod schemas for APEX-COMPRESS.
 * Every other module in the package imports from this file.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';

// ============================================================================
// Compression Configuration
// ============================================================================

export const CompressionConfigSchema = z.object({
  /** Phase 1: Regex-based boilerplate and whitespace pruning */
  enableHeuristicPruner: z.boolean().default(true),
  /** Phase 2: Telegraph English structured symbolic rewriting */
  enableTelegraphEnglish: z.boolean().default(true),
  /** Phase 3: TOON (Token-Oriented Object Notation) serialization */
  enableTOON: z.boolean().default(true),
  /** Phase 4+7: Bidirectional JSON key aliasing */
  enableKeyAliasing: z.boolean().default(true),
  /** Phase 4: TSCG (Tool-Schema Compression and Generation) */
  enableTSCG: z.boolean().default(true),
  /**
   * Attention sinks: tokens the model must NEVER lose.
   * Examples: role declarations, critical constraints, tool names.
   * These are extracted before compression and re-injected after,
   * guaranteeing zero information loss on critical content.
   */
  preserveAttentionSinks: z.boolean().default(true),
  attentionSinks: z.array(z.string()).default([]),
  /** Optional hard budget for output tokens */
  maxOutputTokenBudget: z.number().positive().optional(),
  /** Enable verbose logging of compression metrics */
  verbose: z.boolean().default(false),
});

export type CompressionConfig = z.infer<typeof CompressionConfigSchema>;

// ============================================================================
// Compression Results
// ============================================================================

export const CompressionResultSchema = z.object({
  original: z.string(),
  compressed: z.string(),
  originalTokenEstimate: z.number(),
  compressedTokenEstimate: z.number(),
  reductionPercent: z.number(),
  phasesApplied: z.array(z.string()),
  /** Alias→original key map (populated when key aliasing is active) */
  keyMap: z.record(z.string(), z.string()).optional(),
});

export type CompressionResult = z.infer<typeof CompressionResultSchema>;

export const SchemaCompressionResultSchema = z.object({
  original: z.unknown(),
  compressed: z.unknown(),
  keyMap: z.record(z.string(), z.string()),
  reductionPercent: z.number(),
});

export type SchemaCompressionResult = z.infer<typeof SchemaCompressionResultSchema>;

// ============================================================================
// TOON Value Types (recursive)
// ============================================================================

export type TOONPrimitive = string | number | boolean | null;
export interface TOONObject {
  [key: string]: TOONValue;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TOONArray extends Array<TOONValue> {}
export type TOONValue = TOONPrimitive | TOONObject | TOONArray;
