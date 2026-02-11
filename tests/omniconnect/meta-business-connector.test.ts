import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetaBusinessConnector } from '@/omniconnect/connectors/meta-business';
import { authSessionStorage } from '@/omniconnect/storage/auth-session-storage';
import { ConnectorConfig, SessionToken } from '@/omniconnect/types/connector';

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

describe('MetaBusinessConnector', () => {
  const config: ConnectorConfig = {
    provider: 'meta_business',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost/callback',
    scopes: ['pages_read_engagement'],
    baseUrl: 'https://graph.facebook.com'
  };

  let connector: TestMetaConnector;
  const userId = 'user-123';
  const tenantId = 'tenant-456';
  const state = 'test-state-xyz';

  beforeEach(async () => {
    connector = new TestMetaConnector(config);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Storage (PKCE)', () => {
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

  describe('Token Refresh', () => {
    it('refreshToken should exchange current token for a new one', async () => {
      const session: SessionToken = {
        token: 'old-token',
        expiresAt: new Date(),
        connectorId: 'test-connector-id',
        userId: 'user-1',
        tenantId: 'tenant-1',
        provider: 'meta_business',
        scopes: ['pages_read_engagement']
      };

      const mockResponse = {
        access_token: 'new-long-lived-token',
        token_type: 'bearer',
        expires_in: 5184000 // 60 days
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const newSession = await connector.refreshToken(session);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/access_token'),
        expect.anything()
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('grant_type=fb_exchange_token'),
        expect.anything()
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('fb_exchange_token=old-token'),
        expect.anything()
      );

      expect(newSession.token).toBe('new-long-lived-token');
      expect(newSession.connectorId).toBe('test-connector-id');

      // Check if expiry is updated (approx 60 days from now)
      const now = Date.now();
      const expectedExpiry = now + 5184000 * 1000;
      expect(newSession.expiresAt.getTime()).toBeGreaterThan(now);
      // Allow small timing difference
      expect(Math.abs(newSession.expiresAt.getTime() - expectedExpiry)).toBeLessThan(5000);
    });

    it('refreshToken should throw if clientSecret is missing', async () => {
      const noSecretConfig = { ...config, clientSecret: undefined };
      const noSecretConnector = new MetaBusinessConnector(noSecretConfig);
      const session: SessionToken = {
        token: 'old-token',
        expiresAt: new Date(),
        connectorId: 'test-connector-id',
        userId: 'user-1',
        tenantId: 'tenant-1',
        provider: 'meta_business',
        scopes: []
      };

      await expect(noSecretConnector.refreshToken(session)).rejects.toThrow('Client secret is required');
    });
  });
});
