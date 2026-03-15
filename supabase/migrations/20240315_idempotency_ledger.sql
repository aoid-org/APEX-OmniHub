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

-- Enable RLS
ALTER TABLE idempotency_ledger ENABLE ROW LEVEL SECURITY;

-- Allow access for authenticated roles (like orchestrator backend)
CREATE POLICY "Allow orchestrator to read and write idempotency records"
    ON idempotency_ledger
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Index for querying by workflow
CREATE INDEX IF NOT EXISTS idx_idempotency_workflow_id ON idempotency_ledger(workflow_id);
