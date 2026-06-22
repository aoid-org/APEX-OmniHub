-- Migration: OmniLink Links Persistence
-- Purpose: Provide durable backing for the Links module
-- Constraint: Idempotent and RLS protected

CREATE TABLE IF NOT EXISTS public.omnilink_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Protect against accidental duplicate policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'omnilink_links' AND policyname = 'Users can insert their own links'
    ) THEN
        ALTER TABLE public.omnilink_links ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can insert their own links"
            ON public.omnilink_links FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can view their own links"
            ON public.omnilink_links FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own links"
            ON public.omnilink_links FOR DELETE
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can update their own links"
            ON public.omnilink_links FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;
