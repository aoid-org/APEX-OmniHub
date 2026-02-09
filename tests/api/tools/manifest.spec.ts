/**
 * Tests for tool manifest endpoint handler.
 * @date 2026-02-09
 */
import { describe, expect, it } from 'vitest';

import {
  filterManifest,
  handleManifestRequest,
} from '../../../src/api/tools/manifest';
import type { DeviceProfile } from '../../../src/core/types/index';
import { TrustTier } from '../../../src/core/types/index';

function makeDevice(
  tier: TrustTier,
  id = 'test',
): DeviceProfile {
  return {
    deviceId: id,
    trustTier: tier,
    capabilities: tier === TrustTier.GOD_MODE ? ['all'] : ['read_only'],
    connectionId: 'conn-1',
    authenticatedAt: new Date().toISOString(),
  };
}

describe('Tool Manifest', () => {
  describe('filterManifest', () => {
    it('GOD_MODE gets all tools', () => {
      const result = filterManifest(
        makeDevice(TrustTier.GOD_MODE, 'apex-admin'),
      );
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.meta.trust_tier).toBe(TrustTier.GOD_MODE);
    });

    it('PERIPHERAL gets only peripheral-level tools', () => {
      const result = filterManifest(
        makeDevice(TrustTier.PERIPHERAL, 'gumdrop'),
      );
      const names = result.tools.map((t) => t.function.name);
      expect(names).toContain('search_database');
      expect(names).not.toContain('create_record');
      expect(names).not.toContain('delete_record');
    });

    it('includes meta with count', () => {
      const result = filterManifest(
        makeDevice(TrustTier.OPERATOR, 'op'),
      );
      expect(result.meta.count).toBe(result.tools.length);
      expect(result.meta.device_id).toBe('op');
    });
  });

  describe('handleManifestRequest', () => {
    it('returns 200 with valid credentials', () => {
      const result = handleManifestRequest(
        {
          authorization: 'Bearer apex_sk_test123',
          'x-apex-device-id': 'apex-admin',
        },
        'conn-1',
      );
      expect(result.status).toBe(200);
      expect('tools' in result.body).toBe(true);
    });

    it('returns 403 on missing auth', () => {
      const result = handleManifestRequest(
        { 'x-apex-device-id': 'gumdrop' },
        'conn-1',
      );
      expect(result.status).toBe(403);
      expect('error' in result.body).toBe(true);
    });

    it('returns 403 on invalid auth prefix', () => {
      const result = handleManifestRequest(
        {
          authorization: 'Bearer wrong_prefix',
          'x-apex-device-id': 'gumdrop',
        },
        'conn-1',
      );
      expect(result.status).toBe(403);
    });
  });
});
