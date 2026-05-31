-- Migration: physiomni_device_commands
-- Purpose: Persistent command queue for IoT device dispatch via PhysiOmni.
--          Devices poll this table (or receive via Supabase Realtime) to execute
--          commands such as EMERGENCY_STOP, CALIBRATE, RESTART, and MAN_MODE_TRIGGER.
-- Replaces: stub comment in supabase/functions/physiomni-action/index.ts

CREATE TABLE IF NOT EXISTS public.physiomni_device_commands (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       text        NOT NULL,
  -- additive-allow: ON_DELETE_CASCADE removing a tenant must purge all their queued IoT commands to prevent orphaned device state
  tenant_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command         text        NOT NULL CHECK (command IN ('MAN_MODE_TRIGGER', 'EMERGENCY_STOP', 'CALIBRATE', 'RESTART')),
  status          text        NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'DELIVERED', 'ACKNOWLEDGED', 'FAILED')),
  approved_by     text,
  bypass_policy   text,
  queued_at       timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.physiomni_device_commands IS
  'Persistent IoT command queue for PhysiOmni devices. Written by physiomni-action '
  'Edge Function and consumed by devices via Supabase Realtime or polling.';

CREATE INDEX IF NOT EXISTS idx_physiomni_device_commands_device
  ON public.physiomni_device_commands(device_id, status);

CREATE INDEX IF NOT EXISTS idx_physiomni_device_commands_tenant
  ON public.physiomni_device_commands(tenant_id);

ALTER TABLE public.physiomni_device_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to device commands"
  ON public.physiomni_device_commands
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Tenant reads own device commands"
  ON public.physiomni_device_commands
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());
