import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetaBusinessConnector } from '@/omniconnect/connectors/meta-business';
import { SessionToken } from '@/omniconnect/types/connector';

describe('MetaBusinessConnector', () => {
  let connector: MetaBusinessConnector;
  const config = {
    provider: 'meta_business',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'https://example.com/callback',
    scopes: ['pages_read_engagement'],
    baseUrl: 'https://graph.facebook.com/v18.0'
  };

  beforeEach(() => {
    connector = new MetaBusinessConnector(config);
    vi.clearAllMocks();
  });

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
