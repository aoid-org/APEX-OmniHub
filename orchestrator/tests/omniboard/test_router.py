from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from omniboard.fsm import OmniBoardFSM
from omniboard.router import router
from omniboard.schema import OmniBoardState

app = FastAPI()
app.include_router(router)

client = TestClient(app)


def test_router_lifecycle():
    """Verify disconnect and rotate endpoints."""
    # these are mock endpoints, just checking 200 OK

    resp = client.delete("/omniboard/connection/conn_123")
    assert resp.status_code == 200
    assert resp.json()["status"] == "disconnected"

    resp = client.post("/omniboard/connection/conn_123/rotate")
    assert resp.status_code == 200
    assert resp.json()["status"] == "rotated"


def _redis_stub(initial_json: str):
    """In-memory stand-in for the OmniBoard session store."""
    store = {"json": initial_json}

    stub = AsyncMock()
    stub.get = AsyncMock(side_effect=lambda *_a, **_k: store["json"])

    async def _setex(_key, _ttl, value):
        store["json"] = value

    stub.setex = AsyncMock(side_effect=_setex)
    stub.aclose = AsyncMock()
    return stub


def test_next_turn_resolves_provider_instead_of_parking():
    """
    Regression guard: a single turn from IDLE_LISTEN must resolve the provider
    and advance the FSM. Before the OMNIBOARD-RESOLVE fix the router returned
    "Searching for '<x>'..." and parked in APP_IDENTIFICATION forever, because
    OmniBoardService.fuzzy_match_provider was never invoked in the request path.
    """
    context = OmniBoardFSM.start_session("tenant_test", "trace_test")
    stub = _redis_stub(context.model_dump_json())

    with patch("omniboard.router.get_omniboard_redis", return_value=stub):
        resp = client.post(
            f"/omniboard/{context.session_id}/next",
            json={"event_type": "USER_INPUT", "payload": {"user_input": "Slack"}},
        )

    assert resp.status_code == 200
    body = resp.json()

    assert "Searching for" not in body["message"], "FSM parked instead of resolving"
    assert body["context"]["state"] == "AUTH_SETUP"
    assert body["context"]["provider_name"] == "Slack"


def test_next_turn_unknown_app_terminates_honestly():
    """An unresolvable app must return a terminal answer, never a spinner."""
    context = OmniBoardFSM.start_session("tenant_test", "trace_test")
    stub = _redis_stub(context.model_dump_json())

    with patch("omniboard.router.get_omniboard_redis", return_value=stub):
        resp = client.post(
            f"/omniboard/{context.session_id}/next",
            json={
                "event_type": "USER_INPUT",
                "payload": {"user_input": "Google Antigravity"},
            },
        )

    assert resp.status_code == 200
    assert "Searching for" not in resp.json()["message"]


def test_disambiguation_selection_resolves_and_advances():
    """
    Regression guard: picking from the candidate list must reach AUTH_SETUP.
    _handle_app_disambiguation reads match_found/provider_name from the incoming
    payload; nothing supplied them, so the user looped on "Please select one of
    the options or try searching again." indefinitely.
    """
    context = OmniBoardFSM.start_session("tenant_test", "trace_test")
    context.state = OmniBoardState.APP_DISAMBIGUATION
    context.candidates = ["Slack", "Salesforce"]
    stub = _redis_stub(context.model_dump_json())

    with patch("omniboard.router.get_omniboard_redis", return_value=stub):
        resp = client.post(
            f"/omniboard/{context.session_id}/next",
            json={"event_type": "USER_INPUT", "payload": {"user_input": "Slack"}},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["context"]["state"] == "AUTH_SETUP"
    assert body["context"]["provider_name"] == "Slack"


def test_resolver_is_actually_invoked():
    """Engine gate: prove the backend resolver runs, not just that copy changed."""
    context = OmniBoardFSM.start_session("tenant_test", "trace_test")
    stub = _redis_stub(context.model_dump_json())

    with (
        patch("omniboard.router.get_omniboard_redis", return_value=stub),
        patch("omniboard.router._resolve_candidates", return_value=["Slack"]) as spy,
    ):
        client.post(
            f"/omniboard/{context.session_id}/next",
            json={"event_type": "USER_INPUT", "payload": {"user_input": "Slack"}},
        )

    spy.assert_called_once_with("Slack")
