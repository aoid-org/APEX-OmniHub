/**
 * APEX-COMPRESS: Input Densification Layer
 * Deno-compatible. Zero external dependencies.
 * Implements: Heuristic Pruner + TF-IDF Filtering
 */

export interface CompressOptions {
  attentionSinks?: string[]
  enableHeuristic?: boolean
  enableTFIDF?: boolean
  tfidfThreshold?: number
  verbose?: boolean
}

export interface CompressResult {
  original: string
  compressed: string
  originalTokens: number
  compressedTokens: number
  reductionPct: number
  phases: string[]
}

export function estimateTokens(text: string): number {
  if (!text) return 0
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.round((words * 1.3 + text.length / 4) / 2)
}

const BOILERPLATE_PATTERNS: [RegExp, string][] = [
  [/\n{3,}/g, '\n\n'],
  [/[ \t]{2,}/g, ' '],
  [/[ \t]$/gm, ''],
  [/\bplease note that\b/gi, ''],
  [/\bit is important to note that\b/gi, ''],
  [/\bfeel free to\b/gi, ''],
  [/\bas an ai language model,?\s*/gi, ''],
  [/\bcertainly[,!]?\s*/gi, ''],
  [/\bof course[,!]?\s*/gi, ''],
  [/\babsolutely[,!]?\s*/gi, ''],
]

function guardSinks(text: string, sinks: string[]): [string, Map<string, string>] {
  const guards = new Map<string, string>()
  let out = text
  sinks.forEach((sink, i) => {
    const key = `__SINK_${i}__`
    guards.set(key, sink)
    out = out.replaceAll(sink, key)
  })
  return [out, guards]
}

function restoreSinks(text: string, guards: Map<string, string>): string {
  let out = text
  for (const [key, val] of guards) out = out.replaceAll(key, val)
  return out
}

export function pruneHeuristic(text: string, sinks: string[] = []): string {
  const [guarded, guards] = guardSinks(text, sinks)
  let result = guarded
  for (const [pat, rep] of BOILERPLATE_PATTERNS) result = result.replace(pat, rep)
  return restoreSinks(result.trim(), guards)
}

function tf(sentence: string): Map<string, number> {
  const words = sentence.toLowerCase().split(/\W+/).filter(w => w.length > 2)
  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1)
  return freq
}

function buildIDF(sentences: string[]): Map<string, number> {
  const docFreq = new Map<string, number>()
  for (const s of sentences) {
    const unique = new Set(s.toLowerCase().split(/\W+/).filter(w => w.length > 2))
    for (const w of unique) docFreq.set(w, (docFreq.get(w) ?? 0) + 1)
  }
  const idf = new Map<string, number>()
  const N = sentences.length
  for (const [w, df] of docFreq) idf.set(w, Math.log((N + 1) / (df + 1)) + 1)
  return idf
}

function scoreSentence(sentence: string, idf: Map<string, number>, idx: number, total: number): number {
  const words = sentence.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const tfMap = tf(sentence)
  let tfidfScore = 0
  for (const [w, freq] of tfMap) {
    tfidfScore += (freq / wordCount) * (idf.get(w) ?? 1)
  }
  const lengthPenalty = 1 - Math.abs(wordCount - 20) / 40
  const position = idx / total
  const positionalBonus = (position < 0.15 || position > 0.85) ? 0.3 : 0
  return tfidfScore * Math.max(0, lengthPenalty) + positionalBonus
}

export function filterByTFIDF(text: string, threshold = 0.05, sinks: string[] = []): string {
  const exempts = new Map<string, string>()
  let working = text
  let exemptIdx = 0

  const CODE_BLOCK = /```[\s\S]*?```/g
  working = working.replace(CODE_BLOCK, (m) => {
    const k = `__EXEMPT_${exemptIdx++}__`
    exempts.set(k, m)
    return k
  })

  const [guarded, guards] = guardSinks(working, sinks)
  const sentences = guarded.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)

  if (sentences.length <= 3) {
    let out = guarded
    for (const [k, v] of exempts) out = out.replaceAll(k, v)
    return restoreSinks(out, guards)
  }

  const idf = buildIDF(sentences)
  const scored = sentences.map((s, i) => ({
    s,
    score: scoreSentence(s, idf, i, sentences.length),
  }))

  const maxScore = Math.max(...scored.map(x => x.score))
  const normalizedThreshold = threshold * maxScore

  const kept = scored
    .filter(x => x.score >= normalizedThreshold || x.s.startsWith('__'))
    .map(x => x.s)
    .join(' ')

  let out = kept
  for (const [k, v] of exempts) out = out.replaceAll(k, v)
  return restoreSinks(out, guards)
}

export function compress(text: string, opts: CompressOptions = {}): CompressResult {
  const {
    attentionSinks = [],
    enableHeuristic = true,
    enableTFIDF = true,
    tfidfThreshold = 0.05,
  } = opts

  const phases: string[] = []
  let current = text

  if (enableHeuristic) {
    current = pruneHeuristic(current, attentionSinks)
    phases.push('heuristic')
  }
  if (enableTFIDF) {
    current = filterByTFIDF(current, tfidfThreshold, attentionSinks)
    phases.push('tfidf')
  }

  const originalTokens = estimateTokens(text)
  const compressedTokens = estimateTokens(current)
  const reductionPct = originalTokens > 0
    ? Math.round(((originalTokens - compressedTokens) / originalTokens) * 100)
    : 0

  return { original: text, compressed: current, originalTokens, compressedTokens, reductionPct, phases }
}
