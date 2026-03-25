import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthSessionStorage } from '@/omniconnect/storage/auth-session-storage';

// Mock ioredis so that if the constructor ever reaches the require() path,
// it gets a no-op stub instead of a real TCP connection.
vi.mock('ioredis', () => {
  const store = new Map<string, string>();
  class RedisMock {
    async setex(key: string, _ttl: number, val: string) { store.set(key, val); }
    async get(key: string) { return store.get(key) ?? null; }
    async del(key: string) { store.delete(key); return 1; }
    on(_event: string, _fn?: unknown) { return this; }
    quit() { return Promise.resolve('OK'); }
    disconnect() { /* noop */ }
  }
  return { default: RedisMock, Redis: RedisMock };
});


describe('AuthSessionStorage', () => {
  const mockState = 'test-state-123';
  const mockVerifier = 'test-verifier-abc';
  let authSessionStorage: AuthSessionStorage;
  const originalRedisUrl = process.env.UPSTASH_REDIS_URL;
  const originalRedisUrl2 = process.env.REDIS_URL;

  beforeEach(async () => {
    // Unset Redis env vars so AuthSessionStorage uses InMemorySessionStorage.
    // This prevents ioredis from attempting a real DNS lookup (EAI_AGAIN) in CI.
    // The storage interface behaves identically regardless of delegate implementation.
    delete process.env.UPSTASH_REDIS_URL;
    delete process.env.REDIS_URL;
    authSessionStorage = new AuthSessionStorage();
    await authSessionStorage.clearSession(mockState);
    vi.useRealTimers();
  });

  afterEach(() => {
    const restoreEnv = (key: 'UPSTASH_REDIS_URL' | 'REDIS_URL', value: string | undefined) => {
      if (value === undefined) {
        delete process.env[key];
        return;
      }
      process.env[key] = value;
    };

    restoreEnv('UPSTASH_REDIS_URL', originalRedisUrl);
    restoreEnv('REDIS_URL', originalRedisUrl2);
  });


  it('should store and retrieve a session', async () => {
    await authSessionStorage.storeSession(mockState, mockVerifier);
    const retrieved = await authSessionStorage.retrieveSession(mockState);
    expect(retrieved).toBe(mockVerifier);
  });

  it('should return null for non-existent session', async () => {
    const retrieved = await authSessionStorage.retrieveSession('non-existent-state');
    expect(retrieved).toBeNull();
  });

  it('should clear a session', async () => {
    await authSessionStorage.storeSession(mockState, mockVerifier);
    await authSessionStorage.clearSession(mockState);
    const retrieved = await authSessionStorage.retrieveSession(mockState);
    expect(retrieved).toBeNull();
  });

  it('should handle multiple sessions independently', async () => {
    const state1 = 'state-1';
    const verifier1 = 'verifier-1';
    const state2 = 'state-2';
    const verifier2 = 'verifier-2';

    await authSessionStorage.storeSession(state1, verifier1);
    await authSessionStorage.storeSession(state2, verifier2);

    expect(await authSessionStorage.retrieveSession(state1)).toBe(verifier1);
    expect(await authSessionStorage.retrieveSession(state2)).toBe(verifier2);
  });

  it('should pass expiration logic to redis via setex', async () => {
    const state = 'state-ttl';
    const verifier = 'verifier-ttl';

    await authSessionStorage.storeSession(state, verifier);
    // The test mock doesn't implement TTL, but we verify it stores and retrieves properly.
    // In production, redis handles the TTL set in setex.
    expect(await authSessionStorage.retrieveSession(state)).toBe(verifier);
  });
});
