"""
Universal Saga Workflow — Intent-Driven Temporal Orchestration.

A single Temporal Workflow that dynamically resolves activities via the
Universal Intent Registry. No rigid if/else routing blocks — the registry
is the routing table, and the workflow is a pure execution engine.

Architecture:
    IntentEnvelope dict → extract intentId → registry.resolve_or_offline() →
    → execute_activity(resolved_name) → wrap result in OmniModalSchema → return

Wire format (input dict):
    {
        "intent_id": "search_database",
        "trace_id": "uuid",
        "tenant_id": "tenant-xyz",
        "user_id": "user-abc",
        "payload": { ... activity-specific params ... }
    }

Determinism:
    - No direct I/O, no random, no system time calls.
    - All side effects are delegated to Temporal Activities.
    - Registry resolution is a pure dict lookup (deterministic on replay).
"""

from datetime import timedelta
from typing import Any

from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ActivityError

with workflow.unsafe.imports_passed_through():
    from core.intent_registry import OmniModalPayload, registry


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

ACTIVITY_TIMEOUT = timedelta(seconds=120)


@workflow.defn(name="UniversalOrchestratorWorkflow")
class UniversalOrchestratorWorkflow:
    """Single Temporal Workflow that routes any intent envelope to the correct
    Activity via the Universal Intent Registry.

    Input:  dict with keys: intent_id, trace_id, tenant_id, user_id, payload.
    Output: OmniModalSchema-compliant dict for the frontend ModuleRenderer.
    """

    @workflow.run
    async def run(self, envelope: dict[str, Any]) -> dict[str, Any]:
        intent_id = envelope.get("intent_id", "")
        trace_id = envelope.get("trace_id", "unknown")
        payload = envelope.get("payload", {})

        if not intent_id:
            workflow.logger.error(
                "UniversalSaga: missing intent_id in envelope (trace=%s)", trace_id
            )
            return build_omni_modal_schema(
                intent_id="unknown",
                trace_id=trace_id,
                status="error",
                error="Missing intent_id in workflow input envelope.",
            )

        workflow.logger.info(
            "UniversalSaga: processing intent_id='%s' trace='%s'",
            intent_id,
            trace_id,
        )

        # ── Registry resolution (pure dict lookup — deterministic) ────
        resolution = registry.resolve_or_offline(intent_id, trace_id)

        if isinstance(resolution, OmniModalPayload):
            workflow.logger.warning(
                "UniversalSaga: OFFLINE — intent_id '%s' not in registry",
                intent_id,
            )
            return build_omni_modal_schema(
                intent_id=intent_id,
                trace_id=trace_id,
                status="offline",
                error=resolution.error,
            )

        activity_name: str = resolution

        # ── Execute the resolved activity ─────────────────────────────
        try:
            result = await workflow.execute_activity(
                activity_name,
                payload,
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
