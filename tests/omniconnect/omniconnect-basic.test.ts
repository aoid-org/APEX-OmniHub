/**
 * Basic OmniConnect functionality tests
 */

import { describe, it, expect, vi } from 'vitest';
import { OmniConnect } from '@/omniconnect/core/omniconnect';
import { MetaBusinessConnector } from '@/omniconnect/connectors/meta-business';
import { getConnector, registerConnector, connectorRegistry } from '@/omniconnect/core/registry';
import { Connector } from '@/omniconnect/types/connector';

// Mock the registry to avoid importing missing lucide-react dependency
vi.mock('@/omniconnect/core/registry', () => ({
  getConnector: vi.fn(),
  registerConnector: vi.fn(),
  availableIntegrations: [],
  connectorRegistry: {
    register: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    has: vi.fn()
  }
}));

// Mock the storage and other services using function constructors
// Note: Vitest requires function (not arrow) syntax for constructors to work with `new`
vi.mock('@/omniconnect/storage/encrypted-storage', () => {
  const MockEncryptedTokenStorage = vi.fn(function(this: Record<string, unknown>) {
    this.store = vi.fn();
    this.get = vi.fn();
    this.listActive = vi.fn().mockResolvedValue([]);
    this.delete = vi.fn();
    this.listByProvider = vi.fn().mockResolvedValue([]);
    this.getLastSync = vi.fn().mockResolvedValue(new Date(0));
    this.updateLastSync = vi.fn();
  });
  return { EncryptedTokenStorage: MockEncryptedTokenStorage };
});

vi.mock('@/omniconnect/policy/policy-engine', () => {
  const MockPolicyEngine = vi.fn(function(this: Record<string, unknown>) {
    this.filter = vi.fn().mockResolvedValue([]);
  });
  return { PolicyEngine: MockPolicyEngine };
});

vi.mock('@/omniconnect/translation/translator', () => {
  const MockSemanticTranslator = vi.fn(function(this: Record<string, unknown>) {
    this.translate = vi.fn().mockResolvedValue([]);
  });
  return { SemanticTranslator: MockSemanticTranslator };
});

vi.mock('@/omniconnect/entitlements/entitlements-service', () => {
  const MockEntitlementsService = vi.fn(function(this: Record<string, unknown>) {
    this.checkEntitlement = vi.fn().mockResolvedValue(true);
  });
  return { EntitlementsService: MockEntitlementsService };
});

vi.mock('@/omniconnect/delivery/omnilink-delivery', () => {
  const MockOmniLinkDelivery = vi.fn(function(this: Record<string, unknown>) {
    this.deliverBatch = vi.fn().mockResolvedValue(0);
  });
  return { OmniLinkDelivery: MockOmniLinkDelivery };
});

describe('OmniConnect Basic Functionality', () => {
  it('should create OmniConnect instance', () => {
    const config = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      appId: 'test-app'
    };

    const omniconnect = new OmniConnect(config);
    expect(omniconnect).toBeDefined();
  });

  it('should check entitlements correctly', async () => {
    const config = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      appId: 'test-app'
    };

    const omniconnect = new OmniConnect(config);
    const isEnabled = await omniconnect.isEnabled();
    expect(isEnabled).toBe(true);
  });

  it('should return available connectors', async () => {
    const config = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      appId: 'test-app'
    };

    const omniconnect = new OmniConnect(config);
    const connectors = await omniconnect.getAvailableConnectors();
    expect(connectors).toContain('meta_business');
    expect(connectors).toContain('linkedin');
  });

  it('should return demo connectors in demo mode', async () => {
    const config = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      appId: 'test-app',
      enableDemoMode: true
    };

    const omniconnect = new OmniConnect(config);
    const connectors = await omniconnect.getAvailableConnectors();
    expect(connectors).toContain('meta_business_demo');
    expect(connectors).toContain('linkedin_demo');
  });

  it('should register Meta Business connector', () => {
    const config = {
      provider: 'meta_business',
      clientId: 'test-client-id',
      clientSecret: 'test-secret',
      redirectUri: 'https://example.com/callback',
      scopes: ['pages_read_engagement', 'pages_show_list'],
      baseUrl: 'https://graph.facebook.com/v18.0'
    };

    const connector = new MetaBusinessConnector(config);
    expect(connector).toBeDefined();
    expect(connector.provider).toBe('meta_business');
  });

  it('should propagate context to normalizeToCanonical during sync', async () => {
    const config = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      appId: 'test-app'
    };
    const omniconnect = new OmniConnect(config);

    // Mock storage
    const storage = (omniconnect as unknown as { tokenStorage: Record<string, unknown> }).tokenStorage;
    vi.spyOn(storage, 'listActive').mockResolvedValue([{ connectorId: 'mock-conn-1', provider: 'mock-provider', createdAt: new Date(), lastSyncAt: new Date() }]);
    vi.spyOn(storage, 'get').mockResolvedValue({
      provider: 'mock-provider',
      token: 'test',
      expiresAt: new Date(),
      connectorId: 'mock-conn-1',
      userId: 'test-user',
      tenantId: 'test-tenant',
      scopes: []
    });
    vi.spyOn(storage, 'getLastSync').mockResolvedValue(new Date());
    vi.spyOn(storage, 'updateLastSync').mockResolvedValue(undefined);

    // Create and register mock connector
    const normalizeSpy = vi.fn().mockResolvedValue([]);
    const mockConnector = {
      provider: 'mock-provider',
      validateToken: vi.fn().mockResolvedValue(true),
      fetchDelta: vi.fn().mockResolvedValue([{ id: '1', data: {}, type: 'test', timestamp: new Date().toISOString() }]),
      normalizeToCanonical: normalizeSpy,
      refreshToken: vi.fn(),
      disconnect: vi.fn(),
      getAuthUrl: vi.fn(),
      completeHandshake: vi.fn()
    } as unknown as Connector;

    // Check if already registered to avoid error
    if (!connectorRegistry.has('mock-provider')) {
      registerConnector('mock-provider', mockConnector);
    }

    // Mock getConnector to return our mock connector
    vi.mocked(getConnector).mockReturnValue(mockConnector);

    // Run sync
    await omniconnect.syncAll();

    // Verify
    expect(normalizeSpy).toHaveBeenCalled();
    const callArgs = normalizeSpy.mock.calls[0];
    const context = callArgs[1];

    expect(context).toBeDefined();
    expect(context.userId).toBe('test-user');
    expect(context.tenantId).toBe('test-tenant');
    expect(context.correlationId).toBeDefined();
    expect(typeof context.correlationId).toBe('string');
  });

  it('should pass full session to fetchDelta and validateToken', async () => {
    const config = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      appId: 'test-app'
    };
    const omniconnect = new OmniConnect(config);

    const mockSession = {
      token: 'test-access-token',
      connectorId: 'mock-conn-1',
      userId: 'test-user',
      tenantId: 'test-tenant',
      provider: 'mock-provider',
      scopes: ['read'],
      expiresAt: new Date(Date.now() + 3600000)
    };

    // Setup mocks
    const storage = (omniconnect as unknown as { tokenStorage: Record<string, unknown> }).tokenStorage;
    vi.spyOn(storage, 'listActive').mockResolvedValue([
      { connectorId: 'mock-conn-1', provider: 'mock-provider' }
    ]);
    vi.spyOn(storage, 'get').mockResolvedValue(mockSession);
    vi.spyOn(storage, 'getLastSync').mockResolvedValue(new Date());
    vi.spyOn(storage, 'updateLastSync').mockResolvedValue(undefined);

    const validateSpy = vi.fn().mockResolvedValue(true);
    const fetchSpy = vi.fn().mockResolvedValue([]);

    const mockConnector = {
      provider: 'mock-provider',
      validateToken: validateSpy,
      fetchDelta: fetchSpy,
      normalizeToCanonical: vi.fn().mockResolvedValue([]),
      refreshToken: vi.fn(),
      disconnect: vi.fn(),
      getAuthUrl: vi.fn(),
      completeHandshake: vi.fn()
    } as unknown as Connector;

    // Check if already registered to avoid error
    if (!connectorRegistry.has('mock-provider')) {
      registerConnector('mock-provider', mockConnector);
    }

    vi.mocked(getConnector).mockReturnValue(mockConnector);

    await omniconnect.syncAll();

    // Verify: Full session passed, not just ID
    expect(validateSpy).toHaveBeenCalledWith(mockSession);
    expect(fetchSpy).toHaveBeenCalledWith(mockSession, expect.any(Date));
  });

  describe('OmniConnect Performance', () => {
    it('measures syncAll performance with multiple connectors using concurrency', async () => {
      const config = {
        tenantId: 'test-tenant',
        userId: 'test-user',
        appId: 'test-app'
      };
      const omniconnect = new OmniConnect(config);

      // Mock listActive to return 5 connectors
      const connectors = Array.from({ length: 5 }, (_, i) => ({
        connectorId: `id-${i}`,
        provider: 'test'
      }));

      // Accessing private members for testing purposes using a safer cast than 'any'
      const storage = (omniconnect as unknown as { tokenStorage: { listActive: (uid: string) => Promise<unknown> } }).tokenStorage;
      vi.spyOn(storage, 'listActive').mockResolvedValue(connectors);

      // Mock syncConnector to take 100ms each
      const syncConnectorSpy = vi.spyOn(omniconnect as unknown as Record<string, unknown>, 'syncConnector' as never).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { eventsProcessed: 10, eventsDelivered: 5 };
      });

      const start = Date.now();
      const result = await omniconnect.syncAll();
      const end = Date.now();
      const duration = end - start;

      console.log(`[OPTIMIZED] Duration with 5 connectors (100ms each, concurrent): ${duration}ms`);

      // Total processed should be 5 * 10 = 50
      expect(result.eventsProcessed).toBe(50);
      expect(result.eventsDelivered).toBe(25);
      expect(syncConnectorSpy).toHaveBeenCalledTimes(5);

      // Since it's concurrent, duration should be close to 100ms, definitely less than 500ms
      expect(duration).toBeLessThan(450);
    });
  });

  describe('MetaBusinessConnector Normalization', () => {
    it('should use context values in normalizeToCanonical', async () => {
      const config = {
        provider: 'meta_business',
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        redirectUri: 'https://example.com/callback',
        scopes: ['pages_read_engagement', 'pages_show_list'],
        baseUrl: 'https://graph.facebook.com/v18.0'
      };
      const connector = new MetaBusinessConnector(config);

      const rawEvents = [{
        id: 'evt-123',
        type: 'post',
        timestamp: new Date().toISOString(),
        data: {
          id: 'post-123',
          message: 'Hello World',
          created_time: new Date().toISOString(),
          type: 'status',
          likes: { count: 10 },
          comments: { count: 5 },
          shares: { count: 2 }
        },
        metadata: {
          platform: 'facebook',
          postType: 'status'
        }
      }];

      const context = {
        userId: 'real-user-id',
        tenantId: 'real-tenant-id',
        correlationId: 'real-correlation-id'
      };

      const canonicalEvents = await connector.normalizeToCanonical(rawEvents, context);

      expect(canonicalEvents).toHaveLength(1);
      expect(canonicalEvents[0].userId).toBe('real-user-id');
      expect(canonicalEvents[0].tenantId).toBe('real-tenant-id');
      expect(canonicalEvents[0].correlationId).toBe('real-correlation-id');
      expect(canonicalEvents[0].eventId).toBe('meta_evt-123');
      expect(canonicalEvents[0].source).toBe('meta_business_api');
    });
  });
});
