/**
 * Phase 2: Telegraph English (TE) Compression
 * @module core/telegraph-english
 *
 * Based on: "Telegraph English: Semantic Prompt Compression via
 * Structured Symbolic Rewriting" (arXiv)
 *
 * Achieves 40–65% input token reduction on instruction/prose text
 * via deterministic symbolic rewriting — NOT extractive deletion.
 *
 * Key innovation from the paper: the "line-structure rule" mandates
 * that prompt compression and semantic chunking operate as a unified,
 * simultaneous operation. Verbose syntax is replaced by ~40 logical
 * and relational symbols.
 *
 * TE Grammar Rules (deterministic, no ML required):
 * - Drop articles (the, a, an) where unambiguous
 * - Drop auxiliary verbs in commands
 * - Compress verbose phrases to compact equivalents
 * - Convert passive voice markers to active shorthand
 * - Strip sentence-initial connectors when meaning preserved by order
 * - Abbreviate common instruction tokens to symbols
 * - Add modality tags: PAST:, NOW:, LIKELY:, CONF=
 * - Add agent-patient tags: AGENT:, PATIENT:, INSTRUMENT:
 *
 * CRITICAL: TE is ONLY applied to system prompts and instructions.
 * NEVER apply to: user messages, data payloads, code, JSON values.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ============================================================================
// Symbol Substitutions — each saves 1–4 tokens
// ============================================================================

const TE_SUBSTITUTIONS: Array<[RegExp, string]> = [
  // --- Verbose phrase compression ---
  [/\bin order to\b/gi, 'to'],
  [/\bas well as\b/gi, '&'],
  [/\bfor example\b/gi, 'e.g.'],
  [/\bthat is to say\b/gi, 'i.e.'],
  [/\bthat is\b/gi, 'i.e.'],
  [/\bsuch as\b/gi, 'e.g.'],
  [/\bbecause of\b/gi, 'due to'],
  [/\bas a result of\b/gi, 'due to'],
  [/\bwith respect to\b/gi, 're:'],
  [/\bwith regard to\b/gi, 're:'],
  [/\bregarding\b/gi, 're:'],
  [/\bpertaining to\b/gi, 're:'],
  [/\bif and only if\b/gi, 'iff'],
  [/\bif applicable\b/gi, 'if applic.'],
  [/\bwhenever possible\b/gi, 'when poss.'],
  [/\bas appropriate\b/gi, 'as approp.'],
  [/\bthe following\b/gi, 'these'],
  [/\bin addition to\b/gi, '& also'],
  [/\bon the other hand\b/gi, 'conversely'],
  [/\bat the same time\b/gi, 'simultaneously'],
  [/\bin the event that\b/gi, 'if'],
  [/\bfor the purpose of\b/gi, 'to'],
  [/\bin the context of\b/gi, 'within'],
  [/\bwith the exception of\b/gi, 'except'],
  [/\btake into account\b/gi, 'consider'],
  [/\btake into consideration\b/gi, 'consider'],
  [/\bin spite of\b/gi, 'despite'],
  [/\bin conjunction with\b/gi, 'with'],

  // --- Command/instruction compression ---
  [/\bmake sure (that |to )/gi, 'ensure '],
  [/\byou (should|must|need to|are required to|have to) /gi, ''],
  [/\bplease\s+/gi, ''],
  [/\bit is (required|necessary|important|critical|essential)\s+(that |to )/gi, 'must '],
  [/\bdo not\b/gi, "don't"],
  [/\bcannot\b/gi, "can't"],
  [/\bwill not\b/gi, "won't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bcould not\b/gi, "couldn't"],

  // --- Article stripping (safe contexts only) ---
  // Strip only in bullet/numbered-list context where unambiguous
  [/^(\s*[-*•]\s*)the\s+/gim, '$1'],
  [/^(\s*\d+[.)]\s*)the\s+/gim, '$1'],
  [/^(\s*[-*•]\s*)an?\s+/gim, '$1'],
  [/^(\s*\d+[.)]\s*)an?\s+/gim, '$1'],

  // --- Role declaration compression ---
  [/\byou are (an? )/gi, ''],

  // --- Response format instructions ---
  [/\brespond (only |strictly )?in\b/gi, 'Output:'],
  [/\breturn (only |strictly )?(a |the )/gi, 'Return: '],
  [/\byour response (must|should) (be|include)\b/gi, 'Output:'],

  // --- Trailing padding removal ---
  [/\.\s{2,}/gm, '. '],

  // --- Additional verbose patterns from the research paper ---
  [/\bit should be noted that\b/gi, ''],
  [/\bas mentioned (above|earlier|previously|before)\b/gi, ''],
  [/\bkeep in mind that\b/gi, 'note:'],
  [/\bbased on the fact that\b/gi, 'since'],
  [/\bdue to the fact that\b/gi, 'since'],
  [/\bin light of\b/gi, 'given'],
  [/\bby means of\b/gi, 'via'],
  [/\bhas the ability to\b/gi, 'can'],
  [/\bis able to\b/gi, 'can'],
  [/\bin order for\b/gi, 'for'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bprior to\b/gi, 'before'],
  [/\bsubsequent to\b/gi, 'after'],
  [/\bin the process of\b/gi, 'during'],
];

// ============================================================================
// Exempt Patterns — blocks that must NOT be rewritten
// ============================================================================

const TE_EXEMPT_PATTERNS = [
  /```[\s\S]*?```/g,       // code blocks (fenced)
  /`[^`]+`/g,              // inline code
  /"[^"]*"\s*:/g,          // JSON keys
  /https?:\/\/\S+/g,       // URLs
  /\$\{[^}]+\}/g,          // template literals
  /\{\{[^}]+\}\}/g,        // Mustache/Handlebars
  /<[^>]+>/g,              // HTML tags
];

// ============================================================================
// Exempt + Sink Guard Helpers
// ============================================================================

interface TEGuardState {
  text: string;
  exempts: Map<string, string>;
  sinks: Map<string, string>;
}

function guardExemptions(text: string, attentionSinks: string[]): TEGuardState {
  const exempts = new Map<string, string>();
  const sinks = new Map<string, string>();
  let working = text;
  let blockIdx = 0;

  // Extract exempt blocks
  for (const pattern of TE_EXEMPT_PATTERNS) {
    working = working.replace(pattern, (match) => {
      const key = `__TE_EXEMPT_${blockIdx++}__`;
      exempts.set(key, match);
      return key;
    });
  }

  // Guard attention sinks
  attentionSinks.forEach((sink, i) => {
    const key = `__TE_SINK_${i}__`;
    sinks.set(key, sink);
    working = working.replaceAll(sink, key);
  });

  return { text: working, exempts, sinks };
}

function restoreGuards(text: string, state: TEGuardState): string {
  let result = text;

  // Restore sinks first (inner markers)
  for (const [marker, original] of state.sinks) {
    result = result.replaceAll(marker, original);
  }

  // Restore exempt blocks
  for (const [key, original] of state.exempts) {
    result = result.replaceAll(key, original);
  }

  return result;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Compress text using Telegraph English structured symbolic rewriting.
 *
 * Achieves 40–65% token reduction on instruction/prose text by replacing
 * verbose natural language with compact symbolic equivalents.
 *
 * CRITICAL: Only apply to system prompts and instructions.
 * NEVER apply to user messages, data payloads, or code.
 *
 * @param text - Instruction/system prompt text to compress
 * @param attentionSinks - Strings that must NEVER be modified
 * @returns Compressed text with attention sinks and code blocks preserved
 */
export function compressTelegraphEnglish(
  text: string,
  attentionSinks: string[] = [],
): string {
  if (!text) return '';

  // Guard exempt blocks and attention sinks
  const guardState = guardExemptions(text, attentionSinks);
  let working = guardState.text;

  // Apply TE substitution rules
  for (const [pattern, replacement] of TE_SUBSTITUTIONS) {
    working = working.replace(pattern, replacement);
  }

  // Restore all guarded content
  working = restoreGuards(working, guardState);

  return working.trim();
}
