-- ============================================================================
-- MIGRATION: Skill Entitlement Free Cap 3 -> 5
-- ============================================================================
-- Purpose: Raise the BASIC (free) Skill Forge cap from 3 to 5 active generated
-- skills. The 6th active-skill generation must be paywalled (HTTP 402).
--
-- This migration SUPERSEDES the BASIC=3 logic in:
--   - 20260214000001_skill_forge_protocol.sql (check_skill_entitlement)
--   - 20260610000000_skill_entitlement_db_enforcement.sql (enforce_skill_entitlement trigger)
-- Both prior files are retained as the historical applied ledger; this file is
-- the authoritative current definition.
--
-- Enforcement remains at BOTH layers (unchanged contracts, cap value only):
--   1. Edge preflight gate via check_skill_entitlement() RPC.
--   2. Atomic DB trigger enforce_skill_entitlement() via trg_enforce_skill_entitlement,
--      serialized per-user with pg_advisory_xact_lock (TOCTOU race closed).
--
-- Rules honoured:
--   - Additive / idempotent (CREATE OR REPLACE only; no table rewrite, no data loss).
--   - SECURITY DEFINER + SET search_path = public preserved on both functions.
--   - Trigger function EXECUTE stays revoked from PUBLIC, anon, authenticated.
--   - RLS policies on user_generated_skills are untouched.
--   - PRO tier contract unchanged (999999 = effectively unlimited).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Edge preflight gate: BASIC cap 3 -> 5
-- ----------------------------------------------------------------------------
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

    IF user_tier IS NULL THEN
        user_tier := 'BASIC';
    END IF;

    -- BASIC = 5 free generations, PRO = 999999 (effectively unlimited)
    IF user_tier = 'PRO' THEN
        max_limit := 999999;
    ELSE
        max_limit := 5;
    END IF;

    -- current 0-4 allowed; current 5 denied (6th attempt is paywalled)
    is_allowed := current_count < max_limit;

    RETURN jsonb_build_object(
        'allowed', is_allowed,
        'current', current_count,
        'max', max_limit,
        'tier', user_tier
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Atomic DB trigger: BASIC cap 3 -> 5 (race-safe enforcement preserved)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_skill_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_count INTEGER;
    max_limit INTEGER;
    user_tier TEXT;
BEGIN
    -- Inactive skills do not count toward the entitlement cap
    IF NEW.is_active IS DISTINCT FROM true THEN
        RETURN NEW;
    END IF;

    -- Serialize concurrent inserts/activations for this user within the
    -- transaction (released automatically at COMMIT/ROLLBACK)
    PERFORM pg_advisory_xact_lock(
        hashtextextended('user_generated_skills:' || NEW.user_id::text, 0)
    );

    -- Count existing active skills (exclude the row itself for UPDATEs)
    SELECT COUNT(*) INTO current_count
    FROM public.user_generated_skills
    WHERE user_id = NEW.user_id
      AND is_active = true
      AND id <> NEW.id;

    -- Get tier from user_entitlements (default to BASIC if not found)
    SELECT tier INTO user_tier
    FROM public.user_entitlements
    WHERE user_id = NEW.user_id
    LIMIT 1;

    IF user_tier IS NULL THEN
        user_tier := 'BASIC';
    END IF;

    -- BASIC = 5 free generations, PRO = 999999 (effectively unlimited)
    IF user_tier = 'PRO' THEN
        max_limit := 999999;
    ELSE
        max_limit := 5;
    END IF;

    IF current_count >= max_limit THEN
        RAISE EXCEPTION 'LIMIT_REACHED: skill cap (%) reached for tier %',
            max_limit, user_tier;
    END IF;

    RETURN NEW;
END;
$$;

-- Idempotent trigger creation (Postgres 15+: CREATE OR REPLACE TRIGGER)
CREATE OR REPLACE TRIGGER trg_enforce_skill_entitlement
BEFORE INSERT OR UPDATE OF is_active ON public.user_generated_skills
FOR EACH ROW
EXECUTE FUNCTION public.enforce_skill_entitlement();

-- Re-assert the SECURITY DEFINER lockdown (CANONICAL_TRUTH fact 8):
-- the trigger function must not be directly executable by anon or authenticated.
-- additive-allow: REVOKE Security hardening on trigger function re-applied after replace.
REVOKE EXECUTE ON FUNCTION public.enforce_skill_entitlement()
  FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Documentation comments (reflect the 5-skill free cap)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.user_generated_skills IS
'Stores user-forged AI skills. Free (BASIC) tier cap: 5 active generated skills; the 6th generation is paywalled (HTTP 402). PRO: effectively unlimited.';

COMMENT ON FUNCTION public.check_skill_entitlement(UUID) IS
'Edge preflight entitlement gate. Returns {allowed,current,max,tier}. BASIC max=5 (6th generation paywalled), PRO max=999999.';

COMMENT ON FUNCTION public.enforce_skill_entitlement() IS
'Atomic DB-level monetization gate for user_generated_skills. Closes the check-then-insert (TOCTOU) race: serializes per-user active-skill writes via pg_advisory_xact_lock and raises LIMIT_REACHED when the tier cap (BASIC=5, PRO=999999) is exceeded.';
