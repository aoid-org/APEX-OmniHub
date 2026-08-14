"""
OmniBoard Router Contract Tests — PR #1482
==========================================
Covers the five required contract scenarios per the PR directive:
  1. FSM progression: USER_INPUT advances IDLE_LISTEN -> APP_IDENTIFICATION
  2. Provider not found: fuzzy match returns empty, message is honest
  3. Missing config: session not found returns 404
  4. Verification failure: VERIFICATION_RESULT verified=False goes to AUTH_SETUP
  5. Successful completion: connection_spec appears at top level of response

All tests mock Redis using pytest-mock / monkeypatching to avoid requiring
a live Upstash connection in CI.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from omniboard.fsm import OmniBoardFSM
from omniboard.router import router
from omniboard.schema import (
    FSMContext,
    FSMEvent,
    OmniBoardState,
)

# ── Test app ───────────────────────────────────────────────────────────────────

app = FastAPI()
app.include_router(router)
client = TestClient(app)


# ── Helpers ────────────────────────────────────────────────────────────────────


def _make_context(state: OmniBoardState = OmniBoardState.IDLE_LISTEN, **kwargs) -> FSMContext:
    return FSMContext(
        session_id=str(uuid.uuid4()),
        tenant_id="tenant-test-001",
        state=state,
        trace_id=str(uuid.uuid4()),
        **kwargs,
    )


def _redis_mock(context: FSMContext) -> MagicMock:
    """Return a mock redis client that returns the given context JSON on get()."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=context.model_dump_json())
    mock.setex = AsyncMock(return_value=True)
    mock.aclose = AsyncMock(return_value=None)
    return mock


def _redis_not_found() -> MagicMock:
    """Return a mock redis client that returns None (session not found)."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.aclose = AsyncMock(return_value=None)
    return mock


# ── Contract 1: FSM progression on USER_INPUT ─────────────────────────────────


class TestFSMProgressionUserInput:
    """USER_INPUT event in IDLE_LISTEN must advance to APP_IDENTIFICATION."""

    def test_idle_listen_user_input_advances_state(self):
        """
        Contract: POST /omniboard/{id}/next with event_type=USER_INPUT and
        payload.user_input resolves provider and advances FSM from IDLE_LISTEN -> AUTH_SETUP.
        """
        ctx = _make_context(OmniBoardState.IDLE_LISTEN)
        session_id = ctx.session_id

        with patch("omniboard.router.get_omniboard_redis", return_value=_redis_mock(ctx)):
            resp = client.post(
                f"/omniboard/{session_id}/next",
                json={
                    "event_type": "USER_INPUT",
                    "payload": {"user_input": "GitHub"},
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert "context" in body
        assert "message" in body
        assert body["context"]["state"] == OmniBoardState.AUTH_SETUP.value
        assert body["context"]["provider_name"] == "GitHub"
        # No connection_spec at this stage
        assert "connection_spec" not in body

    def test_user_input_with_text_key_does_not_advance(self):
        """
        Regression: OLD contract sent payload.text — FSM ignores it, stays in IDLE.
        This verifies the contract fix is necessary (payload.text yields empty input).
        """
        ctx = _make_context(OmniBoardState.IDLE_LISTEN)

        # FSM reads payload["user_input"], not payload["text"]
        event = FSMEvent(event_type="USER_INPUT", payload={"text": "GitHub"})
        next_ctx, msg = OmniBoardFSM.transition(ctx, event)

        # Without the fix the FSM sees empty user_input and stays in IDLE_LISTEN
        assert next_ctx.state == OmniBoardState.IDLE_LISTEN
        assert "ready" in msg.lower() or "connect" in msg.lower()

    def test_user_input_with_user_input_key_advances(self):
        """
        Confirms the FIXED contract: payload.user_input drives the FSM forward.
        """
        ctx = _make_context(OmniBoardState.IDLE_LISTEN)

        event = FSMEvent(event_type="USER_INPUT", payload={"user_input": "Slack"})
        next_ctx, _ = OmniBoardFSM.transition(ctx, event)

        assert next_ctx.state == OmniBoardState.APP_IDENTIFICATION
        assert next_ctx.provider_hint == "Slack"


# ── Contract 2: Provider not found ────────────────────────────────────────────


class TestProviderNotFound:
    """APP_IDENTIFICATION with no match returns honest message, stays in state."""

    def test_provider_not_found_returns_honest_message(self):
        """
        When APP_IDENTIFICATION receives match_found=False and no candidates,
        the FSM returns an informative message and does NOT advance.
        """
        ctx = _make_context(OmniBoardState.APP_IDENTIFICATION)
        ctx.provider_hint = "ZoomXXXUnknown"

        event = FSMEvent(
            event_type="PROVIDER_LOOKUP_RESULT",
            payload={"match_found": False, "candidates": []},
        )
        next_ctx, msg = OmniBoardFSM.transition(ctx, event)

        # Must stay in APP_IDENTIFICATION (can't advance without a provider)
        assert next_ctx.state == OmniBoardState.APP_IDENTIFICATION
        # Message must be honest — no fake success
        assert "couldn't find" in msg.lower() or "spell" in msg.lower()

    def test_provider_not_found_via_router(self):
        """Router returns 200 with honest message when provider is not found."""
        ctx = _make_context(OmniBoardState.APP_IDENTIFICATION)

        with patch("omniboard.router.get_omniboard_redis", return_value=_redis_mock(ctx)):
            resp = client.post(
                f"/omniboard/{ctx.session_id}/next",
                json={
                    "event_type": "PROVIDER_LOOKUP_RESULT",
                    "payload": {"match_found": False, "candidates": []},
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert "connection_spec" not in body
        # State must not advance to a connection state
        assert body["context"]["state"] not in (
            OmniBoardState.AUTH_SETUP.value,
            OmniBoardState.COMPLETION.value,
        )


# ── Contract 3: Missing session config (session not found) ────────────────────


class TestMissingConfig:
    """Session not found must return 404 — not 200, not 500."""

    def test_session_not_found_returns_404(self):
        """
        Missing Redis key (expired or invalid session_id) must return HTTP 404.
        """
        fake_session_id = str(uuid.uuid4())

        with patch("omniboard.router.get_omniboard_redis", return_value=_redis_not_found()):
            resp = client.post(
                f"/omniboard/{fake_session_id}/next",
                json={"event_type": "USER_INPUT", "payload": {"user_input": "test"}},
            )

        assert resp.status_code == 404
        assert "Session not found" in resp.json().get("detail", "")

    def test_get_status_session_not_found(self):
        """GET /omniboard/{id} also returns 404 for missing session."""
        with patch("omniboard.router.get_omniboard_redis", return_value=_redis_not_found()):
            resp = client.get(f"/omniboard/{uuid.uuid4()}")
        assert resp.status_code == 404


# ── Contract 4: Verification failure ─────────────────────────────────────────


class TestVerificationFailure:
    """VERIFICATION_RESULT verified=False must route back to AUTH_SETUP."""

    def test_verification_failure_returns_to_auth_setup(self):
        """
        On a single verification failure the FSM must go back to AUTH_SETUP
        (not RECOVERY_RETRY which only triggers after > 3 failures).
        """
        ctx = _make_context(OmniBoardState.VERIFY_CONNECTION)
        ctx.provider_name = "GitHub"

        event = FSMEvent(
            event_type="VERIFICATION_RESULT",
            payload={"verified": False},
        )
        next_ctx, msg = OmniBoardFSM.transition(ctx, event)

        assert next_ctx.state == OmniBoardState.AUTH_SETUP
        assert "verification failed" in msg.lower() or "check your credentials" in msg.lower()
        # Must NOT fake success
        assert next_ctx.final_spec is None

    def test_verification_failure_via_router_no_connection_spec(self):
        """Router must not include connection_spec on verification failure."""
        ctx = _make_context(OmniBoardState.VERIFY_CONNECTION)
        ctx.provider_name = "Slack"

        with patch("omniboard.router.get_omniboard_redis", return_value=_redis_mock(ctx)):
            resp = client.post(
                f"/omniboard/{ctx.session_id}/next",
                json={
                    "event_type": "VERIFICATION_RESULT",
                    "payload": {"verified": False},
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert "connection_spec" not in body
        assert body["context"]["state"] == OmniBoardState.AUTH_SETUP.value

    def test_repeated_failures_trigger_recovery(self):
        """After > 3 failures the FSM enters RECOVERY_RETRY."""
        ctx = _make_context(OmniBoardState.VERIFY_CONNECTION)
        ctx.retry_count = 3  # already at limit

        event = FSMEvent(event_type="VERIFICATION_RESULT", payload={"verified": False})
        next_ctx, msg = OmniBoardFSM.transition(ctx, event)

        assert next_ctx.state == OmniBoardState.RECOVERY_RETRY
        assert "start over" in msg.lower()


# ── Contract 5: Successful completion with connection_spec ────────────────────


class TestSuccessfulCompletion:
    """
    COMPLETION state must include connection_spec at the TOP LEVEL of the
    /next response — not buried inside context.final_spec.
    Frontend reads: data.connection_spec (not data.context.final_spec).
    """

    def test_completion_includes_top_level_connection_spec(self):
        """
        On REGISTER_CONNECTION success the router must return
        {context: {...}, message: "...", connection_spec: {...}}.
        """
        ctx = _make_context(OmniBoardState.REGISTER_CONNECTION)
        ctx.provider_name = "GitHub"
        ctx.provider_hint = "GitHub"
        conn_id = f"conn_{uuid.uuid4()}"

        with patch("omniboard.router.get_omniboard_redis", return_value=_redis_mock(ctx)):
            resp = client.post(
                f"/omniboard/{ctx.session_id}/next",
                json={
                    "event_type": "REGISTRATION_SUCCESS",
                    "payload": {"connection_id": conn_id},
                },
            )

        assert resp.status_code == 200
        body = resp.json()

        # State must be COMPLETION
        assert body["context"]["state"] == OmniBoardState.COMPLETION.value

        # connection_spec MUST be at the top level (not inside context)
        assert "connection_spec" in body, (
            "connection_spec missing from router response — "
            "OmniBoardWizard will silently ignore the completed connection."
        )

        spec = body["connection_spec"]
        # Verify canonical spec structure
        assert "tenant_id" in spec
        assert "connection" in spec
        assert "security" in spec
        assert "audit" in spec
        assert spec["connection"]["verified"] is True
        assert spec["connection"]["token_ref"].startswith("vault://")
        assert spec["connection"]["connection_id"] == conn_id

    def test_completion_spec_not_included_before_completion(self):
        """connection_spec must NOT appear before FSM reaches COMPLETION."""
        ctx = _make_context(OmniBoardState.IDLE_LISTEN)

        with patch("omniboard.router.get_omniboard_redis", return_value=_redis_mock(ctx)):
            resp = client.post(
                f"/omniboard/{ctx.session_id}/next",
                json={"event_type": "USER_INPUT", "payload": {"user_input": "Slack"}},
            )

        body = resp.json()
        assert "connection_spec" not in body

    def test_connection_spec_token_ref_format(self):
        """Final spec token_ref must use vault:// scheme — never raw credentials."""
        ctx = _make_context(OmniBoardState.REGISTER_CONNECTION)
        ctx.provider_name = "Notion"
        ctx.provider_hint = "Notion"

        event = FSMEvent(event_type="REGISTRATION_SUCCESS", payload={})
        next_ctx, _ = OmniBoardFSM.transition(ctx, event)

        assert next_ctx.final_spec is not None
        assert next_ctx.final_spec.connection.token_ref.startswith("vault://")
        # Must not contain any actual credential value
        assert len(next_ctx.final_spec.connection.token_ref) < 200  # No embedded key blobs
