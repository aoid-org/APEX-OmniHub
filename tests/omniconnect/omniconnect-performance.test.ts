
import { describe, it, expect, vi } from 'vitest';
import { OmniConnect } from '@/omniconnect/core/omniconnect';

// Mock the storage and other services
vi.mock('@/omniconnect/storage/encrypted-storage', () => {
  const MockEncryptedTokenStorage = vi.fn(function(this: Record<string, unknown>) {
    this.listActive = vi.fn().mockResolvedValue([]);
    this.get = vi.fn();
    this.store = vi.fn();
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
