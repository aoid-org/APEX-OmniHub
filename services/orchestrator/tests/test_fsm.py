"""
Tests for APEX OmniBoard Finite State Machine.
Validates deterministic behavior and dependency injection.
"""

import pytest
from datetime import UTC, datetime
from services.orchestrator.fsm import FSM


class TestFSMStartSession:
    """Test suite for start_session functionality."""

    def test_start_session_success(self):
        """Test successful session initialization."""
        fsm = FSM()
        tenant_id = "test-tenant-123"
        trace_id = "trace-456"
        session_id = "session-789"

        result = fsm.start_session(tenant_id=tenant_id, trace_id=trace_id, session_id=session_id)

        assert result["session_id"] == session_id
        assert result["tenant_id"] == tenant_id
        assert result["trace_id"] == trace_id
        assert result["state"] == "INIT"
        assert result["context"] == {}
        assert result["history"] == []

    def test_start_session_missing_tenant_id(self):
        """Test that missing tenant_id raises ValueError."""
        fsm = FSM()

        with pytest.raises(ValueError, match="Missing tenant_id or session_id"):
            fsm.start_session(tenant_id="", trace_id="trace", session_id="session")

    def test_start_session_missing_session_id(self):
        """Test that missing session_id raises ValueError."""
        fsm = FSM()

        with pytest.raises(ValueError, match="Missing tenant_id or session_id"):
            fsm.start_session(tenant_id="tenant", trace_id="trace", session_id="")


class TestFSMTransition:
    """Test suite for state transition functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.fsm = FSM()
        self.base_state = {
            "session_id": "test-session",
            "tenant_id": "test-tenant",
            "trace_id": "test-trace",
            "state": "INIT",
            "context": {},
            "history": [],
        }
        self.now = datetime(2026, 2, 10, 20, 0, 0, tzinfo=UTC)

    def test_transition_init_to_profile_setup(self):
        """Test INIT -> PROFILE_SETUP transition."""
        result = self.fsm.transition(
            current_state=self.base_state,
            event="ONBOARD_START",
            payload={},
            now=self.now,
        )

        assert result["state"] == "PROFILE_SETUP"
        assert result["session_id"] == "test-session"
        assert result["last_updated"] == "2026-02-10T20:00:00+00:00"

    def test_transition_profile_setup_to_integration_select(self):
        """Test PROFILE_SETUP -> INTEGRATION_SELECT with payload."""
        profile_state = {**self.base_state, "state": "PROFILE_SETUP"}
        payload = {"user_name": "John Doe", "company": "APEX"}

        result = self.fsm.transition(
            current_state=profile_state,
            event="SAVE_PROFILE",
            payload=payload,
            now=self.now,
        )

        assert result["state"] == "INTEGRATION_SELECT"
        assert result["context"]["user_name"] == "John Doe"
        assert result["context"]["company"] == "APEX"

    def test_transition_integration_select_to_dashboard_ready(self):
        """Test INTEGRATION_SELECT -> DASHBOARD_READY."""
        integration_state = {
            **self.base_state,
            "state": "INTEGRATION_SELECT",
            "context": {"user_name": "John"},
        }
        payload = {"apps": ["gmail", "slack"]}

        result = self.fsm.transition(
            current_state=integration_state,
            event="CONNECT_APPS",
            payload=payload,
            now=self.now,
        )

        assert result["state"] == "DASHBOARD_READY"
        assert result["context"]["apps"] == ["gmail", "slack"]
        assert result["context"]["user_name"] == "John"  # Preserved

    def test_transition_illegal_state(self):
        """Test that illegal state transition raises ValueError."""
        with pytest.raises(ValueError, match="ILLEGAL TRANSITION"):
            self.fsm.transition(
                current_state=self.base_state,
                event="INVALID_EVENT",
                payload={},
                now=self.now,
            )

    def test_transition_illegal_event_sequence(self):
        """Test that wrong event for state raises ValueError."""
        with pytest.raises(ValueError, match="ILLEGAL TRANSITION"):
            self.fsm.transition(
                current_state=self.base_state,
                event="SAVE_PROFILE",  # Wrong event for INIT state
                payload={},
                now=self.now,
            )

    def test_transition_preserves_immutability(self):
        """Test that transition doesn't mutate original state."""
        original_context = {"key": "value"}
        state = {**self.base_state, "context": original_context.copy()}

        result = self.fsm.transition(
            current_state=state, event="ONBOARD_START", payload={}, now=self.now
        )

        # Original should be unchanged
        assert state["context"] == {"key": "value"}
        # Result should have new state
        assert result["state"] == "PROFILE_SETUP"

    def test_full_workflow_sequence(self):
        """Test complete workflow: INIT -> PROFILE_SETUP -> INTEGRATION_SELECT -> DASHBOARD_READY."""
        # Start
        state = self.base_state.copy()

        # Transition 1
        state = self.fsm.transition(
            current_state=state, event="ONBOARD_START", payload={}, now=self.now
        )
        assert state["state"] == "PROFILE_SETUP"

        # Transition 2
        state = self.fsm.transition(
            current_state=state,
            event="SAVE_PROFILE",
            payload={"name": "Alice"},
            now=self.now,
        )
        assert state["state"] == "INTEGRATION_SELECT"
        assert state["context"]["name"] == "Alice"

        # Transition 3
        state = self.fsm.transition(
            current_state=state,
            event="CONNECT_APPS",
            payload={"apps": ["slack"]},
            now=self.now,
        )
        assert state["state"] == "DASHBOARD_READY"
        assert state["context"]["apps"] == ["slack"]
        assert state["context"]["name"] == "Alice"  # Still preserved


class TestDeterminism:
    """Test deterministic behavior (Iron Law compliance)."""

    def test_same_inputs_same_outputs(self):
        """Test that same inputs always produce same outputs."""
        fsm = FSM()
        state = {
            "session_id": "s1",
            "tenant_id": "t1",
            "trace_id": "tr1",
            "state": "INIT",
            "context": {},
            "history": [],
        }
        now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)

        # Run transition twice with same inputs
        result1 = fsm.transition(current_state=state, event="ONBOARD_START", payload={}, now=now)
        result2 = fsm.transition(current_state=state, event="ONBOARD_START", payload={}, now=now)

        # Results should be identical
        assert result1 == result2

    def test_datetime_injection(self):
        """Test that datetime is properly injected, not generated internally."""
        fsm = FSM()
        state = {
            "session_id": "s1",
            "tenant_id": "t1",
            "trace_id": "tr1",
            "state": "INIT",
            "context": {},
            "history": [],
        }

        # Different timestamps should produce different last_updated
        now1 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
        now2 = datetime(2026, 1, 2, 12, 0, 0, tzinfo=UTC)

        result1 = fsm.transition(current_state=state, event="ONBOARD_START", payload={}, now=now1)
        result2 = fsm.transition(current_state=state, event="ONBOARD_START", payload={}, now=now2)

        assert result1["last_updated"] == "2026-01-01T12:00:00+00:00"
        assert result2["last_updated"] == "2026-01-02T12:00:00+00:00"
