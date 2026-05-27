-- ============================================================================
-- PhysiOmni Phase 2: Physical-Edge Intelligence & Orchestration Schema
-- ============================================================================
--
-- Adds anomaly score tracking, baseline computation structures, RLS policies,
-- and asynchronous pg_net HTTP webhook dispatchers.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 1. ADD ANOMALY SCORE COLUMN TO PARTITIONED TELEMETRY ────────────────────
ALTER TABLE public.physiomni_telemetry
  ADD COLUMN IF NOT EXISTS anomaly_score double precision;

-- ── 2. BASELINE PROFILES TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.physiomni_baselines (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- additive-allow: ON_DELETE_CASCADE Clean up baselines if device is deleted
  device_id             uuid        NOT NULL REFERENCES public.physiomni_devices(id) ON DELETE CASCADE,
  -- additive-allow: ON_DELETE_CASCADE Clean up baselines if tenant is deleted
  tenant_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_class           text        NOT NULL,
  baseline_period_start timestamptz NOT NULL,
  baseline_period_end   timestamptz NOT NULL,
  normal_envelope       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  computed_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.physiomni_baselines IS
  'PhysiOmni baseline learning loop profiles. Contains the normal RMS, Peak, and FFT '
  'envelope structures for industrial hardware pilot anomaly comparison.';

-- ── 3. OPTIMAL BASELINE INDEXES ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_physiomni_baselines_device
  ON public.physiomni_baselines(device_id);

CREATE INDEX IF NOT EXISTS idx_physiomni_baselines_tenant
  ON public.physiomni_baselines(tenant_id);

-- ── 4. ROW LEVEL SECURITY & TENANT ISOLATION ───────────────────────────────
ALTER TABLE public.physiomni_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users select own tenant baselines"
  ON public.physiomni_baselines
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "Authenticated users insert own tenant baselines"
  ON public.physiomni_baselines
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Authenticated users update own tenant baselines"
  ON public.physiomni_baselines
  FOR UPDATE TO authenticated
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Service role manages all PhysiOmni baselines"
  ON public.physiomni_baselines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 5. ASYNCHRONOUS WEBHOOK TRIGGER FUNCTION ───────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_guardian_eval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ingress_url text;
  payload     jsonb;
BEGIN
  -- Obtain ingress endpoint from settings or fallback to standard pilot staging ingress
  ingress_url := coalesce(
    current_setting('app.settings.temporal_ingress_url', true),
    'http://orchestrator-gateway.public:8080/v1/physiomni/ingress'
  );

  payload := jsonb_build_object(
    'telemetry_id', NEW.id,
    'tenant_id', NEW.tenant_id,
    'device_serial', NEW.device_serial,
    'vibration_x', NEW.vibration_x,
    'vibration_y', NEW.vibration_y,
    'vibration_z', NEW.vibration_z,
    'temperature_c', NEW.temperature_c,
    'anomaly_score', NEW.anomaly_score,
    'captured_at', NEW.captured_at,
    'received_at', NEW.received_at
  );

  -- Perform asynchronous HTTP POST via pg_net
  PERFORM net.http_post(
    url := ingress_url,
    body := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$;

-- ── 6. BIND GUARDIAN TELEMETRY TRIGGER ─────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_physiomni_telemetry_guardian
  AFTER INSERT ON public.physiomni_telemetry
  FOR EACH ROW
  WHEN (NEW.anomaly_score > 0.8)
  EXECUTE FUNCTION public.trigger_guardian_eval();
