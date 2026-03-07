"""
Universal Intent Registry (Workflow Plane).

Dynamic routing dictionary that maps intentId strings to Temporal Activity
callables. Uses a decorator pattern for zero-boilerplate registration.

Design:
- Fail-closed: unrecognized intentIds return an OmniModalPayload with
  status='offline' and a descriptive error. No exceptions propagate.
- Deterministic: the registry is a plain dict — O(1) lookup, no branching.
- Singleton: `registry` is the module-level instance used by all workflows.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ============================================================================
# OmniModal Payload (matches frontend ModuleRenderer JSON contract)
# ============================================================================


@dataclass(frozen=True, slots=True)
class OmniModalPayload:
    """Canonical response payload consumed by the frontend ModuleRenderer.

    Fields:
      intentId   — the intent that was resolved (or attempted).
      status     — 'ok' | 'error' | 'offline'.
      data       — arbitrary result data on success.
      error      — human-readable error string on failure.
      traceId    — propagated trace identifier for observability.
    """

    intentId: str
    status: str
    data: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    traceId: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "intentId": self.intentId,
            "status": self.status,
            "data": self.data,
            "error": self.error,
            "traceId": self.traceId,
        }


# ============================================================================
# Intent Registry
# ============================================================================


class IntentRegistry:
    """Dynamic routing dictionary: intentId → Temporal Activity name + callable.

    Usage::

        from core.intent_registry import registry

        @registry.register_intent("crm.sync_contacts")
        async def sync_contacts(payload: dict) -> dict:
            ...

        # At workflow execution time:
        activity_name = registry.resolve("crm.sync_contacts")
    """

    def __init__(self) -> None:
        self._intents: dict[str, str] = {}
        self._callables: dict[str, Callable[..., Any]] = {}

    # ── Registration decorator ────────────────────────────────────────

    def register_intent(self, intent_name: str) -> Callable[..., Any]:
        """Decorator that registers a Temporal Activity under `intent_name`.

        The decorated function's ``__name__`` is used as the Temporal
        activity name for ``execute_activity``.

        Raises ``ValueError`` at import time if the same intentId is
        registered twice (fail-fast, prevents silent overwrites).
        """

        def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
            if intent_name in self._intents:
                raise ValueError(
                    f"IntentRegistry: duplicate registration for '{intent_name}' — "
                    f"already mapped to activity '{self._intents[intent_name]}'. "
                    "Each intentId must map to exactly one activity."
                )
            self._intents[intent_name] = fn.__name__
            self._callables[intent_name] = fn
            logger.info(
                "IntentRegistry: registered '%s' → activity '%s'",
                intent_name,
                fn.__name__,
            )
            return fn

        return decorator

    # ── Resolution ────────────────────────────────────────────────────

    def resolve(self, intent_id: str) -> str | None:
        """Return the Temporal activity name for `intent_id`, or None."""
        return self._intents.get(intent_id)

    def resolve_or_offline(self, intent_id: str, trace_id: str | None = None) -> str | OmniModalPayload:
        """Resolve the activity name, or return a fail-closed OmniModalPayload.

        This is the primary entry point for workflows: it guarantees a
        deterministic return value with no exceptions.
        """
        activity_name = self._intents.get(intent_id)
        if activity_name is not None:
            return activity_name

        logger.warning(
            "IntentRegistry: FAIL_CLOSED — unrecognized intentId '%s' (trace=%s)",
            intent_id,
            trace_id,
        )
        return OmniModalPayload(
            intentId=intent_id,
            status="offline",
            error=f"Intent '{intent_id}' is not registered in the Universal Intent Registry. "
            "The orchestrator cannot route this request.",
            traceId=trace_id,
        )

    # ── Introspection ─────────────────────────────────────────────────

    def list_intents(self) -> list[str]:
        """Return all registered intent names (sorted for determinism)."""
        return sorted(self._intents.keys())

    def __contains__(self, intent_id: str) -> bool:
        return intent_id in self._intents

    def __len__(self) -> int:
        return len(self._intents)


# ── Module-level singleton ────────────────────────────────────────────

registry = IntentRegistry()
