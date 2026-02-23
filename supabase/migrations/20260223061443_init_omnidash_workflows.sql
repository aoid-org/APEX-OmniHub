-- workflows table
CREATE TABLE workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflows_owner_policy" ON workflows
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- workflow_runs table
CREATE TABLE workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id),
  user_id uuid REFERENCES auth.users NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  output jsonb
);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_runs_owner_policy" ON workflow_runs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_generated_skills table
CREATE TABLE user_generated_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  trigger_intent text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_generated_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_generated_skills_owner_policy" ON user_generated_skills
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- omni_run_events table
-- Events are scoped to the owning user via the parent workflow's user_id.
CREATE TABLE omni_run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id),
  event_key text NOT NULL,
  kind text NOT NULL,
  payload jsonb,
  occurred_at timestamptz DEFAULT now()
);

ALTER TABLE omni_run_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "omni_run_events_owner_policy" ON omni_run_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE id = omni_run_events.workflow_id
        AND user_id = auth.uid()
    )
  );
