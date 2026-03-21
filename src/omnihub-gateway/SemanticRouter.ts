/**
 * SemanticRouter — A2A Task-to-Agent Routing
 * @version 1.0.0
 * @module src/omnihub-gateway/SemanticRouter
 *
 * Routes incoming A2A task requests to the most suitable registered agent
 * based on keyword matching against agent skill tags and descriptions.
 * Uses a deterministic keyword extraction + scoring algorithm.
 *
 * Integration:
 * - Reads agent capabilities from AgentCardRegistry
 * - Scores candidates by skill tag overlap + description relevance
 * - Returns ranked list of candidate agents
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: Same input always produces same ranking
 * - Fail-closed: No matching agents returns empty array (never guesses)
 * - Zero ML: Pure keyword-based scoring for reproducibility
 * - Auditable: Full scoring trace on every decision
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { AgentCardRegistry, type RegisteredAgent } from './AgentCard';

// ============================================================================
// Types
// ============================================================================

export interface RoutingCandidate {
  readonly agent: RegisteredAgent;
  readonly score: number;
  readonly matchedTags: string[];
  readonly matchedSkills: string[];
  readonly reasoning: string;
}

export interface RoutingResult {
  readonly requestId: string;
  readonly query: string;
  readonly candidates: RoutingCandidate[];
  readonly selectedAgent: RegisteredAgent | null;
  readonly timestamp: string;
}

// ============================================================================
// Keyword Extraction
// ============================================================================

/** Stop words excluded from keyword extraction */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its',
  'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'when',
  'where', 'why', 'how', 'all', 'any', 'each', 'every', 'if', 'please',
]);

/**
 * Extract meaningful keywords from a query string.
 * Returns lowercased, deduplicated keywords with stop words removed.
 */
export function extractKeywords(query: string): string[] {
  const words = query
    .toLowerCase()
    .split(/[\s,;:.!?(){}[\]"'`/\\-]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  return [...new Set(words)];
}

// ============================================================================
// Semantic Router
// ============================================================================

export class SemanticRouter {
  private readonly registry: AgentCardRegistry;

  constructor(registry: AgentCardRegistry) {
    this.registry = registry;
  }

  /**
   * Route a task query to the best matching agent.
   *
   * Algorithm:
   * 1. Extract keywords from the query
   * 2. For each registered agent:
   *    a. Score tag matches (3 points per matching tag)
   *    b. Score skill name matches (5 points per matching skill name)
   *    c. Score description keyword matches (1 point each)
   *    d. Score example matches (2 points per matching example keyword)
   * 3. Rank agents by total score (descending)
   * 4. Return top candidates (agents with score > 0)
   *
   * @param query - Task description or natural language request
   * @param requestId - Unique request identifier for audit trail
   * @returns RoutingResult with ranked candidates
   */
  route(query: string, requestId?: string): RoutingResult {
    const id = requestId ?? `rt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const keywords = extractKeywords(query);
    const agents = this.registry.listAgents();

    const candidates: RoutingCandidate[] = [];

    for (const agent of agents) {
      if (!agent.healthy) continue;

      let score = 0;
      const matchedTags: string[] = [];
      const matchedSkills: string[] = [];
      const reasonParts: string[] = [];

      for (const skill of agent.card.skills) {
        // Tag matching (3 points each)
        for (const tag of skill.tags) {
          const normalizedTag = tag.toLowerCase();
          if (keywords.includes(normalizedTag)) {
            score += 3;
            matchedTags.push(tag);
          }
        }

        // Skill name matching (5 points)
        const skillNameWords = skill.name.toLowerCase().split(/\s+/);
        for (const word of skillNameWords) {
          if (keywords.includes(word)) {
            score += 5;
            matchedSkills.push(skill.name);
            break; // Count each skill once
          }
        }

        // Description matching (1 point per keyword)
        const descWords = skill.description.toLowerCase().split(/\s+/);
        for (const keyword of keywords) {
          if (descWords.includes(keyword)) {
            score += 1;
          }
        }

        // Example matching (2 points per example with keyword overlap)
        for (const example of skill.examples) {
          const exampleWords = example.toLowerCase().split(/\s+/);
          if (keywords.some((kw) => exampleWords.includes(kw))) {
            score += 2;
          }
        }
      }

      // Agent-level description matching (0.5 points per keyword)
      const agentDescWords = agent.card.description.toLowerCase().split(/\s+/);
      for (const keyword of keywords) {
        if (agentDescWords.includes(keyword)) {
          score += 0.5;
        }
      }

      if (score > 0) {
        if (matchedTags.length > 0) reasonParts.push(`tags=[${matchedTags.join(',')}]`);
        if (matchedSkills.length > 0) reasonParts.push(`skills=[${matchedSkills.join(',')}]`);
        reasonParts.push(`score=${score}`);

        candidates.push({
          agent,
          score,
          matchedTags: [...new Set(matchedTags)],
          matchedSkills: [...new Set(matchedSkills)],
          reasoning: reasonParts.join('; '),
        });
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return {
      requestId: id,
      query,
      candidates,
      selectedAgent: candidates.length > 0 ? candidates[0].agent : null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Route and return only the top agent (or null if no match).
   */
  routeToAgent(query: string): RegisteredAgent | null {
    return this.route(query).selectedAgent;
  }

  /**
   * Route and return the top N candidates.
   */
  routeTopN(query: string, n: number): RoutingCandidate[] {
    return this.route(query).candidates.slice(0, n);
  }
}
