/**
 * Unified Output Decompression Pipeline
 * @module pipeline/decompress
 *
 * Provides reverse operations for all compression phases:
 *   - TOON deserialization → JSON
 *   - Key alias inflation → original keys
 *   - Tool schema inflation → original schema
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import {
  deserializeFromTOON,
  deserializeTabularTOON,
} from '../core/toon-serializer';
import { inflateJsonKeys, type KeyAliasMap } from '../core/key-aliaser';
import { inflateToolSchema, type ToolSchema } from '../core/schema-compressor';

// ============================================================================
// TOON Decompression
// ============================================================================

/**
 * Deserialize a TOON-formatted string back to a JavaScript object.
 *
 * @param toon - TOON-formatted string
 * @returns Parsed JavaScript object
 */
export function decompressJsonPayload(
  toon: string,
): Record<string, unknown> {
  return deserializeFromTOON(toon);
}

/**
 * Deserialize a TOON tabular array string back to an array of objects.
 *
 * @param toon - TOON tabular string (header + rows)
 * @returns Array of deserialized objects
 */
export function decompressTabularPayload(
  toon: string,
): Array<Record<string, unknown>> {
  return deserializeTabularTOON(toon);
}

// ============================================================================
// Key Alias Inflation
// ============================================================================

/**
 * Inflate aliased keys in an LLM response back to original keys.
 *
 * Usage:
 *   1. LLM responds with JSON using aliased single-char keys
 *   2. Parse the JSON string
 *   3. Call this function with the parsed object and the inflate map
 *   4. Validate against original Zod schema
 *
 * @param response - Raw JSON string from LLM response
 * @param map - Bidirectional alias map (from buildOutputSchema)
 * @returns Object with original keys restored
 */
export function decompressOutputKeys(
  response: string,
  map: KeyAliasMap,
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(response) as Record<string, unknown>;
    return inflateJsonKeys(parsed, map.inflate) as Record<string, unknown>;
  } catch {
    // If not valid JSON, return as-is wrapped in raw field
    return { raw: response };
  }
}

// ============================================================================
// Tool Schema Inflation
// ============================================================================

/**
 * Inflate a TSCG-compressed tool schema back to its original form.
 * Reverses all 8 TSCG operators.
 *
 * @param compressed - TSCG-compressed schema
 * @param keyMap - Alias→original key map from compression
 * @returns Inflated schema
 */
export function decompressToolSchema(
  compressed: ToolSchema,
  keyMap: Record<string, string>,
): ToolSchema {
  return inflateToolSchema(compressed, keyMap);
}
