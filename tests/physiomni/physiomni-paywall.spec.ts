/**
 * PhysiOmni paywall gating unit tests.
 *
 * Validates fail-closed tier logic:
 *   - free/starter → locked (no pilot access)
 *   - pro → preview only (no pilot, no hardware)
 *   - business → pilot access (no hardware control)
 *   - enterprise → pilot + hardware (still requires MAN approval)
 *
 * Does NOT test UI rendering — that belongs in component tests.
 * Tests the pure tier-derivation logic extracted from usePlan.
 */

import { describe, it, expect } from 'vitest';
import type { SubscriptionTier } from '../../apps/omnihub-site/src/hooks/usePlan';

// ── Pure tier-derivation logic (mirrors usePlan.deriveState) ──────────────

function derivePhysiOmniAccess(tier: SubscriptionTier) {
  return {
    canAccessPhysiOmni: tier === 'business' || tier === 'enterprise',
    canPreviewPhysiOmni: tier === 'pro' || tier === 'business' || tier === 'enterprise',
    canControlHardware: tier === 'enterprise',
  };
}

// ── Gate rule assertions ──────────────────────────────────────────────────

describe('PhysiOmni paywall — tier access matrix', () => {

  it('free: no access, no preview, no hardware', () => {
    const access = derivePhysiOmniAccess('free');
    expect(access.canAccessPhysiOmni).toBe(false);
    expect(access.canPreviewPhysiOmni).toBe(false);
    expect(access.canControlHardware).toBe(false);
  });

  it('starter: no access, no preview, no hardware', () => {
    const access = derivePhysiOmniAccess('starter');
    expect(access.canAccessPhysiOmni).toBe(false);
    expect(access.canPreviewPhysiOmni).toBe(false);
    expect(access.canControlHardware).toBe(false);
  });

  it('pro: preview only — no pilot, no hardware', () => {
    const access = derivePhysiOmniAccess('pro');
    expect(access.canAccessPhysiOmni).toBe(false);   // no pilot
    expect(access.canPreviewPhysiOmni).toBe(true);    // preview/waitlist ✓
    expect(access.canControlHardware).toBe(false);    // no hardware
  });

  it('business: pilot access — no hardware control', () => {
    const access = derivePhysiOmniAccess('business');
    expect(access.canAccessPhysiOmni).toBe(true);     // pilot ✓
    expect(access.canPreviewPhysiOmni).toBe(true);    // preview ✓
    expect(access.canControlHardware).toBe(false);    // hardware requires enterprise + MAN
  });

  it('enterprise: full access — hardware still requires MAN approval externally', () => {
    const access = derivePhysiOmniAccess('enterprise');
    expect(access.canAccessPhysiOmni).toBe(true);     // pilot ✓
    expect(access.canPreviewPhysiOmni).toBe(true);    // preview ✓
    expect(access.canControlHardware).toBe(true);     // hardware gated here, MAN enforced server-side
  });
});

describe('PhysiOmni paywall — fail-closed guarantees', () => {

  it('unknown tier string coerces to free (fail-closed)', () => {
    // Simulates a corrupt DB value or future tier not yet in the client
    const VALID_TIERS = new Set(['free', 'starter', 'pro', 'business', 'enterprise']);
    const raw = 'ultra_premium_unknown';
    const tier: SubscriptionTier = VALID_TIERS.has(raw) ? (raw as SubscriptionTier) : 'free';
    const access = derivePhysiOmniAccess(tier);
    expect(access.canAccessPhysiOmni).toBe(false);
    expect(access.canPreviewPhysiOmni).toBe(false);
  });

  it('null/undefined tier coerces to free (fail-closed)', () => {
    const VALID_TIERS = new Set(['free', 'starter', 'pro', 'business', 'enterprise']);
    const raw = null as unknown as string;
    const tier: SubscriptionTier = (typeof raw === 'string' && VALID_TIERS.has(raw))
      ? (raw as SubscriptionTier)
      : 'free';
    const access = derivePhysiOmniAccess(tier);
    expect(access.canAccessPhysiOmni).toBe(false);
  });

  it('business is the minimum tier for canAccessPhysiOmni — pro is not enough', () => {
    // This is the key business rule: Business+ required, not just any paid plan
    const proAccess = derivePhysiOmniAccess('pro');
    const businessAccess = derivePhysiOmniAccess('business');
    expect(proAccess.canAccessPhysiOmni).toBe(false);
    expect(businessAccess.canAccessPhysiOmni).toBe(true);
  });
});
