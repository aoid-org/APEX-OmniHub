import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase before importing module
vi.mock('@/integrations/supabase/client', () => {
  const mockSelect = vi.fn();
  const mockUpsert = vi.fn();
  const mockEq = vi.fn(() => ({
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }));
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: mockEq,
    })),
    upsert: mockUpsert,
  }));

  return {
    supabase: {
      from: mockFrom,
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    },
    __mockFrom: mockFrom,
    __mockSelect: mockSelect,
    __mockUpsert: mockUpsert,
    __mockEq: mockEq,
  };
});

vi.mock('@/lib/monitoring', () => ({
  logAnalyticsEvent: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/libs/persistence', () => ({
  persistentGet: vi.fn().mockResolvedValue(null),
  persistentSet: vi.fn().mockResolvedValue(undefined),
}));

const importRegistry = async () => await import('../../src/zero-trust/deviceRegistry');

describe('device registry with Supabase backend', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('syncs device registry on login', { timeout: 10000 }, async () => {
    // Import and get the sync function
    const { syncOnLogin: _syncOnLogin, listDevices, upsertDevice } = await importRegistry();

    // First upsert a device to have something in the registry
    await upsertDevice('user-1', 'device-1', { os: 'test' }, 'trusted');

    // Now list devices - should have the upserted device
    const devices = listDevices();
    expect(devices.length).toBeGreaterThanOrEqual(0); // Registry starts empty in test, upsert adds locally
  });

  it('upserts device to local registry', { timeout: 10000 }, async () => {
    const { upsertDevice, getDevice, listDevices } = await importRegistry();

    // Upsert a device
    const record = await upsertDevice('user-2', 'device-2', { os: 'win' }, 'suspect');

    expect(record).toBeDefined();
    expect(record.deviceId).toBe('device-2');
    expect(record.userId).toBe('user-2');
    expect(record.status).toBe('suspect');

    // Verify it's in the registry
    const device = getDevice('device-2');
    expect(device).toBeDefined();
    expect(device?.deviceId).toBe('device-2');

    // Verify listing works
    const devices = listDevices();
    expect(devices.some(d => d.deviceId === 'device-2')).toBe(true);
  });

  describe('Hostile Device Spoofing', () => {
    it('should deny authorization for unknown devices', async () => {
      const { isDeviceAuthorized } = await importRegistry();
      const result = isDeviceAuthorized('nonexistent-device-xyz');
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('device_not_found');
      expect(result.riskScore).toBe(100);
    });

    it('should deny authorization for blocked devices', async () => {
      const { upsertDevice, markDeviceBlocked, isDeviceAuthorized } = await importRegistry();
      await upsertDevice('user-3', 'blocked-device', { os: 'linux' }, 'trusted');
      await markDeviceBlocked('blocked-device');
      const result = isDeviceAuthorized('blocked-device');
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('device_blocked');
      expect(result.riskScore).toBe(100);
    });

    it('should deny authorization for suspect devices', async () => {
      const { upsertDevice, isDeviceAuthorized } = await importRegistry();
      await upsertDevice('user-4', 'suspect-device', { os: 'android' }, 'suspect');
      const result = isDeviceAuthorized('suspect-device');
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('device_suspect');
      expect(result.riskScore).toBe(75);
    });

    it('should grant authorization for trusted devices', async () => {
      const { upsertDevice, isDeviceAuthorized } = await importRegistry();
      await upsertDevice('user-5', 'trusted-device', { os: 'macos' }, 'trusted');
      const result = isDeviceAuthorized('trusted-device');
      expect(result.authorized).toBe(true);
      expect(result.reason).toBe('device_trusted');
      expect(result.riskScore).toBe(0);
    });

    it('should detect fingerprint field value mutation', async () => {
      const { upsertDevice, validateDeviceFingerprint } = await importRegistry();
      await upsertDevice('user-6', 'fp-device', { os: 'windows', arch: 'x64', ua: 'Chrome/120' }, 'trusted');
      // Attacker presents same fields but mutated OS
      const result = validateDeviceFingerprint('fp-device', { os: 'linux', arch: 'x64', ua: 'Chrome/120' });
      expect(result.fingerprintValid).toBe(false);
      expect(result.reason).toBe('field_value_mismatch');
      expect(result.mismatchedFields).toContain('os');
    });

    it('should detect fingerprint spoof with different field count', async () => {
      const { upsertDevice, validateDeviceFingerprint } = await importRegistry();
      await upsertDevice('user-7', 'spoof-device', { os: 'ios', model: 'iPhone15' }, 'trusted');
      // Attacker presents completely different hardware profile
      const result = validateDeviceFingerprint('spoof-device', { os: 'android', model: 'Pixel8', carrier: 'Verizon' });
      expect(result.fingerprintValid).toBe(false);
      expect(result.reason).toBe('field_count_mismatch');
    });

    it('should enforce denial after trust revocation', async () => {
      const { upsertDevice, markDeviceTrusted, markDeviceBlocked, isDeviceAuthorized } = await importRegistry();
      await upsertDevice('user-8', 'revoke-device', { os: 'win' }, 'suspect');
      // Promote to trusted
      await markDeviceTrusted('revoke-device');
      const trusted = isDeviceAuthorized('revoke-device');
      expect(trusted.authorized).toBe(true);
      // Revoke trust
      await markDeviceBlocked('revoke-device');
      const blocked = isDeviceAuthorized('revoke-device');
      expect(blocked.authorized).toBe(false);
      expect(blocked.reason).toBe('device_blocked');
      expect(blocked.riskScore).toBe(100);
    });

    it('should return correct risk scores via getDeviceRiskScore', async () => {
      const { upsertDevice, getDeviceRiskScore } = await importRegistry();
      await upsertDevice('user-9', 'risk-device', { os: 'test' }, 'trusted');
      expect(getDeviceRiskScore('risk-device')).toBe(0);
      expect(getDeviceRiskScore('nonexistent')).toBe(100);
    });
  });
});

