/**
 * AgentCard — A2A Agent Card Registry & Ingestion
 * @version 1.0.0
 * @module src/omnihub-gateway/AgentCard
 *
 * Manages the registry of A2A-compliant agent cards.
 * Each external agent publishes an Agent Card at `/.well-known/agent.json`.
 * This module ingests, validates, and indexes those cards for the
 * SemanticRouter to query.
 *
 * APEX STANDARDS ENFORCED:
 * - Zod validation on all ingested agent cards
 * - Fail-closed: Malformed cards are rejected, not partially accepted
 * - Deterministic: Skill index is rebuilt on every card mutation
 * - No polling: Cards are fetched on-demand or via webhook push
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { AgentCardSchema, type AgentCard } from './types';
import { registerAgentViaWorkflow } from './TemporalBridge';

// ============================================================================
// Agent Card Registry
// ============================================================================

export interface RegisteredAgent {
  readonly card: AgentCard;
  readonly registeredAt: string;
  readonly lastHealthCheck?: string;
  readonly healthy: boolean;
}

/**
 * AgentCardRegistry — Stores and indexes A2A Agent Cards.
 */
export class AgentCardRegistry {
  private readonly agents = new Map<string, RegisteredAgent>();
  /** Inverted index: skill tag → agent URLs */
  private readonly skillIndex = new Map<string, Set<string>>();

  /**
   * Register an agent card after Zod validation.
   * Persists the registration durably via a Temporal workflow,
   * then caches locally for fast lookup.
   *
   * @param rawCard - Unvalidated agent card data
   * @returns The validated agent card
   * @throws Error if validation fails
   */
  register(rawCard: unknown): AgentCard {
    const card = AgentCardSchema.parse(rawCard);

    const entry: RegisteredAgent = {
      card,
      registeredAt: new Date().toISOString(),
      healthy: true,
    };

    this.agents.set(card.url, entry);
    this.rebuildSkillIndex();

    // Dispatch durable registration to Temporal (fire-and-forget).
    // The local cache is the source of truth for routing;
    // Temporal provides durability and health-check lifecycle.
    registerAgentViaWorkflow(card.url, card as unknown as Record<string, unknown>).catch(
      (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.warn(
          `[AgentCardRegistry] Temporal registration failed for ${card.url}: ${message}. Local cache intact.`,
        );
      },
    );

    return card;
  }

  /**
   * Fetch and register an agent card from its well-known endpoint.
   *
   * @param agentBaseUrl - Base URL of the agent (e.g., "https://agent.example.com")
   * @returns The validated agent card
   */
  async discover(agentBaseUrl: string): Promise<AgentCard> {
    const wellKnownUrl = `${agentBaseUrl.replace(/\/$/, '')}/.well-known/agent.json`;

    const response = await fetch(wellKnownUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Agent card fetch failed: ${response.status} from ${wellKnownUrl}`);
    }

    const rawCard: unknown = await response.json();
    return this.register(rawCard);
  }

  /**
   * Unregister an agent by URL.
   */
  unregister(agentUrl: string): boolean {
    const removed = this.agents.delete(agentUrl);
    if (removed) {
      this.rebuildSkillIndex();
    }
    return removed;
  }

  /**
   * Get a registered agent by URL.
   */
  getAgent(agentUrl: string): RegisteredAgent | undefined {
    return this.agents.get(agentUrl);
  }

  /**
   * List all registered agents.
   */
  listAgents(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents that have a skill matching the given tag.
   */
  findBySkillTag(tag: string): RegisteredAgent[] {
    const urls = this.skillIndex.get(tag.toLowerCase());
    if (!urls) return [];

    const results: RegisteredAgent[] = [];
    for (const url of urls) {
      const agent = this.agents.get(url);
      if (agent && agent.healthy) {
        results.push(agent);
      }
    }
    return results;
  }

  /**
   * Find agents whose skills match any of the given tags.
   * Returns agents sorted by number of matching tags (descending).
   */
  findBySkillTags(tags: string[]): RegisteredAgent[] {
    const normalizedTags = tags.map((t) => t.toLowerCase());
    const scoredAgents = new Map<string, { agent: RegisteredAgent; score: number }>();

    for (const tag of normalizedTags) {
      const urls = this.skillIndex.get(tag);
      if (!urls) continue;

      for (const url of urls) {
        const agent = this.agents.get(url);
        if (!agent || !agent.healthy) continue;

        const existing = scoredAgents.get(url);
        if (existing) {
          existing.score++;
        } else {
          scoredAgents.set(url, { agent, score: 1 });
        }
      }
    }

    return Array.from(scoredAgents.values())
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.agent);
  }

  /**
   * Get all unique skill tags across all agents.
   */
  getAllSkillTags(): string[] {
    return Array.from(this.skillIndex.keys());
  }

  /**
   * Update health status for an agent.
   */
  updateHealth(agentUrl: string, healthy: boolean): void {
    const entry = this.agents.get(agentUrl);
    if (entry) {
      this.agents.set(agentUrl, {
        ...entry,
        healthy,
        lastHealthCheck: new Date().toISOString(),
      });
    }
  }

  /**
   * Get count of registered agents.
   */
  get count(): number {
    return this.agents.size;
  }

  /**
   * Get count of healthy agents.
   */
  get healthyCount(): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.healthy) count++;
    }
    return count;
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  /**
   * Rebuild the inverted skill index from all registered agents.
   */
  private rebuildSkillIndex(): void {
    this.skillIndex.clear();

    for (const [url, entry] of this.agents) {
      for (const skill of entry.card.skills) {
        for (const tag of skill.tags) {
          const normalizedTag = tag.toLowerCase();
          let urls = this.skillIndex.get(normalizedTag);
          if (!urls) {
            urls = new Set();
            this.skillIndex.set(normalizedTag, urls);
          }
          urls.add(url);
        }

        // Also index the skill name as a tag
        const nameTag = skill.name.toLowerCase();
        let nameUrls = this.skillIndex.get(nameTag);
        if (!nameUrls) {
          nameUrls = new Set();
          this.skillIndex.set(nameTag, nameUrls);
        }
        nameUrls.add(url);
      }
    }
  }
}
