import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetaBusinessConnector } from '@/omniconnect/connectors/meta-business';
import { authSessionStorage } from '@/omniconnect/storage/auth-session-storage';
import { ConnectorConfig } from '@/omniconnect/types/connector';

// Subclass to mock protected methods and expose internals for testing
class TestMetaConnector extends MetaBusinessConnector {
  // Mock the network call
  protected async exchangeCodeForToken(code: string, codeVerifier: string): Promise<unknown> {
    return {
      access_token: `mock_access_token_${code}_${codeVerifier}`,
      token_type: 'bearer',
      expires_in: 3600
    };
  }
}

describe('MetaBusinessConnector Session Storage', () => {
  const config: ConnectorConfig = {
    provider: 'meta_business',
    clientId: 'test-client-id',
    redirectUri: 'http://localhost/callback',
    scopes: ['test-scope'],
    baseUrl: 'https://graph.facebook.com'
  };

  let connector: TestMetaConnector;
  const userId = 'user-123';
  const tenantId = 'tenant-456';
  const state = 'test-state-xyz';

  beforeEach(async () => {
    connector = new TestMetaConnector(config);
    // Clear storage before each test
    // We can't easily clear the real storage singleton if we don't expose clearAll,
    // but we can clear specific keys or rely on random state.
    // For this test, we'll just be careful.
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store code verifier in session during getAuthUrl', async () => {
    const storeSpy = vi.spyOn(authSessionStorage, 'storeSession');

    const url = await connector.getAuthUrl(userId, tenantId, state);

    expect(url).toContain('code_challenge=');
    expect(storeSpy).toHaveBeenCalledTimes(1);
    expect(storeSpy).toHaveBeenCalledWith(state, expect.any(String));

    // Verify it's actually in storage
    const storedVerifier = await authSessionStorage.retrieveSession(state);
    expect(storedVerifier).toBeTruthy();
    expect(storedVerifier?.length).toBeGreaterThan(0);
  });

  it('should retrieve code verifier from session during completeHandshake', async () => {
    // 1. Generate auth URL to populate storage
    await connector.getAuthUrl(userId, tenantId, state);

    const storedVerifier = await authSessionStorage.retrieveSession(state);
    expect(storedVerifier).toBeTruthy();

    const retrieveSpy = vi.spyOn(authSessionStorage, 'retrieveSession');
    const clearSpy = vi.spyOn(authSessionStorage, 'clearSession');

    // 2. Complete handshake with empty/dummy verifier argument
    // This simulates the case where the caller doesn't have the verifier
    const sessionToken = await connector.completeHandshake(
      userId,
      tenantId,
      'test-auth-code',
      '', // Passing empty string to force lookup (although code logic prefers lookup anyway)
      state
    );

    expect(retrieveSpy).toHaveBeenCalledWith(state);
    expect(sessionToken.token).toContain(storedVerifier!);
    // The mock exchangeCodeForToken includes the verifier in the token string, confirming it was used.

    expect(clearSpy).toHaveBeenCalledWith(state);

    // Verify storage is cleared
    const storedVerifierAfter = await authSessionStorage.retrieveSession(state);
    expect(storedVerifierAfter).toBeNull();
  });

  it('should throw error if verifier is missing from session and argument', async () => {
    const freshState = 'state-no-session';

    await expect(connector.completeHandshake(
      userId,
      tenantId,
      'code',
      '', // No verifier provided
      freshState
    )).rejects.toThrow('Code verifier not found in session and not provided');
  });

  it('should fallback to argument if session is missing', async () => {
    const freshState = 'state-fallback';
    const manualVerifier = 'manual-verifier';

    const sessionToken = await connector.completeHandshake(
      userId,
      tenantId,
      'code',
      manualVerifier,
      freshState
    );

    expect(sessionToken.token).toContain(manualVerifier);
  });
});
