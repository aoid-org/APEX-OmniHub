-- APEX-OmniHub: Bulk Memory Access Tracking
-- Migration: Add touch_memories_bulk for high-throughput context retrieval
--
-- PERFORMANCE:
--   - Reduces N RPC calls to 1 for bulk retrieval
--   - Minimizes context switching overhead in PostgreSQL
--
-- SECURITY:
--   - SECURITY DEFINER ensures access tracking even if RLS is tight
--   - search_path set to public to prevent hijacking

CREATE OR REPLACE FUNCTION public.touch_memories_bulk(memory_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.memories
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE id = ANY(memory_ids);
END;
$$;

COMMENT ON FUNCTION public.touch_memories_bulk IS
  'Bulk access tracking for memories. Updates access_count and '
  'last_accessed_at for a batch of memory IDs in a single transaction.';
