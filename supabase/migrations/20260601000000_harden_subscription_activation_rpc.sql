-- ============================================================================
-- MIGRATION: Harden subscription activation RPC execution boundary
-- ============================================================================
-- Security context:
-- public.activate_client_subscription is SECURITY DEFINER and can grant paid
-- entitlements. It must only be callable by trusted server-side service-role
-- code (Stripe webhook / activate-client Edge Function), never directly by a
-- browser-authenticated user that can choose p_user_id or p_tier.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.activate_client_subscription(
    p_user_id UUID,
    p_tier TEXT,
    p_skills JSONB,
    p_stripe_customer_id TEXT DEFAULT NULL,
    p_stripe_subscription_id TEXT DEFAULT NULL,
    p_current_period_start TIMESTAMPTZ DEFAULT NULL,
    p_current_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_subscription_tier public.subscription_tier;
    v_subscription_status public.subscription_status;
    v_entitlement_record RECORD;
    v_subscription_record RECORD;
BEGIN
    -- Fail closed unless PostgREST/Supabase authenticated the caller as
    -- service_role. SECURITY DEFINER changes current_user to the function owner,
    -- so auth.role() is the trusted invoker signal here.
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
        RAISE EXCEPTION 'activate_client_subscription requires service_role';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id cannot be null';
    END IF;

    IF p_tier NOT IN ('BASIC', 'PRO') THEN
        RAISE EXCEPTION 'Invalid tier. Must be BASIC or PRO.';
    END IF;

    IF p_tier = 'PRO' THEN
        v_subscription_tier := 'pro'::public.subscription_tier;
    ELSE
        v_subscription_tier := 'starter'::public.subscription_tier;
    END IF;

    v_subscription_status := 'active'::public.subscription_status;

    INSERT INTO public.user_entitlements (
        user_id,
        tier,
        active_skills,
        onboarding_completed_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_tier,
        COALESCE(p_skills, '[]'::jsonb),
        now(),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        tier = EXCLUDED.tier,
        active_skills = EXCLUDED.active_skills,
        onboarding_completed_at = COALESCE(public.user_entitlements.onboarding_completed_at, EXCLUDED.onboarding_completed_at),
        updated_at = EXCLUDED.updated_at
    RETURNING id INTO v_entitlement_record;

    INSERT INTO public.subscriptions (
        user_id,
        tier,
        status,
        stripe_customer_id,
        stripe_subscription_id,
        current_period_start,
        current_period_end
    )
    VALUES (
        p_user_id,
        v_subscription_tier,
        v_subscription_status,
        p_stripe_customer_id,
        p_stripe_subscription_id,
        p_current_period_start,
        p_current_period_end
    )
    ON CONFLICT (user_id) DO UPDATE SET
        tier = EXCLUDED.tier,
        status = EXCLUDED.status,
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end
    RETURNING id INTO v_subscription_record;

    RETURN jsonb_build_object(
        'success', true,
        'entitlement_id', v_entitlement_record.id,
        'subscription_id', v_subscription_record.id
    );
END;
$$;

-- additive-allow: REVOKE SECURITY FIX: entitlement activation must not remain executable by broad default roles.
REVOKE ALL ON FUNCTION public.activate_client_subscription(UUID, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
-- additive-allow: REVOKE SECURITY FIX: anonymous callers must not activate subscriptions through SECURITY DEFINER RPC.
REVOKE EXECUTE ON FUNCTION public.activate_client_subscription(UUID, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;
-- additive-allow: REVOKE SECURITY FIX: authenticated users must activate only through the server-side Edge Function.
REVOKE EXECUTE ON FUNCTION public.activate_client_subscription(UUID, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.activate_client_subscription(UUID, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
