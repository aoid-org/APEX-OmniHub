/**
 * Auth Session Storage
 * Temporary storage for OAuth2/PKCE state and code verifiers.
 *
 * Strategy:
 * - Server/Node environments with REDIS_URL → Redis (ioredis) with 15-min TTL
 * - All other environments (browser, Capacitor, edge) → in-memory Map
 *
 * The in-memory fallback is intentionally scoped to single-instance use.
 * For horizontally scaled deployments, provide REDIS_URL.
 */

const TTL_SECONDS = 15 * 60; // 15 minutes

// ─── In-memory fallback ────────────────────────────────────────────────────

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

class InMemorySessionStorage {
  private readonly store = new Map<string, MemoryEntry>();

  async storeSession(state: string, codeVerifier: string): Promise<void> {
    this.store.set(state, {
      value: codeVerifier,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    });
  }

  async retrieveSession(state: string): Promise<string | null> {
    const entry = this.store.get(state);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(state);
      return null;
    }
    return entry.value;
  }

  async clearSession(state: string): Promise<void> {
    this.store.delete(state);
  }
}

// ─── Redis-backed storage (server/Node only) ───────────────────────────────

interface RedisLike {
  setex(key: string, ttl: number, value: string): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<unknown>;
}

class RedisSessionStorage {
  private readonly redis: RedisLike;

  constructor(redis: RedisLike) {
    this.redis = redis;
  }

  private key(state: string): string {
    return `omni:oauth:session:${state}`;
  }

  async storeSession(state: string, codeVerifier: string): Promise<void> {
    try {
      await this.redis.setex(this.key(state), TTL_SECONDS, codeVerifier);
    } catch (e) {
      console.error('Failed to store session in Redis:', e);
    }
  }

  async retrieveSession(state: string): Promise<string | null> {
    try {
      return await this.redis.get(this.key(state));
    } catch (e) {
      console.error('Failed to retrieve session from Redis:', e);
      return null;
    }
  }

  async clearSession(state: string): Promise<void> {
    try {
      await this.redis.del(this.key(state));
    } catch (e) {
      console.error('Failed to clear session in Redis:', e);
    }
  }
}

// ─── Public interface ──────────────────────────────────────────────────────

export interface IAuthSessionStorage {
  storeSession(state: string, codeVerifier: string): Promise<void>;
  retrieveSession(state: string): Promise<string | null>;
  clearSession(state: string): Promise<void>;
}

export class AuthSessionStorage implements IAuthSessionStorage {
  private readonly delegate: IAuthSessionStorage;

  constructor() {
    const redisUrl =
      (typeof process !== 'undefined' && (process.env?.UPSTASH_REDIS_URL || process.env?.REDIS_URL)) ||
      undefined;

    if (redisUrl) {
      // Dynamically require ioredis only in environments that have it (Node/server).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let Redis: any;
      try {
        // Dynamic require so bundlers don't attempt to include ioredis in browser builds.
        // This path is only reached when process.env.REDIS_URL is set (server).
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Redis = require('ioredis');
        this.delegate = new RedisSessionStorage(new Redis(redisUrl));
      } catch {
        console.warn('[AuthSessionStorage] ioredis unavailable — falling back to in-memory storage');
        this.delegate = new InMemorySessionStorage();
      }
    } else {
      this.delegate = new InMemorySessionStorage();
    }
  }

  async storeSession(state: string, codeVerifier: string): Promise<void> {
    return this.delegate.storeSession(state, codeVerifier);
  }

  async retrieveSession(state: string): Promise<string | null> {
    return this.delegate.retrieveSession(state);
  }

  async clearSession(state: string): Promise<void> {
    return this.delegate.clearSession(state);
  }
}

export const authSessionStorage = new AuthSessionStorage();
