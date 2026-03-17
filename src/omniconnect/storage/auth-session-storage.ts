/**
 * Auth Session Storage
 * Temporary storage for OAuth2/PKCE state and code verifiers.
 *
 * NOTE: This implementation uses in-memory storage suitable for single-instance deployments.
 * For horizontally scaled environments, this should be replaced with a distributed cache like Redis.
 */

import Redis from 'ioredis';

export class AuthSessionStorage {
  private redis: Redis | null = null;
  private readonly TTL_SECONDS = 15 * 60; // 15 minutes TTL

  constructor() {
    // Attempt to initialize Redis from environment
    const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    } else {
      console.warn('No REDIS_URL provided for AuthSessionStorage');
    }
  }

  private getKey(state: string): string {
    return `omni:oauth:session:${state}`;
  }

  /**
   * Store the code verifier associated with a specific state.
   * @param state The state parameter used in the OAuth flow.
   * @param codeVerifier The PKCE code verifier to store.
   */
  async storeSession(state: string, codeVerifier: string): Promise<void> {
    if (!this.redis) return;

    try {
      const key = this.getKey(state);
      await this.redis.setex(key, this.TTL_SECONDS, codeVerifier);
    } catch (e) {
      console.error('Failed to store session in Redis:', e);
    }
  }

  /**
   * Retrieve the code verifier for a given state.
   * @param state The state parameter used to look up the verifier.
   * @returns The code verifier if found, otherwise null.
   */
  async retrieveSession(state: string): Promise<string | null> {
    if (!this.redis) return null;

    try {
      const key = this.getKey(state);
      return await this.redis.get(key);
    } catch (e) {
      console.error('Failed to retrieve session from Redis:', e);
      return null;
    }
  }

  /**
   * Remove the session for a given state.
   * @param state The state parameter to clear.
   */
  async clearSession(state: string): Promise<void> {
    if (!this.redis) return;

    try {
      const key = this.getKey(state);
      await this.redis.del(key);
    } catch (e) {
      console.error('Failed to clear session in Redis:', e);
    }
  }
}

// Export a singleton instance for use across the application
export const authSessionStorage = new AuthSessionStorage();