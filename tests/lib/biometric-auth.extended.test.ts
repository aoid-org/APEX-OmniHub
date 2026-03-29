import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logAnalyticsEventMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/lib/monitoring', () => ({
  logAnalyticsEvent: logAnalyticsEventMock,
}));

import {
  arrayBufferToBase64,
  authenticateWithBiometric,
  generateChallenge,
  getBiometricAuthenticatorInfo,
  getBiometricCredentials,
  initializeBiometricAuth,
  loginWithBiometric,
  registerBiometricCredential,
  setupBiometricLogin,
} from '@/lib/biometric-auth';

describe('biometric-auth extended', () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;
  const originalPublicKeyCredential = (globalThis as unknown as { PublicKeyCredential?: unknown })
    .PublicKeyCredential;

  const installBiometricSupport = (args?: {
    available?: boolean;
    userAgent?: string;
    createImpl?: () => Promise<unknown>;
    getImpl?: () => Promise<unknown>;
  }) => {
    const createImpl = args?.createImpl ?? (async () => null);
    const getImpl = args?.getImpl ?? (async () => null);
    const available = args?.available ?? true;

    const PKC = function MockPublicKeyCredential() {
      return undefined;
    } as unknown as { isUserVerifyingPlatformAuthenticatorAvailable: () => Promise<boolean> };
    PKC.isUserVerifyingPlatformAuthenticatorAvailable = vi
      .fn()
      .mockResolvedValue(available);

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow ?? {},
    });
    Object.defineProperty(globalThis, 'PublicKeyCredential', {
      configurable: true,
      value: PKC,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        ...originalNavigator,
        userAgent: args?.userAgent ?? 'Mozilla/5.0 (Linux; Android 14)',
        credentials: {
          create: vi.fn(createImpl),
          get: vi.fn(getImpl),
        },
      },
    });
  };

  beforeEach(() => {
    logAnalyticsEventMock.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    Object.defineProperty(globalThis, 'PublicKeyCredential', {
      configurable: true,
      value: originalPublicKeyCredential,
    });
    vi.restoreAllMocks();
  });

  it('registers credentials and returns serialized attestation payload', async () => {
    installBiometricSupport({
      createImpl: async () => ({
        id: 'cred-1',
        rawId: new Uint8Array([1, 2, 3]).buffer,
        type: 'public-key',
        response: {
          clientDataJSON: new Uint8Array([4]).buffer,
          attestationObject: new Uint8Array([5]).buffer,
        },
      }),
    });

    const credential = await registerBiometricCredential({
      rpName: 'APEX OmniLink',
      rpId: 'omnihub.local',
      userName: 'user@example.com',
      userId: new Uint8Array([10]),
      challenge: new Uint8Array([11]),
      timeout: 2_000,
    });

    expect(credential?.id).toBe('cred-1');
    expect(credential?.type).toBe('public-key');
    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      'biometric.registered',
      expect.any(Object),
    );
  });

  it('authenticates with biometric assertions and handles null assertions', async () => {
    installBiometricSupport({
      getImpl: async () => ({
        id: 'assertion-1',
        response: {
          clientDataJSON: new Uint8Array([1]).buffer,
          authenticatorData: new Uint8Array([2]).buffer,
          signature: new Uint8Array([3]).buffer,
          userHandle: new Uint8Array([4]).buffer,
        },
      }),
    });

    const assertion = await authenticateWithBiometric(
      new Uint8Array([9, 9, 9]),
      ['AQID'],
      'omnihub.local',
    );
    expect(assertion?.credentialId).toBe('assertion-1');
    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      'biometric.authenticated',
      expect.any(Object),
    );

    installBiometricSupport({
      getImpl: async () => null,
    });
    await expect(
      authenticateWithBiometric(
        new Uint8Array([9, 9, 9]),
        ['AQID'],
        'omnihub.local',
      ),
    ).resolves.toBeNull();
  });

  it('fetches biometric credential list from API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'cred-1', createdAt: '2026-01-01', lastUsed: '2026-01-02' }],
    } as Response);

    const list = await getBiometricCredentials('user-1', 'https://api.omnihub.local');
    expect(list).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.omnihub.local/auth/biometric/credentials?userId=user-1',
    );
  });

  it('detects authenticator platform and initializes telemetry', async () => {
    installBiometricSupport({
      available: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });
    await expect(getBiometricAuthenticatorInfo()).resolves.toEqual({
      available: false,
      type: 'unknown',
      platform: 'unknown',
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await initializeBiometricAuth();
    expect(warnSpy).toHaveBeenCalledWith('[Biometric] Authenticator not available');

    installBiometricSupport({
      available: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
    });
    const info = await getBiometricAuthenticatorInfo();
    expect(info.platform).toBe('android');
    expect(info.type).toBe('fingerprint');

    await initializeBiometricAuth();
    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      'biometric.initialized',
      expect.objectContaining({ available: true }),
    );
  });

  it('completes biometric setup flow and handles challenge failures', async () => {
    installBiometricSupport({
      available: true,
      createImpl: async () => ({
        id: 'cred-setup',
        rawId: new Uint8Array([1]).buffer,
        type: 'public-key',
        response: {
          clientDataJSON: new Uint8Array([1]).buffer,
          attestationObject: new Uint8Array([7, 7]).buffer,
        },
      }),
    });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'AQID' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    await expect(
      setupBiometricLogin(
        '550e8400-e29b-41d4-a716-446655440000',
        'user@example.com',
        'https://api.omnihub.local',
      ),
    ).resolves.toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    fetchSpy.mockReset();
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);
    await expect(
      setupBiometricLogin(
        '550e8400-e29b-41d4-a716-446655440000',
        'user@example.com',
        'https://api.omnihub.local',
      ),
    ).resolves.toBe(false);
  });

  it('completes biometric login flow and returns session token', async () => {
    installBiometricSupport({
      available: true,
      getImpl: async () => ({
        id: 'assertion-login',
        response: {
          clientDataJSON: new Uint8Array([1]).buffer,
          authenticatorData: new Uint8Array([2]).buffer,
          signature: new Uint8Array([3]).buffer,
          userHandle: null,
        },
      }),
    });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'AQID', allowedCredentials: ['AQID'] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionToken: 'session-token-123' }),
      } as Response);

    await expect(
      loginWithBiometric('user@example.com', 'https://api.omnihub.local'),
    ).resolves.toEqual({ success: true, sessionToken: 'session-token-123' });

    fetchSpy.mockReset();
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'AQID', allowedCredentials: ['AQID'] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response);

    await expect(
      loginWithBiometric('user@example.com', 'https://api.omnihub.local'),
    ).resolves.toEqual({ success: false });
  });

  it('encodes binary values and generates random challenge bytes', () => {
    const encoded = arrayBufferToBase64(new Uint8Array([1, 2, 3]).buffer);
    expect(encoded).toBe('AQID');

    const randomSpy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    const challenge = generateChallenge();
    expect(challenge).toHaveLength(32);
    expect(randomSpy).toHaveBeenCalled();
  });
});

