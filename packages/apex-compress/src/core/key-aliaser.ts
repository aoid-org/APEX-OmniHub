/**
 * Bidirectional JSON Key Aliaser
 * @module core/key-aliaser
 *
 * Compresses verbose JSON response schemas by aliasing keys to single chars.
 * 50–65% token reduction on structured output schemas.
 *
 * Usage pattern for LLM output compression:
 *   1. Before calling LLM: alias the schema, inject compressed schema into prompt
 *   2. LLM responds with aliased keys (single chars)
 *   3. After LLM response: inflate keys back to originals
 *   4. Parse and validate with Zod against original schema
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ============================================================================
// Alias Generation
// ============================================================================

const ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a short alias from a counter value.
 * 0-51 → a-z,A-Z; 52+ → aa, ab, etc.
 */
function generateAlias(n: number): string {
  if (n < 52) return ALPHA[n];
  const outer = Math.floor(n / 52) - 1;
  const inner = n % 52;
  return ALPHA[outer] + ALPHA[inner];
}

// ============================================================================
// Types
// ============================================================================

export interface KeyAliasMap {
  /** original key → alias */
  compress: Record<string, string>;
  /** alias → original key */
  inflate: Record<string, string>;
}

// ============================================================================
// Map Builder
// ============================================================================

/**
 * Build a bidirectional alias map from a list of schema keys.
 * Only aliases keys longer than 2 characters (single/double-char keys
 * are already efficient and aliasing them would increase cognitive load).
 *
 * @param schemaKeys - All keys from the target schema (in order)
 * @returns Bidirectional compress/inflate map
 */
export function buildKeyAliasMap(schemaKeys: string[]): KeyAliasMap {
  let counter = 0;
  const compress: Record<string, string> = {};
  const inflate: Record<string, string> = {};

  for (const key of schemaKeys) {
    if (key.length > 2) {
      const alias = generateAlias(counter++);
      compress[key] = alias;
      inflate[alias] = key;
    }
  }

  return { compress, inflate };
}

// ============================================================================
// Recursive Key Transformation
// ============================================================================

/**
 * Recursively alias all keys in a JSON structure.
 * Traverses objects and arrays, replacing keys per the compress map.
 *
 * @param obj - Source object/array/value
 * @param map - Key alias compress map (original→alias)
 * @returns New structure with aliased keys
 */
export function aliasJsonKeys(
  obj: unknown,
  map: KeyAliasMap['compress'],
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => aliasJsonKeys(item, map));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const aliasedKey = map[k] || k;
      result[aliasedKey] = aliasJsonKeys(v, map);
    }
    return result;
  }
  return obj;
}

/**
 * Recursively inflate all aliased keys in a JSON structure.
 * Reverses the aliasing performed by aliasJsonKeys().
 *
 * @param obj - Structure with aliased keys
 * @param map - Key alias inflate map (alias→original)
 * @returns New structure with original keys restored
 */
export function inflateJsonKeys(
  obj: unknown,
  map: KeyAliasMap['inflate'],
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => inflateJsonKeys(item, map));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const originalKey = map[k] || k;
      result[originalKey] = inflateJsonKeys(v, map);
    }
    return result;
  }
  return obj;
}

// ============================================================================
// Schema Instruction Builder
// ============================================================================

/**
 * Build a compressed schema instruction string for injection into LLM prompts.
 * The instruction tells the model to respond using aliased single-char keys.
 *
 * @param originalSchema - Full schema with original keys
 * @param map - Bidirectional alias map
 * @returns Compressed instruction string for prompt injection
 */
export function buildCompressedSchemaInstruction(
  originalSchema: Record<string, unknown>,
  map: KeyAliasMap,
): string {
  const aliased = aliasJsonKeys(originalSchema, map.compress);
  return `Respond ONLY with valid JSON matching this schema (single-char keys): ${JSON.stringify(aliased)}`;
}
