/**
 * Semantic Cache — Zero-dependency in-memory implementation.
 * Uses character n-gram fingerprinting as vector proxy.
 */

interface CacheEntry {
  prompt: string
  response: string
  fingerprint: number[]
  hits: number
  createdAt: number
}

function fingerprint(text: string): number[] {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim()
  const vec = new Array<number>(128).fill(0)
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.slice(i, i + 3)
    let hash = 0
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) - hash + trigram.charCodeAt(j)) | 0
    }
    vec[Math.abs(hash) % 128] += 1
  }
  const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  return magnitude > 0 ? vec.map(v => v / magnitude) : vec
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

export class SemanticCache {
  private entries: CacheEntry[] = []
  constructor(private threshold = 0.92, private maxSize = 500) {}

  get(prompt: string): string | null {
    const fp = fingerprint(prompt)
    let bestSim = -1
    let bestEntry: CacheEntry | null = null

    for (const entry of this.entries) {
      const sim = cosineSim(fp, entry.fingerprint)
      if (sim > bestSim) { bestSim = sim; bestEntry = entry }
    }

    if (bestSim >= this.threshold && bestEntry) {
      bestEntry.hits++
      return bestEntry.response
    }
    return null
  }

  set(prompt: string, response: string): void {
    if (this.entries.length >= this.maxSize) {
      this.entries.sort((a, b) => a.hits - b.hits || a.createdAt - b.createdAt)
      this.entries.shift()
    }
    this.entries.push({
      prompt, response, fingerprint: fingerprint(prompt), hits: 0, createdAt: Date.now(),
    })
  }

  stats() {
    return { size: this.entries.length }
  }
}

export const globalSemanticCache = new SemanticCache()
