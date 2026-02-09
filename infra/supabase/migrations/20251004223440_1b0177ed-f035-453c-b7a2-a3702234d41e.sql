-- Performance optimization: Add indexes for common query patterns

-- Index on user_id for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_links_user_id ON public.links(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON public.automations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Index on created_at for sorting and time-based queries
CREATE INDEX IF NOT EXISTS idx_links_created_at ON public.links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automations_created_at ON public.automations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integrations_created_at ON public.integrations(created_at DESC);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_links_user_favorite ON public.links(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_automations_user_active ON public.automations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_integrations_user_status ON public.integrations(user_id, status);

-- Index for file path lookups
CREATE INDEX IF NOT EXISTS idx_files_file_path ON public.files(file_path);

-- Index for health checks cleanup queries
CREATE INDEX IF NOT EXISTS idx_health_checks_created_at ON public.health_checks(created_at DESC);

-- Add updated_at triggers for tables missing them
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers where missing
DROP TRIGGER IF EXISTS handle_links_updated_at ON public.links;
CREATE TRIGGER handle_links_updated_at
  BEFORE UPDATE ON public.links
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_automations_updated_at ON public.automations;
CREATE TRIGGER handle_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_integrations_updated_at ON public.integrations;
CREATE TRIGGER handle_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();