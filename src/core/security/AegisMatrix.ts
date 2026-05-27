/**
 * AegisMatrix — Role-Based Access Control and Capability Matrix
 *
 * Defines the capabilities associated with each TrustTier and specific roles.
 *
 * @module core/security/AegisMatrix
 * @version 1.0.0
 */

import { TrustTier, type DeviceCapability } from '../types/index';

export interface AegisRole {
  roleName: string;
  trustTier: TrustTier;
  capabilities: DeviceCapability[];
}

export const AEGIS_MATRIX: Record<TrustTier, DeviceCapability[]> = {
  [TrustTier.GOD_MODE]: ['all'],
  [TrustTier.OPERATOR]: ['file_system', 'deploy_service', 'create_invoice'],
  [TrustTier.PERIPHERAL]: ['audio_in', 'audio_out', 'log_insight'],
  [TrustTier.PUBLIC]: ['read_only'],
};

/**
 * Validates if a given tier has a specific capability.
 */
export function hasCapability(tier: TrustTier, capability: DeviceCapability): boolean {
  const capabilities = AEGIS_MATRIX[tier] ?? [];
  if (capabilities.includes('all')) return true;
  return capabilities.includes(capability);
}
