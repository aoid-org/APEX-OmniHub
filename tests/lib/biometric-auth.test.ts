import { describe, it, expect, vi, afterEach } from 'vitest';
import { isBiometricAuthSupported, isPlatformAuthenticatorAvailable } from '@/lib/biometric-auth';

const MockPKC = function() { /* Mock PKC constructor */ };

describe('biometric-auth', () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalPKC = (globalThis as any).PublicKeyCredential;

  afterEach(() => {
    // Restore global objects after each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = originalWindow;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).navigator = originalNavigator;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).PublicKeyCredential = originalPKC;
  });

  describe('isBiometricAuthSupported', () => {
    it('should return false in SSR environment (no window)', () => {
      // Simulate SSR by hiding window
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window;

      const result = isBiometricAuthSupported();
      expect(result).toBe(false);
    });

    it('should return false if PublicKeyCredential is not a function', () => {
      // Ensure window exists but PublicKeyCredential is missing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).window = { ...originalWindow };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis.window as any).PublicKeyCredential;

      const result = isBiometricAuthSupported();
      expect(result).toBe(false);
    });

    it('should return false if navigator.credentials is undefined', () => {
      // Ensure window exists and PublicKeyCredential is present
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).window = {
        ...originalWindow,
        PublicKeyCredential: vi.fn(),
      };

      // Mock navigator without credentials
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).navigator = { ...originalNavigator };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis.navigator as any).credentials;

      const result = isBiometricAuthSupported();
      expect(result).toBe(false);
    });

    it('should return true if all APIs are available', () => {
      // Mock full browser support — code checks globalThis.PublicKeyCredential
      const mockPKC = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).window = {
        ...originalWindow,
        PublicKeyCredential: mockPKC,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).PublicKeyCredential = mockPKC;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).navigator = {
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
      delete (globalThis as any).window;

      const result = await isPlatformAuthenticatorAvailable();
      expect(result).toBe(false);
    });

    it('should call window.PublicKeyCredential method', async () => {
      const mockMethod = vi.fn().mockResolvedValue(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (MockPKC as any).isUserVerifyingPlatformAuthenticatorAvailable = mockMethod;

      // Setup window and globalThis.PublicKeyCredential (code reads from globalThis directly)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).window = {
        ...originalWindow,
        PublicKeyCredential: MockPKC,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).PublicKeyCredential = MockPKC;

      // Setup navigator
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).navigator = {
        ...originalNavigator,
        credentials: { create: vi.fn(), get: vi.fn() },
      };

      const result = await isPlatformAuthenticatorAvailable();

      expect(result).toBe(true);
      expect(mockMethod).toHaveBeenCalled();
    });

    it('should return false if check throws error', async () => {
      const mockMethod = vi.fn().mockRejectedValue(new Error('Failed'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (MockPKC as any).isUserVerifyingPlatformAuthenticatorAvailable = mockMethod;

      // Setup window and globalThis.PublicKeyCredential with failing method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).window = {
        ...originalWindow,
        PublicKeyCredential: MockPKC,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).PublicKeyCredential = MockPKC;

      // Setup navigator
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).navigator = {
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
