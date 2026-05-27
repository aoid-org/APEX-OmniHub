-- Bulk touch memories (access tracking)
CREATE OR REPLACE FUNCTION public.touch_memories(memory_ids UUID[])
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

COMMENT ON FUNCTION public.touch_memories IS
  'Updates access_count and last_accessed_at for multiple memories in a single statement.';
