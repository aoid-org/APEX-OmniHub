"""
PhysiOmni Anomaly Saga Workflow.

Coordinates the Tri-Force physical-world actuation protocol:
1. Compares incoming telemetry with computed normal envelopes.
2. Evaluates Guardian confidence.
3. Escalates to MAN Mode approval if confidence is below 90%.
4. Submits work order on approval.
"""

from datetime import timedelta
from typing import Any

from temporalio import workflow
from temporalio.common import RetryPolicy

# Safe import patterns for Temporal workflows
with workflow.unsafe.imports_passed_through():
    from activities.physiomni_activities import (
        dispatch_work_order_activity,
        evaluate_baseline,
        log_physiomni_alert,
        man_mode_escalation_activity,
    )


# ── 1. RETRY POLICIES ────────────────────────────────────────────────────────
STANDARD_RETRY_POLICY = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(seconds=10),
    maximum_attempts=3,
)


# ── 2. WORKFLOW DEFINITION ───────────────────────────────────────────────────
@workflow.defn(name="PhysiOmniAnomalySaga")
class PhysiOmniAnomalySaga:
    """
    Saga workflow governing industrial pilot edge hardware alerts.
    """

    def __init__(self) -> None:
        self._approved = False
        self._rejected = False

    @workflow.signal
    def approve_saga(self) -> None:
        """Signal to approve safety bypass."""
        self._approved = True

    @workflow.signal
    def reject_saga(self) -> None:
        """Signal to reject safety bypass."""
        self._rejected = True

    @workflow.run
    async def run(self, telemetry_payload: dict[str, Any]) -> dict[str, Any]:
        workflow.logger.info(
            f"PhysiOmniSaga: Processing telemetry from {telemetry_payload.get('device_serial')}"
        )

        tenant_id = telemetry_payload["tenant_id"]
        device_serial = telemetry_payload["device_serial"]

        # Step 1: Execute evaluate_baseline
        evaluation = await workflow.execute_activity(
            evaluate_baseline,
            args=[telemetry_payload],
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=STANDARD_RETRY_POLICY,
        )

        deviation_exceeded = evaluation.get("deviation_exceeded", False)
        if not deviation_exceeded:
            workflow.logger.info(
                f"PhysiOmniSaga: Telemetry from {device_serial} is within normal envelope."
            )
            return {
                "status": "nominal",
                "message": (
                    "Telemetry is within the normal baseline envelope. No escalation required."
                ),
            }

        # Step 2: Deviation detected -> Log warning alert immediately
        workflow.logger.warning(
            f"PhysiOmniSaga: Deviation detected on {device_serial}! Beginning escalation logic."
        )
        await workflow.execute_activity(
            log_physiomni_alert,
            args=[
                {
                    "tenant_id": tenant_id,
                    "device_serial": device_serial,
                    "severity": "warning",
                    "alert_type": "vibration_threshold_exceeded",
                    "message": f"Vibration deviation detected on device {device_serial}.",
                    "telemetry_snapshot": telemetry_payload,
                }
            ],
            start_to_close_timeout=timedelta(seconds=15),
            retry_policy=STANDARD_RETRY_POLICY,
        )

        # Step 3: Evaluate Guardian confidence
        guardian_confidence = evaluation.get("guardian_confidence", 1.0)
        # Handle percent representation safely (e.g. 85.0 -> 0.85)
        if guardian_confidence > 1.0:
            guardian_confidence = guardian_confidence / 100.0

        workflow.logger.info(
            f"PhysiOmniSaga: Guardian confidence score is {guardian_confidence:.2%}"
        )

        if guardian_confidence < 0.90:
            # Step 3b: Branch to MAN Mode (Require operator override approval)
            workflow.logger.warning(
                f"PhysiOmniSaga: Guardian confidence {guardian_confidence:.2%} < 90%. "
                f"Bypassing direct actuation and requesting manual override."
            )

            escalation_result = await workflow.execute_activity(
                man_mode_escalation_activity,
                args=[
                    {
                        "tenant_id": tenant_id,
                        "device_serial": device_serial,
                        "reason": (
                            f"Vibration anomaly with low confidence ({guardian_confidence:.2%})"
                        ),
                    }
                ],
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=STANDARD_RETRY_POLICY,
            )

            task_id = escalation_result["task_id"]
            workflow.logger.info(f"PhysiOmniSaga: Safety override task created with ID {task_id}")

            # Polling wait loop using check_man_decision (existing orchestrator activity)
            is_approved = False
            while not is_approved:
                # Wait condition checks both standard Temporal signals and manual database decisions
                if self._approved:
                    is_approved = True
                    break
                if self._rejected:
                    is_approved = False
                    break

                decision = await workflow.execute_activity(
                    "check_man_decision",
                    args=[{"task_id": task_id}],
                    start_to_close_timeout=timedelta(seconds=10),
                    retry_policy=RetryPolicy(maximum_attempts=2),
                )

                if decision.get("decided"):
                    status = decision.get("status")
                    if status == "APPROVED":
                        is_approved = True
                        break
                    is_approved = False
                    break

                # Sleep deterministically using Temporal clock
                await workflow.sleep(timedelta(seconds=10))

            if not is_approved:
                workflow.logger.error("PhysiOmniSaga: Safety override request rejected or expired.")
                await workflow.execute_activity(
                    log_physiomni_alert,
                    args=[
                        {
                            "tenant_id": tenant_id,
                            "device_serial": device_serial,
                            "severity": "critical",
                            "alert_type": "safety_override_denied",
                            "message": (
                                f"Safety override request {task_id} was rejected or expired."
                            ),
                            "telemetry_snapshot": telemetry_payload,
                        }
                    ],
                    start_to_close_timeout=timedelta(seconds=15),
                    retry_policy=STANDARD_RETRY_POLICY,
                )
                return {
                    "status": "rejected",
                    "message": (
                        "Physical edge work order actuation aborted. Safety override denied."
                    ),
                }

        # Step 4: Approved or high confidence -> Execute work order
        workflow.logger.info("PhysiOmniSaga: Actuation authorized. Dispatching edge work order.")

        # Log critical alert indicating physical actuation is starting
        await workflow.execute_activity(
            log_physiomni_alert,
            args=[
                {
                    "tenant_id": tenant_id,
                    "device_serial": device_serial,
                    "severity": "critical",
                    "alert_type": "physical_actuation_started",
                    "message": (
                        f"Physical edge hardware work order actuation initiated on {device_serial}."
                    ),
                    "telemetry_snapshot": telemetry_payload,
                }
            ],
            start_to_close_timeout=timedelta(seconds=15),
            retry_policy=STANDARD_RETRY_POLICY,
        )

        dispatch_result = await workflow.execute_activity(
            dispatch_work_order_activity,
            args=[
                {
                    "tenant_id": tenant_id,
                    "device_serial": device_serial,
                    "message": (
                        f"Automated work order dispatched for vibration anomaly on {device_serial}."
                    ),
                }
            ],
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=STANDARD_RETRY_POLICY,
        )

        return {
            "status": "actuated",
            "message": "Physical edge work order successfully dispatched.",
            "details": dispatch_result,
        }
