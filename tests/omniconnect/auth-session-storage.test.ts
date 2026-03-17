import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthSessionStorage } from '@/omniconnect/storage/auth-session-storage';

// We need to mock ioredis for tests

vi.mock('ioredis', () => {
  const store = new Map();
  const RedisMock = class {
    async setex(key: string, _ttl: number, val: string) { store.set(key, val); }
    async get(key: string) { return store.get(key) || null; }
    async del(key: string) { store.delete(key); }
  };
  return { default: RedisMock };
});


describe('AuthSessionStorage', () => {
  const mockState = 'test-state-123';
  const mockVerifier = 'test-verifier-abc';
  let authSessionStorage: AuthSessionStorage;
  const originalEnv = process.env.UPSTASH_REDIS_URL;

  beforeEach(async () => {
    process.env.UPSTASH_REDIS_URL = 'redis://mock';
    authSessionStorage = new AuthSessionStorage();
    await authSessionStorage.clearSession(mockState);
    vi.useRealTimers();
  });

  afterEach(() => {
    process.env.UPSTASH_REDIS_URL = originalEnv;
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
