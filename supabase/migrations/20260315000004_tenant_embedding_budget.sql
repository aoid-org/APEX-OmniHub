-- Migration: Per-tenant embedding token budget
-- Purpose:   OpenAI embedding calls are currently unmetered per tenant.
--            At 1K tokens/embedding x 100 embeddings/day x 100 tenants
--            = 10M tokens/day. No hard cap means one runaway tenant
--            can generate a multi-thousand dollar bill before detection.
-- Gap:       GAP-4 (no per-tenant token cap or enforcement)
-- Author:    APEX Engineering
-- Date:      2026-03-15

CREATE TABLE IF NOT EXISTS public.tenant_embedding_budget (
    user_id                   UUID        PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_token_limit       INT         NOT NULL DEFAULT 500000
        CHECK (monthly_token_limit > 0),
    current_month_tokens_used INT         NOT NULL DEFAULT 0
        CHECK (current_month_tokens_used >= 0),
    budget_period_start       DATE        NOT NULL
        DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
    alert_sent_at_80pct       TIMESTAMPTZ,
    hard_cap_triggered_at     TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_embedding_budget
    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'tenant_embedding_budget'
          AND policyname = 'tenant_budget_owner_read'
    ) THEN
        CREATE POLICY "tenant_budget_owner_read"
            ON public.tenant_embedding_budget
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'tenant_embedding_budget'
          AND policyname = 'tenant_budget_service_all'
    ) THEN
        CREATE POLICY "tenant_budget_service_all"
            ON public.tenant_embedding_budget
            FOR ALL TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_budget_user_period
    ON public.tenant_embedding_budget (user_id, budget_period_start);

-- Atomic increment with cap enforcement.
-- Returns 'ok' | 'soft_cap' (>= 80%) | 'hard_cap' (>= 100%)
CREATE OR REPLACE FUNCTION public.increment_embedding_tokens(
    p_user_id UUID,
    p_tokens  INT
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_row             public.tenant_embedding_budget%ROWTYPE;
    v_pct             NUMERIC;
    v_result          TEXT := 'ok';
    v_month           DATE := date_trunc('month', CURRENT_DATE)::DATE;
    v_is_service_role BOOLEAN := COALESCE(auth.role() = 'service_role', false);
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id is required'
            USING ERRCODE = '22023';
    END IF;

    -- Authenticated callers may only mutate their own quota; service role handles trusted backend jobs.
    IF NOT v_is_service_role AND p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'increment_embedding_tokens cannot modify another user quota'
            USING ERRCODE = '42501';
    END IF;

    -- Token deltas must be positive to prevent quota bypass or negative counters.
    IF p_tokens IS NULL OR p_tokens <= 0 THEN
        RAISE EXCEPTION 'p_tokens must be a positive integer'
            USING ERRCODE = '22023';
    END IF;

    -- Upsert row for current month
    INSERT INTO public.tenant_embedding_budget (user_id, budget_period_start)
    VALUES (p_user_id, v_month)
    ON CONFLICT (user_id) DO NOTHING;

    -- Reset counter when month rolls over
    UPDATE public.tenant_embedding_budget
    SET current_month_tokens_used = 0,
        budget_period_start       = v_month,
        alert_sent_at_80pct       = NULL,
        hard_cap_triggered_at     = NULL,
        updated_at                = now()
    WHERE user_id = p_user_id
      AND budget_period_start < v_month;

    -- Lock row for atomic update
    SELECT * INTO v_row
    FROM public.tenant_embedding_budget
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Hard cap: reject before incrementing, including requests that would exceed the limit.
    IF v_row.current_month_tokens_used >= v_row.monthly_token_limit
       OR v_row.current_month_tokens_used::BIGINT + p_tokens::BIGINT > v_row.monthly_token_limit THEN
        UPDATE public.tenant_embedding_budget
        SET hard_cap_triggered_at = COALESCE(hard_cap_triggered_at, now()),
            updated_at            = now()
        WHERE user_id = p_user_id;
        RETURN 'hard_cap';
    END IF;

    -- Increment
    UPDATE public.tenant_embedding_budget
    SET current_month_tokens_used =
            current_month_tokens_used + p_tokens,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;

    -- Soft cap alert at 80%
    v_pct := v_row.current_month_tokens_used::NUMERIC
           / v_row.monthly_token_limit * 100;

    IF v_pct >= 80 AND v_row.alert_sent_at_80pct IS NULL THEN
        UPDATE public.tenant_embedding_budget
        SET alert_sent_at_80pct = now(),
            updated_at          = now()
        WHERE user_id = p_user_id;
        v_result := 'soft_cap';
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_embedding_tokens
    TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_embedding_tokens
    TO service_role;

COMMENT ON TABLE public.tenant_embedding_budget IS
    'Per-user monthly embedding token budget. '
    'Soft cap at 80% returns soft_cap. '
    'Hard cap at 100% returns hard_cap and blocks further calls.';
