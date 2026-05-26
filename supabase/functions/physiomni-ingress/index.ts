/**
 * PhysiOmni Ingress — OmniPort Edge Function
 *
 * Receives raw telemetry from Nordic nRF9161-DK + ADXL345 sensors
 * via mTLS HTTPS and persists to Supabase.
 *
 * Flow:
 *   1. Parse + validate JSON payload
 *   2. Upsert telemetry (idempotent via device_serial + timestamp)
 *   3. Evaluate threshold rules
 *   4. Escalate critical alerts → physiomni_alerts (triggers MAN_MODE webhook)
 *
 * Author: APEX-OmniHub PhysiOmni
 * Date: 2026-05-26
 */

import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabaseClient.ts';

// ── Threshold Constants ─────────────────────────────────────────────────────
const VIBRATION_CRITICAL_THRESHOLD = 15.0;
const VIBRATION_WARNING_THRESHOLD = 10.0;

// ── Payload Schema ──────────────────────────────────────────────────────────

interface PhysiOmniPayload {
  device_serial: string;
  tenant_id: string;
  vibration_x: number;
  vibration_y: number;
  vibration_z: number;
  temperature_c: number;
  timestamp: string;
}

type ValidationResult = {
  valid: true;
  data: PhysiOmniPayload;
} | {
  valid: false;
  error: string;
  field: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isValidISO8601(value: string): boolean {
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

function validatePayload(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Payload must be a JSON object', field: 'body' };
  }

  const payload = body as Record<string, unknown>;

  // device_serial: non-empty string, max 128 chars, alphanumeric + dashes
  if (!isNonEmptyString(payload.device_serial)) {
    return { valid: false, error: 'device_serial must be a non-empty string', field: 'device_serial' };
  }
  if (payload.device_serial.length > 128) {
    return { valid: false, error: 'device_serial exceeds 128 character limit', field: 'device_serial' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(payload.device_serial)) {
    return { valid: false, error: 'device_serial contains invalid characters', field: 'device_serial' };
  }

  // tenant_id: valid UUID
  if (!isNonEmptyString(payload.tenant_id)) {
    return { valid: false, error: 'tenant_id must be a non-empty string', field: 'tenant_id' };
  }
  if (!isValidUUID(payload.tenant_id)) {
    return { valid: false, error: 'tenant_id must be a valid UUID', field: 'tenant_id' };
  }

  // vibration axes: finite numbers
  if (!isFiniteNumber(payload.vibration_x)) {
    return { valid: false, error: 'vibration_x must be a finite number', field: 'vibration_x' };
  }
  if (!isFiniteNumber(payload.vibration_y)) {
    return { valid: false, error: 'vibration_y must be a finite number', field: 'vibration_y' };
  }
  if (!isFiniteNumber(payload.vibration_z)) {
    return { valid: false, error: 'vibration_z must be a finite number', field: 'vibration_z' };
  }

  // temperature_c: finite number, sanity bounds
  if (!isFiniteNumber(payload.temperature_c)) {
    return { valid: false, error: 'temperature_c must be a finite number', field: 'temperature_c' };
  }
  if (payload.temperature_c < -273.15 || payload.temperature_c > 1000) {
    return { valid: false, error: 'temperature_c out of sane range (-273.15 to 1000)', field: 'temperature_c' };
  }

  // timestamp: valid ISO 8601
  if (!isNonEmptyString(payload.timestamp)) {
    return { valid: false, error: 'timestamp must be a non-empty ISO 8601 string', field: 'timestamp' };
  }
  if (!isValidISO8601(payload.timestamp)) {
    return { valid: false, error: 'timestamp must be valid ISO 8601', field: 'timestamp' };
  }

  return {
    valid: true,
    data: {
      device_serial: payload.device_serial,
      tenant_id: payload.tenant_id,
      vibration_x: payload.vibration_x,
      vibration_y: payload.vibration_y,
      vibration_z: payload.vibration_z,
      temperature_c: payload.temperature_c,
      timestamp: payload.timestamp,
    },
  };
}

// ── Response Helpers ────────────────────────────────────────────────────────

function jsonResponse(
  data: unknown,
  status: number,
  headers: HeadersInit,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

// ── Alert Evaluation ────────────────────────────────────────────────────────

interface AlertEvaluation {
  shouldAlert: boolean;
  severity: 'info' | 'warning' | 'critical';
  alertType: string;
  message: string;
}

function evaluateThresholds(data: PhysiOmniPayload): AlertEvaluation {
  const absX = Math.abs(data.vibration_x);
  const absY = Math.abs(data.vibration_y);
  const absZ = Math.abs(data.vibration_z);
  const maxVibration = Math.max(absX, absY, absZ);

  // Critical: any axis exceeds 15.0g → MAN_MODE escalation
  if (absX > VIBRATION_CRITICAL_THRESHOLD) {
    return {
      shouldAlert: true,
      severity: 'critical',
      alertType: 'vibration_critical_x',
      message: `CRITICAL: vibration_x=${data.vibration_x.toFixed(2)}g exceeds ${VIBRATION_CRITICAL_THRESHOLD}g threshold on ${data.device_serial}. MAN Mode escalation triggered.`,
    };
  }

  // Warning: any axis exceeds 10.0g
  if (maxVibration > VIBRATION_WARNING_THRESHOLD) {
    const axis = absX > VIBRATION_WARNING_THRESHOLD ? 'x' : absY > VIBRATION_WARNING_THRESHOLD ? 'y' : 'z';
    return {
      shouldAlert: true,
      severity: 'warning',
      alertType: `vibration_warning_${axis}`,
      message: `WARNING: vibration_${axis}=${data[`vibration_${axis}` as keyof PhysiOmniPayload]}g exceeds ${VIBRATION_WARNING_THRESHOLD}g warning threshold on ${data.device_serial}.`,
    };
  }

  return {
    shouldAlert: false,
    severity: 'info',
    alertType: 'none',
    message: '',
  };
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  const requestOrigin = req.headers.get('origin')?.replace(/\/$/, '') ?? null;
  const corsHeaders = buildCorsHeaders(requestOrigin);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'method_not_allowed', message: 'Only POST is accepted' },
      405,
      corsHeaders,
    );
  }

  // Parse request body
  let body: unknown;
  try {
    const raw = await req.text();
    if (!raw) {
      return jsonResponse(
        { error: 'empty_body', message: 'Request body is empty' },
        400,
        corsHeaders,
      );
    }
    body = JSON.parse(raw);
  } catch {
    return jsonResponse(
      { error: 'invalid_json', message: 'Request body is not valid JSON' },
      400,
      corsHeaders,
    );
  }

  // Validate payload
  const validation = validatePayload(body);
  if (!validation.valid) {
    return jsonResponse(
      {
        error: 'validation_failed',
        message: validation.error,
        field: validation.field,
      },
      422,
      corsHeaders,
    );
  }

  const data = validation.data;
  const requestId = crypto.randomUUID();
  const supabase = createServiceClient();

  // ── 1. Insert telemetry (idempotent via UNIQUE on device_serial + captured_at)
  const { error: telemetryError } = await supabase
    .from('physiomni_telemetry')
    .insert({
      tenant_id: data.tenant_id,
      device_serial: data.device_serial,
      vibration_x: data.vibration_x,
      vibration_y: data.vibration_y,
      vibration_z: data.vibration_z,
      temperature_c: data.temperature_c,
      captured_at: data.timestamp,
    });

  // Handle duplicate (23505 = unique_violation)
  if (telemetryError) {
    const isDuplicate =
      telemetryError.code === '23505' ||
      (typeof telemetryError.message === 'string' &&
        telemetryError.message.includes('duplicate key'));

    if (isDuplicate) {
      return jsonResponse(
        {
          request_id: requestId,
          status: 'duplicate',
          message: 'Telemetry already recorded for this device and timestamp',
        },
        200,
        corsHeaders,
      );
    }

    console.error('[physiomni-ingress] telemetry insert failed:', telemetryError);
    return jsonResponse(
      {
        request_id: requestId,
        error: 'telemetry_write_failed',
        message: 'Failed to persist telemetry data',
      },
      500,
      corsHeaders,
    );
  }

  // ── 2. Update device last_seen_at
  await supabase
    .from('physiomni_devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('device_serial', data.device_serial)
    .eq('tenant_id', data.tenant_id);

  // ── 3. Evaluate thresholds and escalate alerts
  const evaluation = evaluateThresholds(data);
  let alertId: string | null = null;

  if (evaluation.shouldAlert) {
    const { data: alertData, error: alertError } = await supabase
      .from('physiomni_alerts')
      .insert({
        tenant_id: data.tenant_id,
        device_serial: data.device_serial,
        severity: evaluation.severity,
        alert_type: evaluation.alertType,
        message: evaluation.message,
        telemetry_snapshot: {
          vibration_x: data.vibration_x,
          vibration_y: data.vibration_y,
          vibration_z: data.vibration_z,
          temperature_c: data.temperature_c,
          captured_at: data.timestamp,
        },
      })
      .select('id')
      .single();

    if (alertError) {
      console.error('[physiomni-ingress] alert insert failed:', alertError);
      // Non-blocking: telemetry was saved, alert escalation is best-effort
    } else {
      alertId = alertData?.id ?? null;
      console.info(
        `[physiomni-ingress] Alert escalated: severity=${evaluation.severity} ` +
        `alert_id=${alertId} device=${data.device_serial} tenant=${data.tenant_id}`,
      );
    }
  }

  // ── 4. Success response
  return jsonResponse(
    {
      request_id: requestId,
      status: 'ingested',
      device_serial: data.device_serial,
      captured_at: data.timestamp,
      alert: evaluation.shouldAlert
        ? {
            alert_id: alertId,
            severity: evaluation.severity,
            alert_type: evaluation.alertType,
          }
        : null,
    },
    evaluation.severity === 'critical' ? 201 : 200,
    corsHeaders,
  );
});
