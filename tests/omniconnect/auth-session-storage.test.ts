import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authSessionStorage } from '@/omniconnect/storage/auth-session-storage';

describe('AuthSessionStorage', () => {
  const mockState = 'test-state-123';
  const mockVerifier = 'test-verifier-abc';

  beforeEach(async () => {
    await authSessionStorage.clearSession(mockState);
    vi.useRealTimers();
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

  it('should expire session after TTL', async () => {
    vi.useFakeTimers();
    const state = 'state-ttl';
    const verifier = 'verifier-ttl';

    await authSessionStorage.storeSession(state, verifier);
    expect(await authSessionStorage.retrieveSession(state)).toBe(verifier);

    // Fast-forward time by 15 minutes + 1ms
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    expect(await authSessionStorage.retrieveSession(state)).toBeNull();
    vi.useRealTimers();
  });
});
