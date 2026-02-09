/**
 * AegisKernel — Authorization and access-control kernel.
 *
 * Determines whether a given device (by ID and trust tier)
 * is permitted to invoke a named tool. Pure, stateless,
 * deterministic — no I/O.
 *
 * @module core/security/AegisKernel
 * @version 1.0.0
 * @date 2026-02-09
 */

import {
  type DeviceCapability,
  type DeviceProfile,
  TrustTier,
} from '../types/index';

/* ------------------------------------------------------------------ */
/*  Tool → Required Tier mapping                                       */
/* ------------------------------------------------------------------ */

/**
 * Minimum trust tier required per tool.
 * Tools not listed default to OPERATOR (fail-closed).
 */
const TOOL_TIER_MAP: Record<string, TrustTier> = {
  // Safe / read-only
  search_database: TrustTier.PERIPHERAL,
  read_record: TrustTier.PERIPHERAL,
  check_status: TrustTier.PERIPHERAL,
  search_youtube: TrustTier.PERIPHERAL,
  update_context: TrustTier.PERIPHERAL,

  // Operational
  create_record: TrustTier.OPERATOR,
  send_email: TrustTier.OPERATOR,
  call_webhook: TrustTier.OPERATOR,
  deploy_service: TrustTier.OPERATOR,
  create_invoice: TrustTier.OPERATOR,
  file_system: TrustTier.OPERATOR,

  // Destructive — admin only
  delete_record: TrustTier.GOD_MODE,
  execute_sql_raw: TrustTier.GOD_MODE,
  shell_execute: TrustTier.GOD_MODE,
  admin_override: TrustTier.GOD_MODE,
};

/** Numeric ordering for tier comparison. */
const TIER_RANK: Record<TrustTier, number> = {
  [TrustTier.PUBLIC]: 0,
  [TrustTier.PERIPHERAL]: 1,
  [TrustTier.OPERATOR]: 2,
  [TrustTier.GOD_MODE]: 3,
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Check whether a device is authorized to invoke a tool.
 *
 * @param toolName - canonical tool identifier
 * @param device   - authenticated DeviceProfile
 * @returns `true` when access is granted
 */
export function validateAccess(
  toolName: string,
  device: DeviceProfile,
): boolean {
  if (device.trustTier === TrustTier.GOD_MODE) {
    return true;
  }

  const requiredTier = TOOL_TIER_MAP[toolName] ?? TrustTier.OPERATOR;
  return TIER_RANK[device.trustTier] >= TIER_RANK[requiredTier];
}

/**
 * Return the full list of tool names a device may access.
 *
 * @param allToolNames - universe of available tool names
 * @param device       - authenticated DeviceProfile
 * @returns filtered array of accessible tool names
 */
export function filterToolsForDevice(
  allToolNames: ReadonlyArray<string>,
  device: DeviceProfile,
): string[] {
  return allToolNames.filter((name) => validateAccess(name, device));
}

/**
 * Check if a device has a specific capability.
 */
export function hasCapability(
  device: DeviceProfile,
  capability: DeviceCapability,
): boolean {
  if (device.capabilities.includes('all')) {
    return true;
  }
  return device.capabilities.includes(capability);
}
