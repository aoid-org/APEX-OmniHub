/**
 * Basic OmniConnect functionality tests
 */

import { describe, it, expect, vi } from 'vitest';
import { OmniConnect } from '@/omniconnect/core/omniconnect';
import { MetaBusinessConnector } from '@/omniconnect/connectors/meta-business';

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

  it('should return available connectors', () => {
    const config = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      appId: 'test-app'
    };

    const omniconnect = new OmniConnect(config);
    const connectors = omniconnect.getAvailableConnectors();
    expect(connectors).toContain('meta_business');
    expect(connectors).toContain('linkedin');
  });

  it('should return demo connectors in demo mode', () => {
    const config = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      appId: 'test-app',
      enableDemoMode: true
    };

    const omniconnect = new OmniConnect(config);
    const connectors = omniconnect.getAvailableConnectors();
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
});

