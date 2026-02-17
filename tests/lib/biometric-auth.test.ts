import { describe, it, expect, vi, afterEach } from 'vitest';
import { isBiometricAuthSupported, isPlatformAuthenticatorAvailable } from '@/lib/biometric-auth';

describe('biometric-auth', () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;

  afterEach(() => {
    // Restore global objects after each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = originalWindow;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).navigator = originalNavigator;
  });

  describe('isBiometricAuthSupported', () => {
    it('should return false in SSR environment (no window)', () => {
      // Simulate SSR by hiding window
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).window;

      const result = isBiometricAuthSupported();
      expect(result).toBe(false);
    });

    it('should return false if PublicKeyCredential is not a function', () => {
      // Ensure window exists but PublicKeyCredential is missing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = { ...originalWindow };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global.window as any).PublicKeyCredential;

      const result = isBiometricAuthSupported();
      expect(result).toBe(false);
    });

    it('should return false if navigator.credentials is undefined', () => {
      // Ensure window exists and PublicKeyCredential is present
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = {
        ...originalWindow,
        PublicKeyCredential: vi.fn(),
      };

      // Mock navigator without credentials
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).navigator = { ...originalNavigator };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global.navigator as any).credentials;

      const result = isBiometricAuthSupported();
      expect(result).toBe(false);
    });

    it('should return true if all APIs are available', () => {
      // Mock full browser support
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = {
        ...originalWindow,
        PublicKeyCredential: vi.fn(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).navigator = {
        ...originalNavigator,
        credentials: { create: vi.fn(), get: vi.fn() },
      };

      const result = isBiometricAuthSupported();
      expect(result).toBe(true);
    });
  });

  describe('isPlatformAuthenticatorAvailable', () => {
    it('should return false if biometric auth not supported', async () => {
      // Simulate SSR environment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).window;

      const result = await isPlatformAuthenticatorAvailable();
      expect(result).toBe(false);
    });

    it('should call window.PublicKeyCredential method', async () => {
      const mockMethod = vi.fn().mockResolvedValue(true);

      // Mock PublicKeyCredential as a function (constructor) with static method
      const MockPKC = function() {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (MockPKC as any).isUserVerifyingPlatformAuthenticatorAvailable = mockMethod;

      // Setup window with method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = {
        ...originalWindow,
        PublicKeyCredential: MockPKC,
      };

      // Setup navigator
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).navigator = {
        ...originalNavigator,
        credentials: { create: vi.fn(), get: vi.fn() },
      };

      const result = await isPlatformAuthenticatorAvailable();

      expect(result).toBe(true);
      expect(mockMethod).toHaveBeenCalled();
    });

    it('should return false if check throws error', async () => {
      const mockMethod = vi.fn().mockRejectedValue(new Error('Failed'));

      // Mock PublicKeyCredential as a function (constructor) with static method
      const MockPKC = function() {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (MockPKC as any).isUserVerifyingPlatformAuthenticatorAvailable = mockMethod;

      // Setup window with failing method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = {
        ...originalWindow,
        PublicKeyCredential: MockPKC,
      };

      // Setup navigator
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).navigator = {
        ...originalNavigator,
        credentials: { create: vi.fn(), get: vi.fn() },
      };

      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await isPlatformAuthenticatorAvailable();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
