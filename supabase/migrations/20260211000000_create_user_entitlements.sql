-- ============================================================================
-- MIGRATION: User Entitlements for Universal Entity Protocol
-- ============================================================================
-- Purpose: Store generated skills and tier status for users (Universal Entity Protocol)
--
-- TABLE: user_entitlements
-- - id: UUID PK
-- - user_id: UUID FK to auth.users
-- - tier: TEXT ('BASIC' | 'PRO')
-- - active_skills: JSONB (Stores the generated skill objects)
-- - created_at: TIMESTAMPTZ
-- - updated_at: TIMESTAMPTZ
--
-- RLS: Enabled
-- Policies:
-- - Users can view own entitlements
-- - Users can insert own entitlements (required for activation flow)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('BASIC', 'PRO')),
    active_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);

-- RLS
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. View own
CREATE POLICY "Users can view own entitlements"
ON public.user_entitlements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Insert own (For the activation flow in OnboardingWizard)
CREATE POLICY "Users can insert own entitlements"
ON public.user_entitlements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Update own (Optional, but good for future tier upgrades)
CREATE POLICY "Users can update own entitlements"
ON public.user_entitlements
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.user_entitlements IS 'Stores Universal Entity Protocol generated skills and access tiers';
COMMENT ON COLUMN public.user_entitlements.active_skills IS 'JSONB array of generated skill objects (id, name, description, etc.)';
