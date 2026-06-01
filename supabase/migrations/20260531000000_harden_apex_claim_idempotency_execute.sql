-- Harden apex_claim_idempotency for already-migrated databases.
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default; this SECURITY DEFINER RPC must remain service-role only.
REVOKE EXECUTE ON FUNCTION public.apex_claim_idempotency(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apex_claim_idempotency(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apex_claim_idempotency(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apex_claim_idempotency(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT) TO service_role;
