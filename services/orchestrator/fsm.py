"""
APEX OmniBoard Finite State Machine.
Protocol: Deterministic, Pure Functions, No Side Effects.

Implements strict state transitions with dependency injection for:
- session_id (from Router)
- trace_id (from Router)
- now (datetime from Router)

This ensures compliance with the Iron Law of Determinism.
"""

from datetime import datetime
from typing import Any


class FSM:
    """
    APEX OmniBoard Finite State Machine.
    Protocol: Deterministic, Pure Functions, No Side Effects.
    """

    def start_session(self, tenant_id: str, trace_id: str, session_id: str) -> dict[str, Any]:
        """
        Initializes a new user session.

        dependency_injection: session_id must be provided by Router.

        Args:
            tenant_id: Unique identifier for the tenant
            trace_id: Request tracing identifier
            session_id: Session identifier (injected)

        Returns:
            New session state dictionary

        Raises:
            ValueError: If tenant_id or session_id is missing
        """
        if not tenant_id or not session_id:
            raise ValueError("CRITICAL: Missing tenant_id or session_id.")

        return {
            "session_id": session_id,
            "tenant_id": tenant_id,
            "trace_id": trace_id,
            "state": "INIT",
            "context": {},
            "history": [],
        }

    def transition(
        self,
        current_state: dict[str, Any],
        event: str,
        payload: dict[str, Any],
        now: datetime,
    ) -> dict[str, Any]:
        """
        Transitions state based on event.

        dependency_injection: now (datetime) must be provided by Router.

        Args:
            current_state: Current state dictionary
            event: Event triggering the transition
            payload: Event payload data
            now: Current timestamp (injected)

        Returns:
            New state dictionary

        Raises:
            ValueError: If transition is illegal
        """
        state_key = current_state.get("state")
        new_context = current_state.get("context", {}).copy()

        # LOGIC MATRIX
        match (state_key, event):
            case ("INIT", "ONBOARD_START"):
                next_state = "PROFILE_SETUP"
            case ("PROFILE_SETUP", "SAVE_PROFILE"):
                next_state = "INTEGRATION_SELECT"
                new_context.update(payload)
            case ("INTEGRATION_SELECT", "CONNECT_APPS"):
                next_state = "DASHBOARD_READY"
                new_context.update(payload)
            case _:
                # Strict Failure Mode
                raise ValueError(f"ILLEGAL TRANSITION: {state_key} -> {event}")

        # STATE MUTATION
        return {
            **current_state,
            "state": next_state,
            "context": new_context,
            "last_updated": now.isoformat(),
        }
