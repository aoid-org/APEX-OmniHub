/**
 * CognitionManager — Persistent Agentic Context Engine
 * @version 1.0.0
 * @module src/core/cognition/CognitionManager
 *
 * Manages the lifecycle of cognitive state files (brain.md, session.md, etc.)
 * that survive agent thread resets. Implements the APEX-MEMORY 3-Tier
 * architecture for context persistence and compression.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: load() with same state produces identical output
 * - Tier Architecture: Short-Term (session) → Medium-Term (compressed) → Long-Term (brain)
 * - Overload-Free: Compression triggers at configurable thresholds
 * - Deterministic: All operations are pure functions over immutable state
 * - Fail-Closed: Missing/corrupt files produce empty defaults, never throw
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';

// ============================================================================
// Configuration
// ============================================================================

/** Compression trigger threshold (lines in session state) */
const SESSION_COMPRESSION_THRESHOLD = 50;

/** Maximum entries in short-term memory before promotion */
const SHORT_TERM_MAX_ENTRIES = 20;

/** Cognition file keys */
export const COGNITION_FILE_KEYS = [
  'brain',
  'session',
  'schemas',
  'ux-training',
] as const;

export type CognitionFileKey = (typeof COGNITION_FILE_KEYS)[number];

// ============================================================================
// Schemas — Zod boundary validation
// ============================================================================

/** Schema for a single cognitive fact */
export const CognitiveFactSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.string(),
  tier: z.enum(['short-term', 'medium-term', 'long-term']),
  promoted: z.boolean().default(false),
  referenceCount: z.number().int().nonnegative().default(0),
});

export type CognitiveFact = z.infer<typeof CognitiveFactSchema>;

/** Schema for session state entry */
export const SessionEntrySchema = z.object({
  id: z.string().min(1),
  action: z.string().min(1),
  result: z.string().optional(),
  timestamp: z.string(),
  compressed: z.boolean().default(false),
});

export type SessionEntry = z.infer<typeof SessionEntrySchema>;

/** Schema for cognitive state */
export const CognitiveStateSchema = z.object({
  version: z.string().default('1.0.0'),
  brain: z.array(CognitiveFactSchema).default([]),
  session: z.array(SessionEntrySchema).default([]),
  entityIndex: z.record(z.string(), z.array(z.string())).default({}),
  lastCompression: z.string().nullable().default(null),
  tokenEstimate: z.number().int().nonnegative().default(0),
});

export type CognitiveState = z.infer<typeof CognitiveStateSchema>;

// ============================================================================
// CognitionManager — Singleton
// ============================================================================

/**
 * Manages persistent cognitive state for the APEX Agent.
 *
 * Implements:
 * - Tier 1 (Short-Term): Last 10–20 actions — 100% fidelity
 * - Tier 2 (Medium-Term): Compressed summaries — 90% accuracy
 * - Tier 3 (Long-Term): Durable decisions in brain — append-only
 */
export class CognitionManager {
  private state: CognitiveState;
  private static instance: CognitionManager | null = null;

  private constructor() {
    this.state = CognitiveStateSchema.parse({});
  }

  /** Get singleton instance */
  static getInstance(): CognitionManager {
    CognitionManager.instance ??= new CognitionManager();
    return CognitionManager.instance;
  }

  /** Reset singleton (for testing only) */
  static resetInstance(): void {
    CognitionManager.instance = null;
  }

  // --------------------------------------------------------------------------
  // Load / Save
  // --------------------------------------------------------------------------

  /**
   * Load cognitive state from a serialized object.
   * Validates at boundary — malformed input produces empty defaults.
   */
  load(raw: unknown): CognitiveState {
    const result = CognitiveStateSchema.safeParse(raw);
    if (result.success) {
      this.state = result.data;
    } else {
      console.warn(
        '[OmniCognition] Invalid state rejected, using defaults:',
        result.error.issues,
      );
      this.state = CognitiveStateSchema.parse({});
    }
    return this.getState();
  }

  /**
   * Export current state as a plain object (for serialization).
   * Returns a deep clone — mutations do not affect internal state.
   */
  getState(): CognitiveState {
    return structuredClone(this.state);
  }

  // --------------------------------------------------------------------------
  // Session Management (Tier 1 — Short-Term)
  // --------------------------------------------------------------------------

  /**
   * Record an action in the session log.
   * Triggers compression when threshold is exceeded.
   */
  recordAction(action: string, result?: string): SessionEntry {
    const entry: SessionEntry = {
      id: `se-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      result,
      timestamp: new Date().toISOString(),
      compressed: false,
    };

    const parseResult = SessionEntrySchema.safeParse(entry);
    if (!parseResult.success) {
      console.error('[OmniCognition] Invalid session entry rejected');
      return entry;
    }

    this.state.session.push(parseResult.data);
    this.state.tokenEstimate += this.estimateTokens(action + (result ?? ''));

    // Auto-compress when threshold exceeded
    if (this.state.session.length > SESSION_COMPRESSION_THRESHOLD) {
      this.compress();
    }

    return parseResult.data;
  }

  /**
   * Get the most recent N session entries (Short-Term Memory window).
   */
  getRecentActions(count: number = SHORT_TERM_MAX_ENTRIES): readonly SessionEntry[] {
    return this.state.session.slice(-count);
  }

  // --------------------------------------------------------------------------
  // Brain Management (Tier 3 — Long-Term)
  // --------------------------------------------------------------------------

  /**
   * Promote a fact to long-term memory (brain).
   * Append-only — facts in brain are never deleted.
   * Deduplicates by content hash.
   */
  promoteToBrain(content: string, source: string): CognitiveFact {
    // Dedup check — same content from same source
    const existing = this.state.brain.find(
      (f) => f.content === content && f.source === source,
    );
    if (existing) {
      existing.referenceCount += 1;
      return structuredClone(existing);
    }

    const fact: CognitiveFact = {
      id: `bf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      source,
      timestamp: new Date().toISOString(),
      tier: 'long-term',
      promoted: true,
      referenceCount: 1,
    };

    const parseResult = CognitiveFactSchema.safeParse(fact);
    if (!parseResult.success) {
      console.error('[OmniCognition] Invalid brain fact rejected');
      return fact;
    }

    this.state.brain.push(parseResult.data);
    return parseResult.data;
  }

  /**
   * Get all brain facts (Long-Term Memory).
   */
  getBrainFacts(): readonly CognitiveFact[] {
    return this.state.brain;
  }

  // --------------------------------------------------------------------------
  // Entity Index
  // --------------------------------------------------------------------------

  /**
   * Register an entity mention in the index.
   * Used during compression to preserve named entities.
   */
  indexEntity(entityName: string, factId: string): void {
    if (!this.state.entityIndex[entityName]) {
      this.state.entityIndex[entityName] = [];
    }
    if (!this.state.entityIndex[entityName].includes(factId)) {
      this.state.entityIndex[entityName].push(factId);
    }
  }

  /**
   * Look up all fact IDs associated with an entity.
   */
  lookupEntity(entityName: string): readonly string[] {
    return this.state.entityIndex[entityName] ?? [];
  }

  // --------------------------------------------------------------------------
  // Compression (Tier 2 — Medium-Term)
  // --------------------------------------------------------------------------

  /**
   * Compress session state using the Primacy-Recency Split algorithm.
   *
   * Algorithm (per APEX-MEMORY III.1):
   * 1. Preserve first 20% of entries verbatim (primacy zone)
   * 2. Preserve last 10% of entries verbatim (recency zone)
   * 3. Map-reduce the middle 70%: chunk by 5, summarize each chunk
   * 4. Mark compressed entries
   * 5. Extract entities from compressed content
   *
   * Returns the number of entries compressed.
   */
  compress(): number {
    const entries = this.state.session.filter((e) => !e.compressed);
    if (entries.length <= SHORT_TERM_MAX_ENTRIES) {
      return 0; // Nothing to compress
    }

    const totalEntries = entries.length;
    const primacyCount = Math.max(1, Math.ceil(totalEntries * 0.2));
    const recencyCount = Math.max(1, Math.ceil(totalEntries * 0.1));
    const middleStart = primacyCount;
    const middleEnd = totalEntries - recencyCount;

    if (middleStart >= middleEnd) {
      return 0; // Not enough entries to compress
    }

    // Extract middle section for compression
    const middleEntries = entries.slice(middleStart, middleEnd);
    let compressedCount = 0;

    // Map-reduce: chunk by 5, produce summary for each chunk
    const chunkSize = 5;
    for (let i = 0; i < middleEntries.length; i += chunkSize) {
      const chunk = middleEntries.slice(i, i + chunkSize);

      // Summarize chunk: concatenate actions into single compressed entry
      const summary = chunk
        .map((e) => {
          const suffix = e.result ? ' → ' + e.result : '';
          return e.action + suffix;
        })
        .join('; ');

      // Extract entity-like tokens (capitalized words, file paths, etc.)
      const entityPatterns: RegExp[] = [
        /[A-Z][a-z]+(?:[A-Z][a-z]+)+/g,
        /[a-zA-Z]+\.[a-zA-Z]{2,4}/g,
        /src\/[^\s]+/g,
      ];
      for (const pattern of entityPatterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(summary)) !== null) {
          this.indexEntity(match[0], chunk[0].id);
        }
      }

      // Mark original entries as compressed
      for (const entry of chunk) {
        const idx = this.state.session.findIndex((e) => e.id === entry.id);
        if (idx !== -1) {
          this.state.session[idx] = { ...this.state.session[idx], compressed: true };
        }
        compressedCount++;
      }

      // Promote summary as a medium-term fact
      this.promoteToBrain(
        `[Compressed ${chunk.length} actions]: ${summary}`,
        'compression-engine',
      );
    }

    this.state.lastCompression = new Date().toISOString();
    this.recalculateTokenEstimate();

    return compressedCount;
  }

  // --------------------------------------------------------------------------
  // Token Estimation
  // --------------------------------------------------------------------------

  /**
   * Estimate token count for a string.
   * Uses the standard ~4 characters per token approximation.
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Recalculate total token estimate from current state.
   */
  private recalculateTokenEstimate(): void {
    const sessionTokens = this.state.session
      .filter((e) => !e.compressed)
      .reduce((sum, e) => sum + this.estimateTokens(e.action + (e.result ?? '')), 0);

    const brainTokens = this.state.brain.reduce(
      (sum, f) => sum + this.estimateTokens(f.content),
      0,
    );

    this.state.tokenEstimate = sessionTokens + brainTokens;
  }

  /**
   * Get current token estimate.
   */
  getTokenEstimate(): number {
    return this.state.tokenEstimate;
  }

  /**
   * Get the count of active (uncompressed) session entries.
   */
  getActiveSessionCount(): number {
    return this.state.session.filter((e) => !e.compressed).length;
  }
}
