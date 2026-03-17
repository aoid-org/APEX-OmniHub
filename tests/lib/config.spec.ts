import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getEnvironment,
  isProduction,
  isDevelopment,
  getFeatureFlags,
  isFeatureEnabled,
  getConfigValue,
  appConfig,
  validateEnvironment,
} from '../../src/lib/config';

vi.mock('../../src/lib/debug-logger', () => ({
  createDebugLogger: () => vi.fn(),
  debugLog: vi.fn(),
}));

describe('config', () => {
  const originalLocation = globalThis.location;

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  function mockHostname(hostname: string) {
    Object.defineProperty(globalThis, 'location', {
      value: { hostname },
      writable: true,
      configurable: true,
    });
  }

  describe('getEnvironment', () => {
    it('should return development for localhost', () => {
      mockHostname('localhost');
      expect(getEnvironment()).toBe('development');
    });

    it('should return development for 127.0.0.1', () => {
      mockHostname('127.0.0.1');
      expect(getEnvironment()).toBe('development');
    });

    it('should return staging for staging hostnames', () => {
      mockHostname('staging.apexomnihub.icu');
      expect(getEnvironment()).toBe('staging');
    });

    it('should return staging for preview hostnames', () => {
      mockHostname('preview-abc.vercel.app');
      expect(getEnvironment()).toBe('staging');
    });

    it('should return production for production hostnames', () => {
      mockHostname('apexomnihub.icu');
      expect(getEnvironment()).toBe('production');
    });
  });

  describe('isProduction / isDevelopment', () => {
    it('should return true for production hostname', () => {
      mockHostname('apexomnihub.icu');
      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
    });

    it('should return true for development hostname', () => {
      mockHostname('localhost');
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
    });
  });

  describe('getFeatureFlags', () => {
    it('should return production flags for production env', () => {
      mockHostname('apexomnihub.icu');
      const flags = getFeatureFlags();
      expect(flags.enableAnalytics).toBe(true);
      expect(flags.enableBetaFeatures).toBe(false);
      expect(flags.enableDebugMode).toBe(false);
      expect(flags.rateLimitEnabled).toBe(true);
    });

    it('should return development flags for localhost', () => {
      mockHostname('localhost');
      const flags = getFeatureFlags();
      expect(flags.enableAnalytics).toBe(false);
      expect(flags.enableBetaFeatures).toBe(true);
      expect(flags.enableDebugMode).toBe(true);
      expect(flags.rateLimitEnabled).toBe(false);
    });

    it('should return staging flags for staging env', () => {
      mockHostname('staging.apexomnihub.icu');
      const flags = getFeatureFlags();
      expect(flags.enableBetaFeatures).toBe(true);
      expect(flags.enableDebugMode).toBe(true);
      expect(flags.enableAnalytics).toBe(true);
    });
  });

  describe('isFeatureEnabled / getConfigValue', () => {
    it('should check boolean feature flags', () => {
      mockHostname('localhost');
      expect(isFeatureEnabled('enableDebugMode')).toBe(true);
      expect(isFeatureEnabled('enableAnalytics')).toBe(false);
    });

    it('should return config values', () => {
      mockHostname('localhost');
      expect(getConfigValue('maxFileUploadSizeMB')).toBe(50);
    });

    it('should return production config values', () => {
      mockHostname('apexomnihub.icu');
      expect(getConfigValue('maxFileUploadSizeMB')).toBe(10);
    });
  });

  describe('appConfig', () => {
    it('should have expected static values', () => {
      expect(appConfig.name).toBe('APEX OmniHub');
      expect(appConfig.apiTimeout).toBe(30000);
      expect(appConfig.maxRetries).toBe(3);
    });
  });

  describe('validateEnvironment', () => {
    it('should report missing env vars', () => {
      const result = validateEnvironment();
      // In test env, VITE_ vars are typically not set
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('missing');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.missing)).toBe(true);
    });
  });
});
