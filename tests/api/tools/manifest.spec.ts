/**
 * Tests for tool manifest endpoint handler.
 * @date 2026-05-27
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';

import {
  filterManifest,
  handleManifestRequest,
} from '../../../src/api/tools/manifest';
import { TrustTier, type DeviceProfile } from '../../../src/core/types/index';
import { setKeyStore, type AegisKeyStore, type AegisKeyRecord } from '../../../src/core/security/SpectreHandshake';

const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

const validTenant = 't1';
const validSecret = '12345678901234567890123456789012'; // 32 chars
const validAuth = `Bearer ak_live_${validTenant}_${validSecret}`;
const validPrefix = `ak_live_${validTenant}_${validSecret}`.slice(0, 16);

function makeDevice(tier: TrustTier, id = 'test'): DeviceProfile {
  return {
    deviceId: id,
    trustTier: tier,
    capabilities: tier === TrustTier.GOD_MODE ? ['all'] : ['read_only'],
    connectionId: 'conn-1',
    authenticatedAt: new Date().toISOString(),
  };
}

describe('Tool Manifest', () => {
  let mockStore: AegisKeyStore;
  let mockRecord: AegisKeyRecord;

  beforeEach(() => {
    mockRecord = {
      keyId: 'key-1',
      tenantId: validTenant,
      keyHash: hashSecret(validSecret),
      trustTier: TrustTier.GOD_MODE, // Set to GOD_MODE for testing
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

  describe('filterManifest', () => {
    it('GOD_MODE gets all tools', () => {
      const result = filterManifest(makeDevice(TrustTier.GOD_MODE, 'apex-admin'));
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.meta.trust_tier).toBe(TrustTier.GOD_MODE);
    });

    it('PERIPHERAL gets only peripheral-level tools', () => {
      const result = filterManifest(makeDevice(TrustTier.PERIPHERAL, 'gumdrop'));
      const names = result.tools.map((t) => t.function.name);
      expect(names).toContain('search_database');
      expect(names).not.toContain('create_record');
      expect(names).not.toContain('delete_record');
    });

    it('includes meta with count', () => {
      const result = filterManifest(makeDevice(TrustTier.OPERATOR, 'op'));
      expect(result.meta.count).toBe(result.tools.length);
      expect(result.meta.device_id).toBe('op');
    });
  });

  describe('handleManifestRequest', () => {
    it('returns 200 with valid credentials', async () => {
      const result = await handleManifestRequest(
        {
          authorization: validAuth,
          'x-apex-break-glass': 'true',
        },
        'conn-1',
      );
      expect(result.status).toBe(200);
      expect('tools' in result.body).toBe(true);
    });

    it('returns 403 on missing auth', async () => {
      const result = await handleManifestRequest({}, 'conn-1');
      expect(result.status).toBe(403);
      expect('error' in result.body).toBe(true);
    });

    it('returns 403 on invalid auth prefix', async () => {
      const result = await handleManifestRequest(
        {
          authorization: 'Bearer wrong_prefix',
        },
        'conn-1',
      );
      expect(result.status).toBe(403);
    });
  });
});
