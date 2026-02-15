-- ============================================================================
-- MIGRATION: Skill Forge Protocol (The Pilot Trap)
-- ============================================================================
-- Purpose: Implement user-generated AI skills with 3-skill free tier limit
--
-- TABLE: user_generated_skills
-- - Stores individual forged skills (separate from user_entitlements.active_skills)
-- - Enforces monetization through database-level entitlement gates
-- - RLS ensures users can only access their own skills
--
-- FUNCTION: check_skill_entitlement
-- - Returns skill creation eligibility
-- - Defaults to 3-skill limit for free tier (Pilot Trap)
-- - Drives paid conversions by enforcing database-level throttle
-- ============================================================================

-- Create user_generated_skills table
CREATE TABLE IF NOT EXISTS public.user_generated_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_intent TEXT NOT NULL,
    definition JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    origin TEXT NOT NULL DEFAULT 'skill_forge'
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_generated_skills_user_id
ON public.user_generated_skills(user_id);

CREATE INDEX IF NOT EXISTS idx_user_generated_skills_is_active
ON public.user_generated_skills(user_id, is_active);

-- Enable RLS
ALTER TABLE public.user_generated_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view own skills
CREATE POLICY "Users can view own skills"
ON public.user_generated_skills
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert own skills (entitlement check in edge function)
CREATE POLICY "Users can insert own skills"
ON public.user_generated_skills
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update own skills
CREATE POLICY "Users can update own skills"
ON public.user_generated_skills
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete own skills
CREATE POLICY "Users can delete own skills"
ON public.user_generated_skills
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- STORED FUNCTION: check_skill_entitlement
-- ============================================================================
-- The Monetization Throttle
--
-- Returns:
-- {
--   "allowed": boolean,
--   "current": number,
--   "max": number,
--   "tier": "BASIC" | "PRO"
-- }
--
-- Business Logic:
-- - Free tier (BASIC): 3 skills maximum (The Pilot Trap)
-- - PRO tier: Unlimited skills
-- - Defaults to BASIC tier if no user_entitlements record exists
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_skill_entitlement(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_count INTEGER;
    max_limit INTEGER;
    user_tier TEXT;
    is_allowed BOOLEAN;
BEGIN
    -- Count existing active skills
    SELECT COUNT(*) INTO current_count
    FROM public.user_generated_skills
    WHERE user_id = user_uuid AND is_active = true;

    -- Get tier from user_entitlements (default to BASIC if not found)
    SELECT tier INTO user_tier
    FROM public.user_entitlements
    WHERE user_id = user_uuid
    LIMIT 1;

    -- Default to BASIC tier if no entitlement record exists
    IF user_tier IS NULL THEN
        user_tier := 'BASIC';
    END IF;

    -- Set max_limit based on tier
    -- BASIC = 3 (The Pilot Trap), PRO = 999999 (effectively unlimited)
    IF user_tier = 'PRO' THEN
        max_limit := 999999;
    ELSE
        max_limit := 3;
    END IF;

    -- Determine if creation is allowed
    is_allowed := current_count < max_limit;

    -- Return JSONB result
    RETURN jsonb_build_object(
        'allowed', is_allowed,
        'current', current_count,
        'max', max_limit,
        'tier', user_tier
    );
END;
$$;

-- Comments for documentation
COMMENT ON TABLE public.user_generated_skills IS 'Stores user-forged AI skills with 3-skill free tier limit (Pilot Trap)';
COMMENT ON COLUMN public.user_generated_skills.definition IS 'JSONB skill definition: {description, instructions, required_apis}';
COMMENT ON COLUMN public.user_generated_skills.origin IS 'Source of skill creation (skill_forge, api, import)';
COMMENT ON FUNCTION public.check_skill_entitlement(UUID) IS 'Returns skill creation eligibility (Monetization Throttle)';
