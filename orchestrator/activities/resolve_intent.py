"""
Resolve Intent Activity — Replay-Safe Intent Registry Lookup.

Wraps the IntentRegistry.resolve_or_offline() call inside a Temporal
Activity so that:

1. **Determinism**: Activity results are recorded in workflow history.
   On replay, Temporal returns the recorded result instead of re-executing.
   This prevents NonDeterministicWorkflowError when the registry mutates
   between the original run and a replay (e.g. hot-deployed intents).

2. **Replay-safe logging**: Standard Python loggers inside Activities
   are safe — they only fire on first execution, not on replay.

This activity is intentionally lightweight (pure dict lookup, no I/O)
to minimise latency overhead.
"""

from __future__ import annotations

import logging
from typing import Any

from temporalio import activity

from core.intent_registry import OmniModalPayload, registry

logger = logging.getLogger(__name__)


@activity.defn(name="resolve_intent")
async def resolve_intent(
    intent_id: str,
    trace_id: str | None = None,
) -> dict[str, Any]:
    """Resolve an intent ID to a Temporal activity name via the registry.

    Returns a dict with shape:
        {"resolved": True,  "activity_name": "..."}
        {"resolved": False, "offline_payload": {...}}

    The dict serialisation keeps the workflow free of OmniModalPayload
    imports and makes the contract explicit across the wire boundary.
    """
    resolution = registry.resolve_or_offline(intent_id, trace_id)

    if isinstance(resolution, OmniModalPayload):
        logger.warning(
            "resolve_intent: OFFLINE — intent_id '%s' not in registry (trace=%s)",
            intent_id,
            trace_id,
        )
        return {
            "resolved": False,
            "offline_payload": resolution.to_dict(),
        }

    logger.info(
        "resolve_intent: resolved '%s' → activity '%s'",
        intent_id,
        resolution,
    )
    return {
        "resolved": True,
        "activity_name": resolution,
    }
