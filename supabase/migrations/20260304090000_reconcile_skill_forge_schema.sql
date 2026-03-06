-- Reconcile SkillForge schema drift across prior migrations.
-- Ensures user_generated_skills always exposes canonical SkillForge contract.

ALTER TABLE IF EXISTS public.user_generated_skills
  ADD COLUMN IF NOT EXISTS definition JSONB;

UPDATE public.user_generated_skills
SET definition = '{}'::jsonb
WHERE definition IS NULL;

ALTER TABLE IF EXISTS public.user_generated_skills
  ALTER COLUMN definition SET DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.user_generated_skills
  ALTER COLUMN definition SET NOT NULL;

ALTER TABLE IF EXISTS public.user_generated_skills
  ADD COLUMN IF NOT EXISTS origin TEXT;

UPDATE public.user_generated_skills
SET origin = 'skill_forge'
WHERE origin IS NULL;

ALTER TABLE IF EXISTS public.user_generated_skills
  ALTER COLUMN origin SET DEFAULT 'skill_forge';

ALTER TABLE IF EXISTS public.user_generated_skills
  ALTER COLUMN origin SET NOT NULL;

ALTER TABLE IF EXISTS public.user_generated_skills
  ALTER COLUMN trigger_intent SET DEFAULT 'manual_trigger';

UPDATE public.user_generated_skills
SET trigger_intent = 'manual_trigger'
WHERE trigger_intent IS NULL;

ALTER TABLE IF EXISTS public.user_generated_skills
  ALTER COLUMN trigger_intent SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_generated_skills_user_id
  ON public.user_generated_skills(user_id);

CREATE INDEX IF NOT EXISTS idx_user_generated_skills_is_active
  ON public.user_generated_skills(user_id, is_active);

DO $$
DECLARE
  v_table_name CONSTANT text := 'user_generated_skills';
  v_schema_name CONSTANT text := 'public';
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = v_schema_name
      AND tablename = v_table_name
      AND policyname = 'Users can view own skills'
  ) THEN
    CREATE POLICY "Users can view own skills"
      ON public.user_generated_skills
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = v_schema_name
      AND tablename = v_table_name
      AND policyname = 'Users can insert own skills'
  ) THEN
    CREATE POLICY "Users can insert own skills"
      ON public.user_generated_skills
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = v_schema_name
      AND tablename = v_table_name
      AND policyname = 'Users can update own skills'
  ) THEN
    CREATE POLICY "Users can update own skills"
      ON public.user_generated_skills
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = v_schema_name
      AND tablename = v_table_name
      AND policyname = 'Users can delete own skills'
  ) THEN
    CREATE POLICY "Users can delete own skills"
      ON public.user_generated_skills
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
