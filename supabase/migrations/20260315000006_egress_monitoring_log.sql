-- Migration: Egress usage tracking table for monitoring
-- Purpose: Wire Supabase egress tracking — alert at 70%/90% of plan limits.
-- Gap:     6.2
-- Author:  APEX Engineering
-- Date:    2026-03-15

CREATE TABLE IF NOT EXISTS public.infra_usage_log (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name   TEXT        NOT NULL,
    metric_value  NUMERIC     NOT NULL,
    threshold_pct INT,
    alert_level   TEXT        CHECK (alert_level IN ('info', 'warning', 'critical')),
    recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: service_role only (internal telemetry)
ALTER TABLE public.infra_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "infra_usage_service_all"
  ON public.infra_usage_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_infra_usage_metric_recorded
  ON public.infra_usage_log (metric_name, recorded_at DESC);

COMMENT ON TABLE public.infra_usage_log IS
  'Infrastructure usage snapshots for egress, storage, and compute monitoring. '
  'Populated by the nightly-evaluation workflow and edge function health checks.';
