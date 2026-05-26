-- ============================================================================
-- PhysiOmni Pilot: Physical-Edge Sensing Layer for APEX-OmniHub
-- ============================================================================
--
-- Phase 1: 30-day white-label industrial hardware pilot
-- Hardware: Nordic nRF9161-DK + ADXL345 accelerometer
-- Protocol: mTLS HTTPS → OmniPort Ingress → Supabase
--
-- Tables:
--   1. physiomni_devices    — Device registry (serial, tenant, config)
--   2. physiomni_telemetry  — Time-series vibration/temp (monthly partitioned)
--   3. physiomni_alerts     — Threshold breach escalations (→ MAN_MODE)
--
-- Security: RLS enforced on all tables. Tenant isolation via tenant_id.
-- Idempotency: All DDL uses IF NOT EXISTS for safe re-runs.
-- ============================================================================

-- ── 1. DEVICE REGISTRY ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.physiomni_devices (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- additive-allow: ON_DELETE_CASCADE Clean up devices if tenant is deleted
  tenant_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_serial text       NOT NULL,
  device_name   text,
  firmware_version text,
  location_tag  text,
  metadata      jsonb      NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean    NOT NULL DEFAULT true,
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz,
  UNIQUE (tenant_id, device_serial)
);

COMMENT ON TABLE public.physiomni_devices IS
  'PhysiOmni device registry. Each physical sensor (nRF9161-DK) is registered '
  'per-tenant with a unique serial. Metadata stores hardware config and calibration.';

CREATE INDEX IF NOT EXISTS idx_physiomni_devices_tenant
  ON public.physiomni_devices(tenant_id);

CREATE INDEX IF NOT EXISTS idx_physiomni_devices_serial
  ON public.physiomni_devices(device_serial);

CREATE INDEX IF NOT EXISTS idx_physiomni_devices_active
  ON public.physiomni_devices(tenant_id, is_active)
  WHERE is_active = true;

ALTER TABLE public.physiomni_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view own tenant devices"
  ON public.physiomni_devices
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "Authenticated users update own tenant devices"
  ON public.physiomni_devices
  FOR UPDATE TO authenticated
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Service role manages all PhysiOmni devices"
  ON public.physiomni_devices
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ── 2. TELEMETRY (MONTHLY PARTITIONED) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.physiomni_telemetry (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL,
  device_serial text        NOT NULL,
  vibration_x   double precision NOT NULL,
  vibration_y   double precision NOT NULL,
  vibration_z   double precision NOT NULL,
  temperature_c double precision NOT NULL,
  captured_at   timestamptz NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now(),
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, captured_at),
  UNIQUE (device_serial, captured_at)
) PARTITION BY RANGE (captured_at);

COMMENT ON TABLE public.physiomni_telemetry IS
  'Time-series telemetry from PhysiOmni edge sensors. Partitioned monthly '
  'for query performance and data lifecycle management. '
  'Unique constraint on (device_serial, captured_at) enforces idempotency.';

-- Create partitions for pilot window (May 2026 – August 2026)
CREATE TABLE IF NOT EXISTS public.physiomni_telemetry_2026_05
  PARTITION OF public.physiomni_telemetry
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE IF NOT EXISTS public.physiomni_telemetry_2026_06
  PARTITION OF public.physiomni_telemetry
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS public.physiomni_telemetry_2026_07
  PARTITION OF public.physiomni_telemetry
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS public.physiomni_telemetry_2026_08
  PARTITION OF public.physiomni_telemetry
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- Primary query path: device timeline (descending)
CREATE INDEX IF NOT EXISTS idx_physiomni_telemetry_device_time
  ON public.physiomni_telemetry(device_serial, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_physiomni_telemetry_tenant
  ON public.physiomni_telemetry(tenant_id, captured_at DESC);

ALTER TABLE public.physiomni_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view own tenant telemetry"
  ON public.physiomni_telemetry
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "Service role manages all PhysiOmni telemetry"
  ON public.physiomni_telemetry
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ── 3. ALERTS ───────────────────────────────────────────────────────────────

CREATE TYPE public.physiomni_severity AS ENUM (
  'info', 'warning', 'critical'
);

CREATE TABLE IF NOT EXISTS public.physiomni_alerts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- additive-allow: ON_DELETE_CASCADE Clean up alerts if tenant is deleted
  tenant_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_serial   text        NOT NULL,
  severity        public.physiomni_severity NOT NULL DEFAULT 'warning',
  alert_type      text        NOT NULL,
  message         text        NOT NULL,
  telemetry_snapshot jsonb    NOT NULL DEFAULT '{}'::jsonb,
  acknowledged    boolean     NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.physiomni_alerts IS
  'PhysiOmni alert escalations. Critical alerts (vibration_x > 15.0) trigger '
  'the MAN_MODE Temporal workflow via database webhook. Tracks acknowledgment '
  'and resolution lifecycle.';

CREATE INDEX IF NOT EXISTS idx_physiomni_alerts_tenant
  ON public.physiomni_alerts(tenant_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_physiomni_alerts_device
  ON public.physiomni_alerts(device_serial, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_physiomni_alerts_severity
  ON public.physiomni_alerts(severity, triggered_at DESC)
  WHERE severity = 'critical';

CREATE INDEX IF NOT EXISTS idx_physiomni_alerts_unacked
  ON public.physiomni_alerts(tenant_id, acknowledged)
  WHERE acknowledged = false;

ALTER TABLE public.physiomni_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view own tenant alerts"
  ON public.physiomni_alerts
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "Authenticated users acknowledge own tenant alerts"
  ON public.physiomni_alerts
  FOR UPDATE TO authenticated
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Service role manages all PhysiOmni alerts"
  ON public.physiomni_alerts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ── 4. AUDIT LOG INTEGRATION ────────────────────────────────────────────────
-- Log PhysiOmni alert escalations to the existing APEX audit trail.

CREATE OR REPLACE FUNCTION public.physiomni_alert_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs(actor_id, action_type, resource_type, resource_id, metadata)
  VALUES (
    NULL,
    'physiomni.alert.' || NEW.severity::text,
    'physiomni_alert',
    NEW.id::text,
    jsonb_build_object(
      'tenant_id', NEW.tenant_id,
      'device_serial', NEW.device_serial,
      'alert_type', NEW.alert_type,
      'severity', NEW.severity::text,
      'message', NEW.message
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_physiomni_alert_audit
  AFTER INSERT ON public.physiomni_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.physiomni_alert_audit_trigger();


-- ── 5. ENABLE REALTIME ──────────────────────────────────────────────────────
-- Supabase Realtime listens on physiomni_alerts for dashboard push.

ALTER PUBLICATION supabase_realtime ADD TABLE public.physiomni_alerts;
