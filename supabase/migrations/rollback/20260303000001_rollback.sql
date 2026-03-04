-- ================================================================
-- ROLLBACK: 20260303000001_create_security_incidents_table.sql
-- DROP ORDER: function → table
-- ================================================================

DROP FUNCTION IF EXISTS public.cleanup_old_security_incidents();

-- Trigger function (shared name — only drop if not used by other tables)
-- DROP FUNCTION IF EXISTS public.handle_updated_at();

DROP TABLE IF EXISTS public.security_incidents CASCADE;
