import uuid

from omniboard.fsm import OmniBoardFSM
from omniboard.schema import FSMEvent, OmniBoardState


def test_fsm_golden_path():
    """Verify the happy path: IDLE -> ID -> AUTH -> VERIFY -> REGISTER -> PURE BLISS."""
    # 1. Start
    context = OmniBoardFSM.start_session("tenant-123", "trace-abc")
    assert context.state == OmniBoardState.IDLE_LISTEN

    # 2. User says "Connect Gmail"
    context, _ = OmniBoardFSM.transition(
        context, FSMEvent(event_type="USER_INPUT", payload={"user_input": "Gmail"})
    )
    assert context.state == OmniBoardState.APP_IDENTIFICATION
    assert context.provider_hint == "Gmail"

    # 3. User Confirms "Gmail"
    context, _ = OmniBoardFSM.transition(
        context,
        FSMEvent(
            event_type="PROVIDER_SELECTED", payload={"match_found": True, "provider_name": "Gmail"}
        ),
    )
    assert context.state == OmniBoardState.AUTH_SETUP
    assert context.provider_name == "Gmail"

    # 4. User Selects OAuth
    context, _ = OmniBoardFSM.transition(
        context, FSMEvent(event_type="AUTH_METHOD_SELECTED", payload={"auth_method": "oauth"})
    )
    assert context.state == OmniBoardState.AUTH_COMPLETE  # Immediate transition in Mock/FSM logic

    # 4b. Auth Callback Received (Transition to VERIFY)
    context, msg = OmniBoardFSM.transition(
        context, FSMEvent(event_type="AUTH_CALLBACK", payload={"code": "123"})
    )
    assert context.state == OmniBoardState.VERIFY_CONNECTION

    # 5. System Verifies (Simulated)
    context, msg = OmniBoardFSM.transition(
        context, FSMEvent(event_type="VERIFICATION_RESULT", payload={"verified": True})
    )
    assert context.state == OmniBoardState.REGISTER_CONNECTION

    # 6. System Registers (Simulated)
    context, msg = OmniBoardFSM.transition(
        context, FSMEvent(event_type="REGISTRATION_SUCCESS", payload={})
    )
    assert context.state == OmniBoardState.COMPLETION
    assert context.final_spec is not None
    assert context.final_spec.connection.verified is True
    assert context.final_spec.connection.token_ref.startswith("vault://")


def test_fsm_failure_recovery():
    """Verify failure path and recovery."""
    context = OmniBoardFSM.start_session("tenant-123", "trace-fail")

    # Jump to verify
    context.state = OmniBoardState.VERIFY_CONNECTION

    # Fail 3 times
    for _ in range(3):
        context, _ = OmniBoardFSM.transition(
            context, FSMEvent(event_type="VERIFICATION_RESULT", payload={"verified": False})
        )
        assert context.state == OmniBoardState.AUTH_SETUP
        # Manually push back to verify for test
        context.state = OmniBoardState.VERIFY_CONNECTION

    # 4th failure -> RECOVERY_RETRY
    context, msg = OmniBoardFSM.transition(
        context, FSMEvent(event_type="VERIFICATION_RESULT", payload={"verified": False})
    )
    assert context.state == OmniBoardState.RECOVERY_RETRY
    assert "start over" in msg.lower()


def test_fsm_disambiguation():
    """Verify disambiguation flow when multiple providers match."""
    context = OmniBoardFSM.start_session("tenant-123", "trace-ambig")

    # 1. User says "Ji" (Matches Jira, Jira Service Desk)
    context, _ = OmniBoardFSM.transition(
        context, FSMEvent(event_type="USER_INPUT", payload={"user_input": "Ji"})
    )
    assert context.state == OmniBoardState.APP_IDENTIFICATION

    # 2. System finds options (Service layer logic mocked here)
    context, msg = OmniBoardFSM.transition(
        context,
        FSMEvent(
            event_type="PROVIDER_LOOKUP_RESULT",
            payload={"match_found": False, "candidates": ["Jira", "JitBit"]},
        ),
    )
    assert context.state == OmniBoardState.APP_DISAMBIGUATION
    assert "Jira" in msg
    assert "JitBit" in msg

    # 3. User selects "Jira"
    context, _ = OmniBoardFSM.transition(
        context,
        FSMEvent(
            event_type="USER_INPUT",
            payload={"user_input": "Jira", "match_found": True, "provider_name": "Jira"},
        ),
    )
    assert context.state == OmniBoardState.AUTH_SETUP
    assert context.provider_name == "Jira"


def test_fsm_oauth_flow():
    """Verify OAuth specific flow details."""
    context = OmniBoardFSM.start_session("t1", "tr1")
    context.state = OmniBoardState.AUTH_SETUP
    context.provider_name = "Slack"

    # Select OAuth
    context, _ = OmniBoardFSM.transition(
        context, FSMEvent(event_type="AUTH_METHOD_SELECTED", payload={"auth_method": "oauth"})
    )
    assert context.state == OmniBoardState.AUTH_COMPLETE


def test_fsm_api_key_flow():
    """Verify API Key flow details."""
    context = OmniBoardFSM.start_session("t1", "tr1")
    context.state = OmniBoardState.AUTH_SETUP
    context.provider_name = "Notion"

    # Select API Key
    context, _ = OmniBoardFSM.transition(
        context, FSMEvent(event_type="AUTH_METHOD_SELECTED", payload={"auth_method": "api_key"})
    )
    assert context.state == OmniBoardState.AUTH_COMPLETE

    # Provide Key
    context, _ = OmniBoardFSM.transition(
        context, FSMEvent(event_type="USER_INPUT", payload={"user_input": "secret_key_123"})
    )
    assert context.state == OmniBoardState.VERIFY_CONNECTION


def test_fsm_device_code_flow():
    """Verify Device Code flow details."""
    context = OmniBoardFSM.start_session("t1", "tr1")
    context.state = OmniBoardState.AUTH_SETUP
    context.provider_name = "GitHub"

    # Select Device Code
    context, _ = OmniBoardFSM.transition(
        context, FSMEvent(event_type="AUTH_METHOD_SELECTED", payload={"auth_method": "device_code"})
    )
    assert context.state == OmniBoardState.AUTH_COMPLETE


def test_fsm_verification_ping_failure():
    """Verify handling of ping failure."""
    context = OmniBoardFSM.start_session("t1", "tr1")
    context.state = OmniBoardState.VERIFY_CONNECTION

    # Simulate System reporting failure

    context, msg = OmniBoardFSM.transition(
        context,
        FSMEvent(event_type="VERIFICATION_RESULT", payload={"verified": False, "ping": False}),
    )
    assert context.state == OmniBoardState.AUTH_SETUP  # Should retry auth
    assert "Verification failed" in msg


def test_fsm_verification_scope_failure():
    """Verify handling of scope failure."""
    context = OmniBoardFSM.start_session("t1", "tr1")
    context.state = OmniBoardState.VERIFY_CONNECTION

    context, _ = OmniBoardFSM.transition(
        context,
        FSMEvent(
            event_type="VERIFICATION_RESULT", payload={"verified": False, "introspection": False}
        ),
    )
    assert context.state == OmniBoardState.AUTH_SETUP


def test_fsm_registration_with_id():
    """Verify registration consumes external ID."""
    context = OmniBoardFSM.start_session("t1", "tr1")
    context.state = OmniBoardState.REGISTER_CONNECTION
    context.provider_name = "Zoom"

    external_id = f"conn_{uuid.uuid4()}"
    context, _ = OmniBoardFSM.transition(
        context, FSMEvent(event_type="REGISTRATION_SUCCESS", payload={"connection_id": external_id})
    )

    assert context.state == OmniBoardState.COMPLETION
    assert context.final_spec.connection.connection_id == external_id
