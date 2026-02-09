/**
 * Tests for AegisKernel — authorization and access control.
 * @date 2026-02-09
 */
import { describe, expect, it } from 'vitest';

import {
  filterToolsForDevice,
  hasCapability,
  validateAccess,
} from '../../../src/core/security/AegisKernel';
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

describe('AegisKernel', () => {
  describe('validateAccess', () => {
    it('GOD_MODE can access any tool', () => {
      const device = makeDevice(TrustTier.GOD_MODE);
      expect(validateAccess('delete_record', device)).toBe(true);
      expect(validateAccess('shell_execute', device)).toBe(true);
    });

    it('PERIPHERAL can access read-only tools', () => {
      const device = makeDevice(TrustTier.PERIPHERAL);
      expect(validateAccess('search_database', device)).toBe(true);
      expect(validateAccess('search_youtube', device)).toBe(true);
    });

    it('PERIPHERAL cannot access operator tools', () => {
      const device = makeDevice(TrustTier.PERIPHERAL);
      expect(validateAccess('create_record', device)).toBe(false);
      expect(validateAccess('send_email', device)).toBe(false);
    });

    it('OPERATOR can access operator and peripheral tools', () => {
      const device = makeDevice(TrustTier.OPERATOR);
      expect(validateAccess('create_record', device)).toBe(true);
      expect(validateAccess('search_database', device)).toBe(true);
    });

    it('OPERATOR cannot access GOD_MODE tools', () => {
      const device = makeDevice(TrustTier.OPERATOR);
      expect(validateAccess('delete_record', device)).toBe(false);
    });

    it('PUBLIC cannot access anything except unlisted', () => {
      const device = makeDevice(TrustTier.PUBLIC);
      expect(validateAccess('search_database', device)).toBe(false);
    });

    it('unknown tools default to OPERATOR requirement', () => {
      const device = makeDevice(TrustTier.OPERATOR);
      expect(validateAccess('some_new_tool', device)).toBe(true);

      const peripheral = makeDevice(TrustTier.PERIPHERAL);
      expect(validateAccess('some_new_tool', peripheral)).toBe(false);
    });
  });

  describe('filterToolsForDevice', () => {
    const allTools = [
      'search_database',
      'create_record',
      'delete_record',
    ];

    it('GOD_MODE sees all tools', () => {
      const device = makeDevice(TrustTier.GOD_MODE);
      const filtered = filterToolsForDevice(allTools, device);
      expect(filtered).toEqual(allTools);
    });

    it('PERIPHERAL sees only peripheral tools', () => {
      const device = makeDevice(TrustTier.PERIPHERAL);
      const filtered = filterToolsForDevice(allTools, device);
      expect(filtered).toEqual(['search_database']);
    });
  });

  describe('hasCapability', () => {
    it('returns true for all when capability is all', () => {
      const device = makeDevice(TrustTier.GOD_MODE);
      expect(hasCapability(device, 'file_system')).toBe(true);
    });

    it('returns false when capability not present', () => {
      const device = makeDevice(TrustTier.PUBLIC);
      expect(hasCapability(device, 'file_system')).toBe(false);
    });
  });
});
