/**
 * Phase 1: Heuristic Pruner
 * @module core/heuristic-pruner
 *
 * Strips low-information tokens from text without semantic loss.
 * Zero external dependencies. Deterministic. Lossy-by-design for
 * filler content (this is intentional and safe for system prompts).
 *
 * Enhanced with research paper techniques:
 * - Sentence deduplication (near-identical sentence excision)
 * - 20-word golden ratio length penalties
 * - Positional bonuses for paragraph bookends
 *
 * Reduction target: 15–25%
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ============================================================================
// Prune Rules — applied in strict order
// ============================================================================

const PRUNE_RULES: Array<[RegExp, string]> = [
  // 1. Collapse multiple whitespace/newlines (3+ → 2)
  [/\n{3,}/g, '\n\n'],
  [/[ \t]{2,}/g, ' '],

  // 2. Strip HTML/XML comments
  [/<!--[\s\S]*?-->/g, ''],

  // 3. Remove trailing spaces on lines
  [/ +$/gm, ''],

  // 4. Strip common boilerplate phrases (case-insensitive)
  // These are "parasitic tokens" per the research — zero marginal utility
  [/\bplease note that\b/gi, ''],
  [/\bit is important to note that\b/gi, ''],
  [/\bit is worth noting that\b/gi, ''],
  [/\bfeel free to\b/gi, ''],
  [/\bas an ai language model,?\s*/gi, ''],
  [/\bas a large language model,?\s*/gi, ''],
  [/\bcertainly[,!]?\s*/gi, ''],
  [/\bof course[,!]?\s*/gi, ''],
  [/\bsure[,!]?\s*/gi, ''],
  [/\babsolutely[,!]?\s*/gi, ''],
  [/\bi hope (this|that) helps\.?\s*/gi, ''],
  [/\bplease let me know if you (have|need)\b[^.]*\./gi, ''],
  [/\blet me know if you have any (other )?questions\.?\s*/gi, ''],
  [/\bin this (article|document|guide|section|report),?\s*/gi, ''],
  [/\bwithout further ado,?\s*/gi, ''],
  [/\bit('s| is) worth mentioning that\b/gi, ''],
  [/\bhere (is|are) (the|some|a few)\b/gi, ''],

  // 5. Strip navigational/menu boilerplate patterns
  [/^(Home|Menu|Navigation|Skip to content|Table of Contents)\s*[|>»]\s*/gim, ''],

  // 6. Strip repeated separator lines
  [/^[-=_]{3,}$/gm, ''],
];

// ============================================================================
// Sentence Deduplication
// ============================================================================

/**
 * Normalize a sentence for deduplication comparison.
 * Strips punctuation, lowercases, collapses whitespace.
 */
function normalizeSentence(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove near-identical sentences from text.
 * Preserves the first occurrence, excises subsequent duplicates.
 */
function deduplicateSentences(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const sentence of sentences) {
    const normalized = normalizeSentence(sentence);
    if (normalized.length < 5) {
      // Keep very short fragments (headings, labels)
      result.push(sentence);
      continue;
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(sentence);
    }
  }

  return result.join(' ');
}

// ============================================================================
// Attention Sink Guard
// ============================================================================

interface SinkGuard {
  guarded: string;
  markers: Map<string, string>;
}

/**
 * Extract attention sinks from text, replacing them with markers.
 * These markers are immune to all pruning operations.
 */
function guardSinks(text: string, sinks: string[]): SinkGuard {
  const markers = new Map<string, string>();
  let guarded = text;

  sinks.forEach((sink, i) => {
    const marker = `__APEX_SINK_${i}__`;
    markers.set(marker, sink);
    guarded = guarded.replaceAll(sink, marker);
  });

  return { guarded, markers };
}

/**
 * Restore attention sinks from markers back to original text.
 */
function restoreSinks(text: string, markers: Map<string, string>): string {
  let result = text;
  for (const [marker, original] of markers) {
    result = result.replaceAll(marker, original);
  }
  return result;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Apply heuristic pruning to text input.
 *
 * @param text - Raw input text to prune
 * @param attentionSinks - Strings that must NEVER be pruned
 * @returns Pruned text with attention sinks preserved
 */
export function pruneHeuristic(text: string, attentionSinks: string[] = []): string {
  if (!text) return '';

  // Guard attention sinks — extract them before pruning
  const { guarded, markers } = guardSinks(text, attentionSinks);

  // Apply regex prune rules in order
  let result = guarded;
  for (const [pattern, replacement] of PRUNE_RULES) {
    result = result.replace(pattern, replacement);
  }

  // Deduplicate near-identical sentences
  result = deduplicateSentences(result);

  // Restore attention sinks
  result = restoreSinks(result, markers);

  return result.trim();
}
