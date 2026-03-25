"""
Universal Saga Workflow — Intent-Driven Temporal Orchestration.

A single Temporal Workflow that dynamically resolves activities via the
Universal Intent Registry. No rigid if/else routing blocks — the registry
is the routing table, and the workflow is a pure execution engine.

Architecture:
    EventEnvelope dict → extract intentId from payload →
    → resolve_intent activity (replay-safe registry lookup) →
    → execute_activity(resolved_name) → wrap result in OmniModalSchema → return

Wire format (input dict): must satisfy models.events.EventEnvelope Pydantic model.
The TypeScript event-ingress-adapter is responsible for constructing this shape
at the edge, and server.py passes it through as a raw dict.

Determinism:
    - No direct I/O, no random, no system time calls.
    - All side effects are delegated to Temporal Activities.
    - Registry resolution is delegated to the resolve_intent Activity,
      whose result is recorded in workflow history and replayed deterministically.
    - No standard-library loggers — only workflow.logger (replay-safe).
"""

from datetime import timedelta
from typing import Any

from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ActivityError

with workflow.unsafe.imports_passed_through():
    from models.events import EventEnvelope


# ============================================================================
# OmniModal Schema (Temporal workflow return contract)
# ============================================================================


def build_omni_modal_schema(
    intent_id: str,
    trace_id: str,
    status: str,
    data: dict[str, Any] | None = None,
    error: str | None = None,
) -> dict[str, Any]:
    """Build the canonical JSON structure expected by the frontend ModuleRenderer.

    This is the single exit-point schema for ALL workflow results.
    """
    return {
        "intentId": intent_id,
        "traceId": trace_id,
        "status": status,
        "data": data or {},
        "error": error,
        "schemaVersion": "1.0.0",
    }


# ============================================================================
# Workflow Definition
# ============================================================================

ACTIVITY_RETRY_POLICY = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(seconds=30),
    maximum_attempts=3,
)

# Lightweight activity — pure dict lookup, no I/O.
RESOLVE_INTENT_RETRY_POLICY = RetryPolicy(
    initial_interval=timedelta(milliseconds=200),
    backoff_coefficient=1.5,
    maximum_interval=timedelta(seconds=2),
    maximum_attempts=2,
)

RESOLVE_INTENT_TIMEOUT = timedelta(seconds=5)

ACTIVITY_TIMEOUT = timedelta(seconds=120)


@workflow.defn(name="UniversalOrchestratorWorkflow")
class UniversalOrchestratorWorkflow:
    """Single Temporal Workflow that routes any EventEnvelope to the correct
    Activity via the Universal Intent Registry.

    Intent resolution is performed inside the ``resolve_intent`` Activity so
    that:
      - The result is recorded in workflow history (deterministic on replay).
      - Standard-library logging inside the registry fires only on first
        execution, not on every replay.
      - Hot-deployed intents never cause NonDeterministicWorkflowError.

    Input:  EventEnvelope (Pydantic model serialized as dict by Temporal).
    Output: OmniModalSchema-compliant dict for the frontend ModuleRenderer.
    """

    @workflow.run
    async def run(self, envelope_dict: dict[str, Any]) -> dict[str, Any]:
        # ── Deserialize the envelope (Temporal passes dicts across the wire) ──
        try:
            envelope = EventEnvelope.model_validate(envelope_dict)
        except Exception as exc:
            workflow.logger.error("UniversalSaga: EventEnvelope validation failed: %s", exc)
            return build_omni_modal_schema(
                intent_id="unknown",
                trace_id=envelope_dict.get("correlation_id", "unknown"),
                status="error",
                error=f"EventEnvelope validation failed: {exc}",
            )

        # ── Extract intent_id and trace_id from the validated envelope ────
        # Primary: payload.intentId (set by event-ingress-adapter)
        # Fallback: event_type enum value (e.g. "orchestrator:agent.goal_received")
        intent_id = envelope.payload.get("intentId", envelope.event_type.value)
        trace_id = envelope.correlation_id

        workflow.logger.info(
            "UniversalSaga: processing intent_id='%s' trace='%s'",
            intent_id,
            trace_id,
        )

        # ── Intent resolution via Activity (replay-safe) ─────────────
        # Delegates to resolve_intent activity so the lookup result is
        # recorded in workflow history. On replay, Temporal returns the
        # recorded dict without re-executing — immune to registry mutations.
        try:
            resolution = await workflow.execute_activity(
                "resolve_intent",
                args=[intent_id, trace_id],
                start_to_close_timeout=RESOLVE_INTENT_TIMEOUT,
                retry_policy=RESOLVE_INTENT_RETRY_POLICY,
            )
        except ActivityError as exc:
            workflow.logger.error(
                "UniversalSaga: resolve_intent activity failed: %s", exc
            )
            return build_omni_modal_schema(
                intent_id=intent_id,
                trace_id=trace_id,
                status="error",
                error=f"Intent resolution failed: {exc}",
            )

        if not resolution.get("resolved"):
            offline_payload = resolution.get("offline_payload", {})
            workflow.logger.warning(
                "UniversalSaga: OFFLINE — intent_id '%s' not in registry",
                intent_id,
            )
            return build_omni_modal_schema(
                intent_id=intent_id,
                trace_id=trace_id,
                status="offline",
                error=offline_payload.get("error", f"Intent '{intent_id}' not registered"),
            )

        activity_name: str = resolution["activity_name"]

        # ── Execute the resolved activity ─────────────────────────────
        try:
            result = await workflow.execute_activity(
                activity_name,
                envelope.payload,
                start_to_close_timeout=ACTIVITY_TIMEOUT,
                retry_policy=ACTIVITY_RETRY_POLICY,
            )
        except ActivityError as exc:
            workflow.logger.error(
                "UniversalSaga: activity '%s' failed for intent '%s': %s",
                activity_name,
                intent_id,
                exc,
            )
            return build_omni_modal_schema(
                intent_id=intent_id,
                trace_id=trace_id,
                status="error",
                error=f"Activity '{activity_name}' failed: {exc}",
            )

        # ── Wrap result in OmniModalSchema ────────────────────────────
        result_data = result if isinstance(result, dict) else {"result": result}

        return build_omni_modal_schema(
            intent_id=intent_id,
            trace_id=trace_id,
            status="ok",
            data=result_data,
        )
