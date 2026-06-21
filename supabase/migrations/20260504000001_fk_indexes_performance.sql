-- FK covering indexes for unindexed foreign keys flagged by Supabase performance advisor
--
-- Several target tables are created out-of-band in production and are absent from
-- the migration history, so a clean apply previously failed with
-- "relation ... does not exist". Each index is now created only when its table
-- exists, so the full history applies cleanly; where a table is present the index
-- is created exactly as before (still idempotent via IF NOT EXISTS).
DO $do$
DECLARE
  ddl text;
BEGIN
  FOR ddl IN
    SELECT stmt FROM (VALUES
      ('emergency_controls',              'CREATE INDEX IF NOT EXISTS idx_emergency_controls_updated_by ON public.emergency_controls (updated_by)'),
      ('health_checks',                   'CREATE INDEX IF NOT EXISTS idx_health_checks_user_id ON public.health_checks (user_id)'),
      ('ingest_artifacts',               'CREATE INDEX IF NOT EXISTS idx_ingest_artifacts_job_id ON public.ingest_artifacts (job_id)'),
      ('ingest_dead_letters',            'CREATE INDEX IF NOT EXISTS idx_ingest_dead_letters_job_id ON public.ingest_dead_letters (job_id)'),
      ('ingest_parse_results',           'CREATE INDEX IF NOT EXISTS idx_ingest_parse_results_job_id ON public.ingest_parse_results (job_id)'),
      ('media_publications',             'CREATE INDEX IF NOT EXISTS idx_media_publications_league_id ON public.media_publications (league_id)'),
      ('omnilink_entities',             'CREATE INDEX IF NOT EXISTS idx_omnilink_entities_last_event_id ON public.omnilink_entities (last_event_id)'),
      ('omnilink_events',               'CREATE INDEX IF NOT EXISTS idx_omnilink_events_api_key_id ON public.omnilink_events (api_key_id)'),
      ('omnilink_orchestration_requests','CREATE INDEX IF NOT EXISTS idx_omnilink_orchestration_requests_api_key_id ON public.omnilink_orchestration_requests (api_key_id)'),
      ('omnilink_runs',                 'CREATE INDEX IF NOT EXISTS idx_omnilink_runs_integration_id ON public.omnilink_runs (integration_id)'),
      ('omnilink_runs',                 'CREATE INDEX IF NOT EXISTS idx_omnilink_runs_orchestration_request_id ON public.omnilink_runs (orchestration_request_id)'),
      ('product_media',                 'CREATE INDEX IF NOT EXISTS idx_product_media_media_asset_id ON public.product_media (media_asset_id)'),
      ('product_media',                 'CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON public.product_media (product_id)'),
      ('usage_metering',               'CREATE INDEX IF NOT EXISTS idx_usage_metering_user_id ON public.usage_metering (user_id)')
    ) AS t(tbl, stmt)
    WHERE EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t.tbl
    )
  LOOP
    EXECUTE ddl;
  END LOOP;
END $do$;
