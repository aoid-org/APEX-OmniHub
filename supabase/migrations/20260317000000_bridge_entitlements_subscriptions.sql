-- ============================================================================
-- MIGRATION: Bridge Entitlements and Subscriptions
-- ============================================================================
-- Purpose:
-- 1. Revoke client-side INSERT on user_entitlements
-- 2. Add bridge fields to user_entitlements and subscriptions if missing
-- 3. Create an idempotent RPC to activate both safely server-side
-- ============================================================================

-- Ensure onboarding_completed_at exists on user_entitlements
ALTER TABLE public.user_entitlements
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Revoke Client-Side Insert (from OnboardingWizard)
DROP POLICY IF EXISTS "Users can insert own entitlements" ON public.user_entitlements;

-- Ensure index exists for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_entitlements_tier ON public.user_entitlements(tier);
-- Ensure unique constraint for idempotency
ALTER TABLE public.user_entitlements ADD CONSTRAINT unique_user_entitlement UNIQUE (user_id);

-- Create the unified RPC for server-side activation
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
AS $$
DECLARE
    v_subscription_tier public.subscription_tier;
    v_subscription_status public.subscription_status;
    v_entitlement_record RECORD;
    v_subscription_record RECORD;
BEGIN
    -- Input validation
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id cannot be null';
    END IF;

    IF p_tier NOT IN ('BASIC', 'PRO') THEN
        RAISE EXCEPTION 'Invalid tier. Must be BASIC or PRO.';
    END IF;

    -- Map tier string to subscription_tier enum
    IF p_tier = 'PRO' THEN
        v_subscription_tier := 'pro'::public.subscription_tier;
    ELSE
        v_subscription_tier := 'starter'::public.subscription_tier;
    END IF;

    v_subscription_status := 'active'::public.subscription_status;

    -- Upsert user_entitlements safely via unique constraint on user_id
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
        p_skills,
        now(),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        tier = EXCLUDED.tier,
        active_skills = EXCLUDED.active_skills,
        onboarding_completed_at = COALESCE(public.user_entitlements.onboarding_completed_at, EXCLUDED.onboarding_completed_at),
        updated_at = EXCLUDED.updated_at
    RETURNING id INTO v_entitlement_record;

    -- Upsert subscriptions safely via unique constraint on user_id
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

    -- Return the result
    RETURN jsonb_build_object(
        'success', true,
        'entitlement_id', v_entitlement_record.id,
        'subscription_id', v_subscription_record.id
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to activate client subscription: %', SQLERRM;
END;
$$;

-- Grant execution to authenticated users (so the edge functions run securely)
GRANT EXECUTE ON FUNCTION public.activate_client_subscription(UUID, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
-- Grant execution to service_role (for webhook)
GRANT EXECUTE ON FUNCTION public.activate_client_subscription(UUID, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
