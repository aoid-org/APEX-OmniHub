/**
 * Tests for SpectreHandshake — device authentication and classification.
 * @date 2026-05-27
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';

import {
  authenticate,
  setKeyStore,
  SpectreAuthError,
  type AegisKeyStore,
  type AegisKeyRecord,
} from '../../../src/core/security/SpectreHandshake';
import { TrustTier } from '../../../src/core/types/index';

const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

const validTenant = 't1';
const validSecret = '12345678901234567890123456789012'; // 32 chars
const validAuth = `Bearer ak_live_${validTenant}_${validSecret}`;
const validPrefix = `ak_live_${validTenant}_${validSecret}`.slice(0, 16);

describe('SpectreHandshake', () => {
  let mockStore: AegisKeyStore;
  let mockRecord: AegisKeyRecord;

  beforeEach(() => {
    mockRecord = {
      keyId: 'key-1',
      tenantId: validTenant,
      keyHash: hashSecret(validSecret),
      trustTier: TrustTier.PERIPHERAL,
      status: 'active',
      environment: 'production',
      audience: [],
    };

    mockStore = {
      lookupKey: vi.fn(async (prefix: string) => {
        if (prefix === validPrefix) return mockRecord;
        return null;
      }),
      updateLastUsed: vi.fn(async () => {}),
    };

    setKeyStore(mockStore);
  });

  describe('authenticate', () => {
    it('throws on missing authorization header', async () => {
      await expect(authenticate({}, 'c1')).rejects.toThrow(SpectreAuthError);
    });

    it('throws on invalid auth format', async () => {
      await expect(
        authenticate({ authorization: 'Basic wrong' }, 'c2')
      ).rejects.toThrow(SpectreAuthError);
    });

    it('throws on invalid API key format (not ak_live_...)', async () => {
      await expect(
        authenticate({ authorization: 'Bearer some_random_string_that_is_long_enough_but_wrong_format' }, 'c3')
      ).rejects.toThrow(SpectreAuthError);
    });

    it('authenticates a valid key and maps capabilities', async () => {
      const device = await authenticate({ authorization: validAuth }, 'conn-1');
      expect(device.trustTier).toBe(TrustTier.PERIPHERAL);
      expect(device.capabilities).toContain('audio_in');
      expect(device.deviceId).toBe('key-1');
      expect(mockStore.lookupKey).toHaveBeenCalledWith(validPrefix);
    });

    it('throws if key not found', async () => {
      const badSecret = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const badAuth = `Bearer ak_live_${validTenant}_${badSecret}`;
      await expect(authenticate({ authorization: badAuth }, 'conn')).rejects.toThrow('API key not found');
    });

    it('throws if tenant mismatch', async () => {
      const badAuth = `Bearer ak_live_t2_${validSecret}`;
      await expect(authenticate({ authorization: badAuth }, 'conn')).rejects.toThrow('API key not found');
    });

    it('throws if key is revoked', async () => {
      mockRecord.status = 'revoked';
      await expect(authenticate({ authorization: validAuth }, 'conn')).rejects.toThrow('API key is revoked');
    });

    it('throws if key is expired', async () => {
      mockRecord.expiresAt = new Date(Date.now() - 10000).toISOString();
      await expect(authenticate({ authorization: validAuth }, 'conn')).rejects.toThrow('API key expired');
    });

    it('throws on timing-safe signature mismatch', async () => {
      // Construct a validly-formatted token: same tenant, same prefix length structure,
      // but a different secret — so regex passes and prefix lookup hits, but hash comparison fails.
      const wrongSecret = 'ffffffffffffffffffffffffffffffff'; // 32 hex chars, wrong
      const wrongAuth = `Bearer ak_live_${validTenant}_${wrongSecret}`;
      // Override the store to return the record even for the wrong-secret prefix
      const wrongPrefix = wrongAuth.slice('Bearer '.length, 'Bearer '.length + 16);
      (mockStore.lookupKey as ReturnType<typeof vi.fn>).mockImplementation(async (prefix: string) => {
        if (prefix === wrongPrefix || prefix === validPrefix) return mockRecord;
        return null;
      });
      await expect(authenticate({ authorization: wrongAuth }, 'conn')).rejects.toThrow('Invalid API key signature');
    });

    it('degrades GOD_MODE to OPERATOR without break-glass header', async () => {
      mockRecord.trustTier = TrustTier.GOD_MODE;
      const device = await authenticate({ authorization: validAuth }, 'conn');
      expect(device.trustTier).toBe(TrustTier.OPERATOR);
      expect(device.capabilities).toContain('file_system');
      expect(device.capabilities).not.toContain('all');
    });

    it('allows GOD_MODE when break-glass header is true', async () => {
      mockRecord.trustTier = TrustTier.GOD_MODE;
      const device = await authenticate(
        {
          authorization: validAuth,
          'x-apex-break-glass': 'true',
        },
        'conn'
      );
      expect(device.trustTier).toBe(TrustTier.GOD_MODE);
      expect(device.capabilities).toContain('all');
    });

    it('populates authenticatedAt as ISO string', async () => {
      const device = await authenticate({ authorization: validAuth }, 'conn');
      expect(new Date(device.authenticatedAt).toISOString()).toBe(device.authenticatedAt);
    });
  });
});
