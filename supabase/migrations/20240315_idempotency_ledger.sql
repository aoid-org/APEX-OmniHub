-- Create idempotency ledger table for webhook side effects

CREATE TABLE IF NOT EXISTS idempotency_ledger (
    idempotency_key TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    workflow_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    result_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Backend-internal orchestration table: service_role bypasses RLS, browser roles must fail closed.
ALTER TABLE public.idempotency_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_ledger FORCE ROW LEVEL SECURITY;

-- Remove default/browser access so clients cannot read or poison side-effect results.
REVOKE ALL ON TABLE public.idempotency_ledger FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.idempotency_ledger TO service_role;

-- Index for querying by workflow
CREATE INDEX IF NOT EXISTS idx_idempotency_workflow_id ON idempotency_ledger(workflow_id);
