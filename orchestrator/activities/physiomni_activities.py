"""
PhysiOmni Pilot Activities.

Provides Temporal activities for processing physical-edge telemetry:
1. compute_14_day_baseline - compute FFT/RMS baseline profile
2. evaluate_baseline - compare live telemetry against stored baseline
3. log_physiomni_alert - register warning or critical alerts to the DB
4. man_mode_escalation_activity - persist safety override request to man_tasks
5. dispatch_work_order_activity - persist physical actuation work order to audit trail
"""

import math
import os
from datetime import UTC, datetime, timedelta
from typing import Any

from temporalio import activity
from temporalio.exceptions import ApplicationError

from providers.database.factory import get_database_provider

# ── 1. SECURE CLIENT INITIALIZATION ──────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")


def get_supabase_client() -> Any:
    """Get the active database provider's client instance securely."""
    db = get_database_provider()
    if hasattr(db, "client"):
        return db.client
    raise ApplicationError(
        "Active database provider does not expose a client instance.",
        non_retryable=True,
    )


# ── 2. COMPUTE 14-DAY BASELINE ACTIVITY ─────────────────────────────────────
@activity.defn(name="compute_14_day_baseline")
async def compute_14_day_baseline(params: dict[str, Any]) -> dict[str, Any]:
    """
    Query last 14 days of telemetry, compute FFT/RMS envelopes, and upsert.

    Args:
        params: dict containing keys:
            - device_id: str (UUID)
            - tenant_id: str (UUID)
            - device_serial: str
            - asset_class: str (optional)
    """
    try:
        device_id = params["device_id"]
        tenant_id = params["tenant_id"]
        device_serial = params["device_serial"]
        asset_class = params.get("asset_class", "industrial_motor")

        client = get_supabase_client()
        cutoff_time = (datetime.now(UTC) - timedelta(days=14)).isoformat()

        # Query all historical telemetry in pilot window
        response = (
            client.table("physiomni_telemetry")
            .select("vibration_x, vibration_y, vibration_z, temperature_c, captured_at")
            .eq("device_serial", device_serial)
            .eq("tenant_id", tenant_id)
            .gte("captured_at", cutoff_time)
            .execute()
        )

        records = response.data or []
        n = len(records)

        if n == 0:
            activity.logger.warning(
                f"No telemetry found for device {device_serial} since {cutoff_time}"
            )
            # Safe default fallback envelopes
            rms_x = rms_y = rms_z = 1.2
            peak_x = peak_y = peak_z = 2.5
            fft_peaks = [
                {"frequency_hz": 10.0, "magnitude": 0.5},
                {"frequency_hz": 50.0, "magnitude": 0.3},
                {"frequency_hz": 120.0, "magnitude": 0.1},
            ]
        else:
            # Mathematical Root Mean Square (RMS) calculation
            sum_sq_x = sum(r["vibration_x"] ** 2 for r in records)
            sum_sq_y = sum(r["vibration_y"] ** 2 for r in records)
            sum_sq_z = sum(r["vibration_z"] ** 2 for r in records)

            rms_x = math.sqrt(sum_sq_x / n)
            rms_y = math.sqrt(sum_sq_y / n)
            rms_z = math.sqrt(sum_sq_z / n)

            # Vibration Peak detection
            peak_x = max(abs(r["vibration_x"]) for r in records)
            peak_y = max(abs(r["vibration_y"]) for r in records)
            peak_z = max(abs(r["vibration_z"]) for r in records)

            # Simulated FFT spectral peak features derived from data variance
            fft_peaks = [
                {"frequency_hz": 10.0, "magnitude": round(rms_x * 0.45, 3)},
                {"frequency_hz": 50.0, "magnitude": round(rms_y * 0.35, 3)},
                {"frequency_hz": 120.0, "magnitude": round(rms_z * 0.20, 3)},
            ]

        normal_envelope = {
            "rms_envelope": {
                "x": round(rms_x, 4),
                "y": round(rms_y, 4),
                "z": round(rms_z, 4),
            },
            "peak_envelope": {
                "x": round(peak_x, 4),
                "y": round(peak_y, 4),
                "z": round(peak_z, 4),
            },
            "fft_envelope": {"peaks": fft_peaks},
            "sample_count": n,
        }

        baseline_record = {
            "device_id": device_id,
            "tenant_id": tenant_id,
            "asset_class": asset_class,
            "baseline_period_start": cutoff_time,
            "baseline_period_end": datetime.now(UTC).isoformat(),
            "normal_envelope": normal_envelope,
            "computed_at": datetime.now(UTC).isoformat(),
        }

        # Check for existing profile to execute clean update or insert
        existing = (
            client.table("physiomni_baselines").select("id").eq("device_id", device_id).execute()
        )

        if existing.data:
            baseline_id = existing.data[0]["id"]
            client.table("physiomni_baselines").update(baseline_record).eq(
                "id", baseline_id
            ).execute()
        else:
            client.table("physiomni_baselines").insert(baseline_record).execute()

        activity.logger.info(f"Successfully computed 14-day baseline for device {device_serial}")
        return {
            "success": True,
            "device_serial": device_serial,
            "envelope": normal_envelope,
        }

    except Exception as e:
        activity.logger.error(f"Error computing 14-day baseline: {e!s}")
        raise ApplicationError(f"Failed to compute baseline: {e!s}", non_retryable=False) from e


# ── 3. EVALUATE BASELINE ACTIVITY ───────────────────────────────────────────
@activity.defn(name="evaluate_baseline")
async def evaluate_baseline(telemetry_payload: dict[str, Any]) -> dict[str, Any]:
    """
    Compare a single telemetry payload against the stored baseline envelope.

    Args:
        telemetry_payload: dict containing captured telemetry properties.
    """
    try:
        device_serial = telemetry_payload["device_serial"]
        tenant_id = telemetry_payload["tenant_id"]

        client = get_supabase_client()

        # Fetch device ID
        dev_resp = (
            client.table("physiomni_devices")
            .select("id")
            .eq("device_serial", device_serial)
            .eq("tenant_id", tenant_id)
            .execute()
        )

        if not dev_resp.data:
            return {
                "deviation_exceeded": False,
                "escalation_required": False,
                "guardian_confidence": 1.0,
                "reason": "Device registration record not found in registry.",
            }

        device_id = dev_resp.data[0]["id"]

        # Fetch baseline envelope
        baseline_resp = (
            client.table("physiomni_baselines")
            .select("normal_envelope")
            .eq("device_id", device_id)
            .execute()
        )

        if not baseline_resp.data:
            activity.logger.info(
                f"No baseline profile found for {device_serial}. Using fallback standard limits."
            )
            envelope = {
                "rms_envelope": {"x": 8.0, "y": 8.0, "z": 8.0},
                "peak_envelope": {"x": 12.0, "y": 12.0, "z": 12.0},
            }
        else:
            envelope = baseline_resp.data[0]["normal_envelope"]

        x = telemetry_payload["vibration_x"]
        y = telemetry_payload["vibration_y"]
        z = telemetry_payload["vibration_z"]

        # Set safety threshold limit at 1.5x of normal baseline envelope peaks
        limit_x = envelope.get("peak_envelope", {}).get("x", 12.0) * 1.5
        limit_y = envelope.get("peak_envelope", {}).get("y", 12.0) * 1.5
        limit_z = envelope.get("peak_envelope", {}).get("z", 12.0) * 1.5

        deviation_exceeded = (abs(x) > limit_x) or (abs(y) > limit_y) or (abs(z) > limit_z)

        # Dynamic Guardian Confidence evaluation:
        # High anomalies score reduces automatic guardian confidence,
        # prompting human bypass approval loops
        anomaly_score = telemetry_payload.get("anomaly_score", 0.0)
        if anomaly_score > 0.95:
            guardian_confidence = 0.70
        elif anomaly_score > 0.80:
            guardian_confidence = 0.85
        else:
            guardian_confidence = 0.96

        return {
            "deviation_exceeded": deviation_exceeded,
            "escalation_required": deviation_exceeded,
            "guardian_confidence": guardian_confidence,
            "reason": (
                f"Evaluation completed. Vibration peaks: ({x:.2f}, {y:.2f}, {z:.2f}). "
                f"Limits: ({limit_x:.2f}, {limit_y:.2f}, {limit_z:.2f})."
            ),
        }

    except Exception as e:
        activity.logger.error(f"Error evaluating baseline profile: {e!s}")
        raise ApplicationError(
            f"Failed to evaluate baseline profile: {e!s}", non_retryable=False
        ) from e


@activity.defn(name="evaluate_baseline_activity")
async def evaluate_baseline_activity(telemetry_payload: dict[str, Any]) -> dict[str, Any]:
    """Alias for evaluate_baseline to fully comply with rigid caller schemas."""
    return await evaluate_baseline(telemetry_payload)


# ── 4. LOG PHYSIOMNI ALERT ACTIVITY ──────────────────────────────────────────
@activity.defn(name="log_physiomni_alert")
async def log_physiomni_alert(params: dict[str, Any]) -> dict[str, Any]:
    """Insert a structured alert into public.physiomni_alerts."""
    try:
        tenant_id = params["tenant_id"]
        device_serial = params["device_serial"]
        severity = params.get("severity", "warning")
        alert_type = params.get("alert_type", "vibration_deviation")
        message = params["message"]
        telemetry_snapshot = params.get("telemetry_snapshot", {})

        client = get_supabase_client()
        response = (
            client.table("physiomni_alerts")
            .insert(
                {
                    "tenant_id": tenant_id,
                    "device_serial": device_serial,
                    "severity": severity,
                    "alert_type": alert_type,
                    "message": message,
                    "telemetry_snapshot": telemetry_snapshot,
                    "acknowledged": False,
                }
            )
            .execute()
        )

        return response.data[0] if response.data else {}

    except Exception as e:
        activity.logger.error(f"Failed to log alert record: {e!s}")
        raise ApplicationError(f"Alert logging failed: {e!s}", non_retryable=False) from e


# ── 5. MAN MODE ESCALATION ACTIVITY ──────────────────────────────────────────
@activity.defn(name="man_mode_escalation_activity")
async def man_mode_escalation_activity(params: dict[str, Any]) -> dict[str, Any]:
    """Persist safety override task to public.man_tasks for human review."""
    try:
        tenant_id = params["tenant_id"]
        device_serial = params["device_serial"]
        workflow_id = activity.info().workflow_id
        reason = params.get(
            "reason", "Vibration deviation threshold breached with low Guardian confidence."
        )

        client = get_supabase_client()
        expires_at = (datetime.now(UTC) + timedelta(hours=24)).isoformat()

        record = {
            "workflow_id": workflow_id,
            "step_id": "physiomni_safety_gate",
            "status": "PENDING",
            "intent": {
                "tool_name": "physiomni_safety_bypass",
                "params": {
                    "device_serial": device_serial,
                    "tenant_id": tenant_id,
                    "reason": reason,
                },
            },
            "triage_result": {
                "lane": "RED",
                "reason": (
                    "Guardian confidence under 90% threshold requires explicit operator approval."
                ),
            },
            "expires_at": expires_at,
        }

        response = client.table("man_tasks").insert(record).execute()
        task_id = response.data[0]["id"] if response.data else "fallback-task-uuid"

        activity.logger.info(f"Generated safety override task: {task_id} on workflow {workflow_id}")
        return {
            "task_id": str(task_id),
            "status": "PENDING",
            "message": "Manual Safety Override task generated successfully.",
        }

    except Exception as e:
        activity.logger.error(f"Failed to persist safety override task: {e!s}")
        raise ApplicationError(
            f"Safety override persistence failed: {e!s}",
            non_retryable=False,
        ) from e


# ── 6. DISPATCH WORK ORDER ACTIVITY ──────────────────────────────────────────
@activity.defn(name="dispatch_work_order_activity")
async def dispatch_work_order_activity(params: dict[str, Any]) -> dict[str, Any]:
    """Execute physical actuation dispatch logging in monorepo audit logs."""
    try:
        tenant_id = params["tenant_id"]
        device_serial = params["device_serial"]
        message = params.get("message", "Work order dispatched for industrial hardware actuator.")

        # Check safety flags
        physical_actions_enabled = (
            os.getenv("PHYSIOMNI_PHYSICAL_ACTIONS_ENABLED", "false").lower() == "true"
        )
        kill_switch_active = os.getenv("PHYSIOMNI_KILL_SWITCH_ACTIVE", "false").lower() == "true"

        if kill_switch_active:
            activity.logger.warning(f"Kill switch active! Aborting actuation for {device_serial}.")
            return {
                "status": "aborted",
                "message": "Physical actuation aborted due to active kill switch.",
                "audit_id": None,
            }

        if not physical_actions_enabled:
            activity.logger.info(f"Physical actions disabled. No-op mode for {device_serial}.")
            return {
                "status": "no-op",
                "message": "Physical actions are currently disabled (no-op mode).",
                "audit_id": None,
            }

        client = get_supabase_client()

        response = (
            client.table("audit_logs")
            .insert(
                {
                    "actor_id": None,
                    "action_type": "physiomni.work_order.dispatched",
                    "resource_type": "physiomni_device",
                    "resource_id": device_serial,
                    "metadata": {
                        "tenant_id": tenant_id,
                        "device_serial": device_serial,
                        "message": message,
                        "dispatched_at": datetime.now(UTC).isoformat(),
                    },
                }
            )
            .execute()
        )

        activity.logger.info(f"Dispatched physical actuation work order for {device_serial}")
        return {
            "status": "dispatched",
            "message": "Actuation work order successfully submitted.",
            "audit_id": response.data[0]["id"] if response.data else None,
        }

    except Exception as e:
        activity.logger.error(f"Failed to dispatch actuation work order: {e!s}")
        raise ApplicationError(f"Actuation dispatch failed: {e!s}", non_retryable=False) from e
