import { expect, test, describe, beforeEach, mock } from "bun:test";
import {
  connectorRegistry,
  registerConnector,
  getConnector,
  hasConnector,
  listConnectors,
  availableIntegrations
} from '../../src/omniconnect/core/registry';
import { Connector } from '../../src/omniconnect/types/connector';

describe('Connector Registry', () => {
  beforeEach(() => {
    // Clear the registry before each test to ensure isolation
    connectorRegistry.clear();
  });

  const mockConnector = {
    provider: 'test-provider',
    getAuthUrl: mock(() => Promise.resolve('')),
    completeHandshake: mock(() => Promise.resolve({})),
    disconnect: mock(() => Promise.resolve()),
    refreshToken: mock(() => Promise.resolve({})),
    fetchDelta: mock(() => Promise.resolve([])),
    normalizeToCanonical: mock(() => Promise.resolve([])),
    validateToken: mock(() => Promise.resolve(true)),
  } as unknown as Connector;

  test('should register and get a connector', () => {
    registerConnector('test-provider', mockConnector);
    const retrieved = getConnector('test-provider');
    expect(retrieved).toBe(mockConnector);
  });

  test('should throw error when registering a duplicate provider', () => {
    registerConnector('test-provider', mockConnector);
    expect(() => registerConnector('test-provider', mockConnector)).toThrow(
      "Connector for provider 'test-provider' is already registered"
    );
  });

  test('should return undefined for non-existent provider', () => {
    const retrieved = getConnector('non-existent');
    expect(retrieved).toBeUndefined();
  });

  test('should correctly identify if a connector is registered', () => {
    expect(hasConnector('test-provider')).toBe(false);
    registerConnector('test-provider', mockConnector);
    expect(hasConnector('test-provider')).toBe(true);
  });

  test('should list all registered providers', () => {
    registerConnector('p1', { ...mockConnector, provider: 'p1' } as any);
    registerConnector('p2', { ...mockConnector, provider: 'p2' } as any);

    const list = listConnectors();
    expect(list).toContain('p1');
    expect(list).toContain('p2');
    expect(list.length).toBe(2);
  });

  test('should unregister a connector', () => {
    registerConnector('test-provider', mockConnector);
    expect(hasConnector('test-provider')).toBe(true);

    const result = connectorRegistry.unregister('test-provider');
    expect(result).toBe(true);
    expect(hasConnector('test-provider')).toBe(false);
  });

  test('should return false when unregistering non-existent provider', () => {
    const result = connectorRegistry.unregister('non-existent');
    expect(result).toBe(false);
  });

  test('should clear all connectors', () => {
    registerConnector('p1', mockConnector);
    registerConnector('p2', mockConnector);

    connectorRegistry.clear();
    expect(listConnectors().length).toBe(0);
  });

  describe('availableIntegrations', () => {
    test('should be an array of integration definitions', () => {
      expect(Array.isArray(availableIntegrations)).toBe(true);
      expect(availableIntegrations.length).toBeGreaterThan(0);

      const first = availableIntegrations[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('type');
      expect(first).toHaveProperty('description');
      expect(first).toHaveProperty('icon');
      expect(first).toHaveProperty('requiresApiKey');
    });

    test('should contain expected integrations', () => {
      const types = availableIntegrations.map(i => i.type);
      expect(types).toContain('whatsapp');
      expect(types).toContain('facebook');
      expect(types).toContain('gmail');
      expect(types).toContain('chatgpt');
    });
  });
});
