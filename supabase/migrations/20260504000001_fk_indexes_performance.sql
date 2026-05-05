-- FK covering indexes for unindexed foreign keys flagged by Supabase performance advisor

CREATE INDEX IF NOT EXISTS idx_emergency_controls_updated_by
  ON public.emergency_controls (updated_by);

CREATE INDEX IF NOT EXISTS idx_health_checks_user_id
  ON public.health_checks (user_id);

CREATE INDEX IF NOT EXISTS idx_ingest_artifacts_job_id
  ON public.ingest_artifacts (job_id);

CREATE INDEX IF NOT EXISTS idx_ingest_dead_letters_job_id
  ON public.ingest_dead_letters (job_id);

CREATE INDEX IF NOT EXISTS idx_ingest_parse_results_job_id
  ON public.ingest_parse_results (job_id);

CREATE INDEX IF NOT EXISTS idx_media_publications_league_id
  ON public.media_publications (league_id);

CREATE INDEX IF NOT EXISTS idx_omnilink_entities_last_event_id
  ON public.omnilink_entities (last_event_id);

CREATE INDEX IF NOT EXISTS idx_omnilink_events_api_key_id
  ON public.omnilink_events (api_key_id);

CREATE INDEX IF NOT EXISTS idx_omnilink_orchestration_requests_api_key_id
  ON public.omnilink_orchestration_requests (api_key_id);

CREATE INDEX IF NOT EXISTS idx_omnilink_runs_integration_id
  ON public.omnilink_runs (integration_id);

CREATE INDEX IF NOT EXISTS idx_omnilink_runs_orchestration_request_id
  ON public.omnilink_runs (orchestration_request_id);

CREATE INDEX IF NOT EXISTS idx_product_media_media_asset_id
  ON public.product_media (media_asset_id);

CREATE INDEX IF NOT EXISTS idx_product_media_product_id
  ON public.product_media (product_id);

CREATE INDEX IF NOT EXISTS idx_usage_metering_user_id
  ON public.usage_metering (user_id);
