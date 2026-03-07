-- ================================================================
-- ROLLBACK: 20260303000002_create_circuit_breaker_state.sql
-- DROP ORDER: function → table
-- ================================================================

DROP FUNCTION IF EXISTS public.upsert_circuit_breaker(
  UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, JSONB
);

-- Trigger function (shared — only drop if not used elsewhere)
-- DROP FUNCTION IF EXISTS public.handle_updated_at();

DROP TABLE IF EXISTS public.circuit_breaker_state CASCADE;
