/**
 * APEX-COMPRESS Public API
 * @module index
 *
 * Zero-dependency token optimization library for APEX-OmniHub LLM pipelines.
 * Achieves 40–65% token reduction across input and output modalities.
 *
 * @example
 * ```ts
 * import { compress, compressSchema, compressJsonPayload } from '@apex/compress';
 *
 * // Compress system prompt (Heuristic + Telegraph English)
 * const result = compress(systemPrompt, { attentionSinks: ['Guardian'] });
 * console.log(result.reductionPercent); // ~45%
 *
 * // Compress tool schema (TSCG 8-operator pipeline)
 * const { compressed, keyMap } = compressSchema(toolSchema);
 *
 * // Compress JSON payload (TOON serialization)
 * const toon = compressJsonPayload({ name: 'apex', active: true });
 * ```
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// Pipeline — Input compression
export {
  compress,
  compressSchema,
  compressJsonPayload,
  compressTabularPayload,
  buildOutputSchema,
} from './pipeline/compress';

// Pipeline — Output decompression
export {
  decompressJsonPayload,
  decompressTabularPayload,
  decompressOutputKeys,
  decompressToolSchema,
} from './pipeline/decompress';

// Utilities
export { estimateTokens, estimateReduction } from './utils/token-estimator';

// Types
export type {
  CompressionConfig,
  CompressionResult,
  SchemaCompressionResult,
  TOONPrimitive,
  TOONValue,
  TOONObject,
} from './types';

export type { ToolSchema } from './core/schema-compressor';
export type { KeyAliasMap } from './core/key-aliaser';
