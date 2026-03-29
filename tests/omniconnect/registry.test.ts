import { expect, it, describe, beforeEach, vi } from 'vitest';
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
    getAuthUrl: vi.fn(() => Promise.resolve('')),
    completeHandshake: vi.fn(() => Promise.resolve({})),
    disconnect: vi.fn(() => Promise.resolve()),
    refreshToken: vi.fn(() => Promise.resolve({})),
    fetchDelta: vi.fn(() => Promise.resolve([])),
    normalizeToCanonical: vi.fn(() => Promise.resolve([])),
    validateToken: vi.fn(() => Promise.resolve(true)),
  } as unknown as Connector;

  it('should register and get a connector', () => {
    registerConnector('test-provider', mockConnector);
    const retrieved = getConnector('test-provider');
    expect(retrieved).toBe(mockConnector);
  });

  it('should throw error when registering a duplicate provider', () => {
    registerConnector('test-provider', mockConnector);
    expect(() => registerConnector('test-provider', mockConnector)).toThrow(
      "Connector for provider 'test-provider' is already registered"
    );
  });

  it('should return undefined for non-existent provider', () => {
    const retrieved = getConnector('non-existent');
    expect(retrieved).toBeUndefined();
  });

  it('should correctly identify if a connector is registered', () => {
    expect(hasConnector('test-provider')).toBe(false);
    registerConnector('test-provider', mockConnector);
    expect(hasConnector('test-provider')).toBe(true);
  });

  it('should list all registered providers', () => {
    registerConnector('p1', { ...mockConnector, provider: 'p1' } as unknown as Connector);
    registerConnector('p2', { ...mockConnector, provider: 'p2' } as unknown as Connector);

    const list = listConnectors();
    expect(list).toContain('p1');
    expect(list).toContain('p2');
    expect(list.length).toBe(2);
  });

  it('should unregister a connector', () => {
    registerConnector('test-provider', mockConnector);
    expect(hasConnector('test-provider')).toBe(true);

    const result = connectorRegistry.unregister('test-provider');
    expect(result).toBe(true);
    expect(hasConnector('test-provider')).toBe(false);
  });

  it('should return false when unregistering non-existent provider', () => {
    const result = connectorRegistry.unregister('non-existent');
    expect(result).toBe(false);
  });

  it('should clear all connectors', () => {
    registerConnector('p1', mockConnector);
    registerConnector('p2', mockConnector);

    connectorRegistry.clear();
    expect(listConnectors().length).toBe(0);
  });

  describe('availableIntegrations', () => {
    it('should be an array of integration definitions', () => {
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

    it('should contain expected integrations', () => {
      const types = availableIntegrations.map(i => i.type);
      expect(types).toContain('whatsapp');
      expect(types).toContain('facebook');
      expect(types).toContain('gmail');
      expect(types).toContain('chatgpt');
    });
  });
});
