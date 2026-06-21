-- workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'workflows_owner_policy') THEN
    CREATE POLICY "workflows_owner_policy" ON workflows
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- workflow_runs table
CREATE TABLE IF NOT EXISTS workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id),
  user_id uuid REFERENCES auth.users NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  output jsonb
);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'workflow_runs_owner_policy') THEN
    CREATE POLICY "workflow_runs_owner_policy" ON workflow_runs
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- user_generated_skills table
CREATE TABLE IF NOT EXISTS user_generated_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  trigger_intent text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_generated_skills ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_generated_skills_owner_policy') THEN
    CREATE POLICY "user_generated_skills_owner_policy" ON user_generated_skills
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- omni_run_events table
CREATE TABLE IF NOT EXISTS omni_run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id),
  event_key text NOT NULL,
  kind text NOT NULL,
  payload jsonb,
  occurred_at timestamptz DEFAULT now()
);

ALTER TABLE omni_run_events ENABLE ROW LEVEL SECURITY;

-- Only create this uuid-keyed owner policy when omni_run_events.workflow_id is
-- actually uuid (greenfield, where this migration created the table). On the real
-- migration history the table already exists from 20260125000000_omnitrace_replay
-- with workflow_id TEXT and its own RLS owner policies, so this would raise
-- "operator does not exist: uuid = text". Skipping it there preserves security
-- (OmniTrace policies remain in force) and lets the full history apply cleanly.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'omni_run_events_owner_policy')
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'omni_run_events'
         AND column_name = 'workflow_id'
         AND data_type = 'uuid'
     ) THEN
    CREATE POLICY "omni_run_events_owner_policy" ON omni_run_events
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM workflows
          WHERE id = omni_run_events.workflow_id
            AND user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- omnidash_workflows RLS (table created out-of-band in production; never captured
-- as a migration). Guard so the full history applies on a clean database where the
-- table is absent. Where the table exists, RLS is still enabled as before.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'omnidash_workflows'
  ) THEN
    EXECUTE 'ALTER TABLE public.omnidash_workflows ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
