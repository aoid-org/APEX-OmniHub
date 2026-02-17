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

  it('fetchDelta should use token from session', async () => {
    const session: SessionToken = {
      token: 'valid-access-token',
      expiresAt: new Date(),
      connectorId: 'test-conn-id',
      userId: 'user-1',
      tenantId: 'tenant-1',
      provider: 'meta_business',
      scopes: []
    };

    const mockPostsResponse = {
      data: [
        {
          id: 'post-1',
          message: 'Test post',
          created_time: '2024-01-01T12:00:00Z',
          type: 'status'
        }
      ]
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPostsResponse)
    } as Response);

    await connector.fetchDelta(session, new Date());

    // Check that the fetch call included the Authorization header with the token from the session
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/me/posts'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer valid-access-token'
        })
      })
    );
  });

  it('validateToken should use token from session', async () => {
    const session: SessionToken = {
      token: 'valid-access-token',
      expiresAt: new Date(),
      connectorId: 'test-conn-id',
      userId: 'user-1',
      tenantId: 'tenant-1',
      provider: 'meta_business',
      scopes: []
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'user-id' })
    } as Response);

    const isValid = await connector.validateToken(session);

    expect(isValid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/me'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer valid-access-token'
        })
      })
    );
  });

  it('fetchDelta should return mock data in Demo Mode', async () => {
    const session: SessionToken = {
      token: 'DEMO_token_123',
      expiresAt: new Date(),
      connectorId: 'demo-conn-id',
      userId: 'user-1',
      tenantId: 'tenant-1',
      provider: 'meta_business',
      scopes: []
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const events = await connector.fetchDelta(session, new Date());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expect(events[0].metadata?.isDemo).toBe(true);
    expect(events[0].id).toBe('demo_post_1');
  });

  it('validateToken should return true immediately in Demo Mode', async () => {
    const session: SessionToken = {
      token: 'DEMO_token_123',
      expiresAt: new Date(),
      connectorId: 'demo-conn-id',
      userId: 'user-1',
      tenantId: 'tenant-1',
      provider: 'meta_business',
      scopes: []
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const isValid = await connector.validateToken(session);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(isValid).toBe(true);
  });
});
