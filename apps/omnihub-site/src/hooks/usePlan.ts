/**
 * usePlan — Fetches the authenticated user's subscription tier from Supabase.
 *
 * FAIL-CLOSED: any fetch error, missing config, or unauthenticated state
 * resolves to 'free'. Never optimistically upgrades a tier.
 *
 * Tier ladder:
 *   free → starter → pro ($99 CAD) → business ($299 CAD) → enterprise (custom)
 *
 * PhysiOmni gate:
 *   physiomni.view_preview  = pro | business | enterprise
 *   physiomni.launch_pilot  = business | enterprise
 *   physiomni.hardware_control = enterprise (+ manual approval required)
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useEffect, useState } from 'react';
import { supabase, hasSupabaseConfig } from '@/lib/supabase';

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

export interface PlanState {
  readonly tier: SubscriptionTier;
  readonly loading: boolean;
  /** true when tier >= business */
  readonly canAccessPhysiOmni: boolean;
  /** true when tier === pro — preview/waitlist only */
  readonly canPreviewPhysiOmni: boolean;
  /** true when tier === enterprise */
  readonly canControlHardware: boolean;
}

const FREE_STATE: PlanState = {
  tier: 'free',
  loading: false,
  canAccessPhysiOmni: false,
  canPreviewPhysiOmni: false,
  canControlHardware: false,
};

const LOADING_STATE: PlanState = {
  tier: 'free',
  loading: true,
  canAccessPhysiOmni: false,
  canPreviewPhysiOmni: false,
  canControlHardware: false,
};

const VALID_TIERS = new Set<string>(['free', 'starter', 'pro', 'business', 'enterprise']);

function deriveState(tier: SubscriptionTier): PlanState {
  return {
    tier,
    loading: false,
    canAccessPhysiOmni: tier === 'business' || tier === 'enterprise',
    canPreviewPhysiOmni: tier === 'pro' || tier === 'business' || tier === 'enterprise',
    canControlHardware: tier === 'enterprise',
  };
}

export function usePlan(): PlanState {
  const [state, setState] = useState<PlanState>(LOADING_STATE);

  useEffect(() => {
    let cancelled = false;

    async function fetchTier() {
      if (!hasSupabaseConfig) {
        if (!cancelled) setState(FREE_STATE);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        if (!user) {
          setState(FREE_STATE);
          return;
        }

        const { data, error } = await supabase
          .from('subscriptions')
          .select('tier')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          // No subscription row = free tier. Fail-closed.
          setState(FREE_STATE);
          return;
        }

        const raw = typeof data.tier === 'string' ? data.tier : 'free';
        const tier: SubscriptionTier = VALID_TIERS.has(raw)
          ? (raw as SubscriptionTier)
          : 'free';

        setState(deriveState(tier));
      } catch {
        // Any exception = fail-closed to free
        if (!cancelled) setState(FREE_STATE);
      }
    }

    void fetchTier();
    return () => { cancelled = true; };
  }, []);

  return state;
}
