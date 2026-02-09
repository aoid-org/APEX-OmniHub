/**
 * Tests for SpectreHandshake — device authentication and classification.
 * @date 2026-02-09
 */
import { describe, expect, it } from 'vitest';

import {
  authenticate,
  SpectreAuthError,
} from '../../../src/core/security/SpectreHandshake';
import { TrustTier } from '../../../src/core/types/index';

const validAuth = 'Bearer apex_sk_test_key_123';

describe('SpectreHandshake', () => {
  describe('authenticate', () => {
    it('classifies gumdrop as PERIPHERAL', () => {
      const device = authenticate(
        {
          authorization: validAuth,
          'x-apex-device-id': 'gumdrop',
        },
        'conn-1',
      );
      expect(device.trustTier).toBe(TrustTier.PERIPHERAL);
      expect(device.capabilities).toContain('audio_in');
      expect(device.capabilities).toContain('audio_out');
      expect(device.connectionId).toBe('conn-1');
    });

    it('classifies operator-desktop as OPERATOR', () => {
      const device = authenticate(
        {
          authorization: validAuth,
          'x-apex-device-id': 'operator-desktop',
        },
        'conn-2',
      );
      expect(device.trustTier).toBe(TrustTier.OPERATOR);
      expect(device.capabilities).toContain('file_system');
    });

    it('classifies apex-admin as GOD_MODE', () => {
      const device = authenticate(
        {
          authorization: validAuth,
          'x-apex-device-id': 'apex-admin',
        },
        'conn-3',
      );
      expect(device.trustTier).toBe(TrustTier.GOD_MODE);
      expect(device.capabilities).toContain('all');
    });

    it('classifies unknown device as PUBLIC', () => {
      const device = authenticate(
        {
          authorization: validAuth,
          'x-apex-device-id': 'mystery-device',
        },
        'conn-4',
      );
      expect(device.trustTier).toBe(TrustTier.PUBLIC);
      expect(device.capabilities).toContain('read_only');
    });

    it('throws on missing authorization header', () => {
      expect(() =>
        authenticate({ 'x-apex-device-id': 'gumdrop' }, 'c1'),
      ).toThrow(SpectreAuthError);
    });

    it('throws on invalid auth prefix', () => {
      expect(() =>
        authenticate(
          {
            authorization: 'Bearer sk_live_wrong',
            'x-apex-device-id': 'gumdrop',
          },
          'c2',
        ),
      ).toThrow(SpectreAuthError);
    });

    it('defaults deviceId to unknown when header missing', () => {
      const device = authenticate(
        { authorization: validAuth },
        'c5',
      );
      expect(device.deviceId).toBe('unknown');
      expect(device.trustTier).toBe(TrustTier.PUBLIC);
    });

    it('populates authenticatedAt as ISO string', () => {
      const device = authenticate(
        {
          authorization: validAuth,
          'x-apex-device-id': 'gumdrop',
        },
        'c6',
      );
      expect(new Date(device.authenticatedAt).toISOString()).toBe(
        device.authenticatedAt,
      );
    });

    it('works with Map-like header sources', () => {
      const headers = new Map<string, string>();
      headers.set('authorization', validAuth);
      headers.set('x-apex-device-id', 'apex-admin');
      const device = authenticate(headers, 'c7');
      expect(device.trustTier).toBe(TrustTier.GOD_MODE);
    });
  });
});
