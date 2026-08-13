from typing import Any

from fastapi import APIRouter, HTTPException

from ._redis import get_omniboard_redis
from .fsm import OmniBoardFSM
from .schema import FSMContext, FSMEvent, OmniBoardState

router = APIRouter(prefix="/omniboard", tags=["omniboard"])


def _resolve_candidates(text: str) -> list[str]:
    """
    Fuzzy-match a provider name against the known-provider catalog.

    Imported lazily: OmniBoardService pulls authlib and the database factory at
    module scope. A top-level import here would make both a hard requirement
    for loading the entire /omniboard route tree.
    """
    from .service import OmniBoardService

    return OmniBoardService.fuzzy_match_provider(text)


@router.post("/start")
async def start_session(tenant_id: str, trace_id: str) -> FSMContext:
    """Start a new OmniBoard onboarding session."""
    context = OmniBoardFSM.start_session(tenant_id, trace_id)

    redis_client = get_omniboard_redis()
    try:
        await redis_client.setex(
            f"omni:session:fsm:{context.session_id}", 1800, context.model_dump_json()
        )
    finally:
        await redis_client.aclose()  # type: ignore[attr-defined]

    return context


SESSION_NOT_FOUND = "Session not found"
_404_RESPONSE: dict[int | str, dict[str, str]] = {404: {"description": SESSION_NOT_FOUND}}


@router.post(
    "/{session_id}/next",
    responses=_404_RESPONSE,
)
async def next_turn(session_id: str, event: FSMEvent) -> dict[str, Any]:
    """
    Process a user turn and advance the FSM.
    Returns the updated context, the system's response message, and — when the
    FSM reaches COMPLETION — a top-level `connection_spec` key containing the
    canonical ConnectionSpec dict.  The frontend OmniBoardWizard reads
    `data.connection_spec` to call onComplete(); without this field the wizard
    would silently ignore the completed connection.
    """
    redis_client = get_omniboard_redis()
    try:
        context_json = await redis_client.get(f"omni:session:fsm:{session_id}")
        if not context_json:
            raise HTTPException(status_code=404, detail=SESSION_NOT_FOUND)

        context = FSMContext.model_validate_json(context_json)

        # OMNIBOARD-RESOLVE 1/2 — _handle_app_disambiguation reads match_found
        # and provider_name from the incoming payload, and nothing supplies
        # them, so a user picking from the candidate list looped forever on
        # "Please select one of the options or try searching again."
        # Resolve the selection and enrich the event before the FSM consumes it.
        if context.state == OmniBoardState.APP_DISAMBIGUATION:
            selection = str(event.payload.get("user_input", "")).strip()
            if selection:
                matches = _resolve_candidates(selection)
                if len(matches) == 1:
                    event = event.model_copy(
                        update={
                            "payload": {
                                **event.payload,
                                "match_found": True,
                                "provider_name": matches[0],
                            }
                        }
                    )

        next_context, message = OmniBoardFSM.transition(context, event)

        # OMNIBOARD-RESOLVE 2/2 — IDLE_LISTEN emits "Searching for '<x>'..." and
        # parks in APP_IDENTIFICATION. No other actor in the request path
        # performs that search, so the FSM waited forever and the user saw a
        # permanent spinner. Resolve and advance in the same turn. Guarded on
        # state + hint, so an already-resolved context passes through untouched.
        if (
            next_context.state == OmniBoardState.APP_IDENTIFICATION
            and next_context.provider_hint
        ):
            candidates = _resolve_candidates(next_context.provider_hint)
            exact = len(candidates) == 1
            next_context, message = OmniBoardFSM.transition(
                next_context,
                FSMEvent(
                    event_type="PROVIDER_RESOLVED",
                    payload={
                        "match_found": exact,
                        "provider_name": candidates[0] if exact else None,
                        "candidates": candidates if not exact else [],
                    },
                ),
            )

        await redis_client.setex(
            f"omni:session:fsm:{session_id}", 1800, next_context.model_dump_json()
        )
    finally:
        await redis_client.aclose()  # type: ignore[attr-defined]

    return {
        "context": next_context.model_dump(),
        "message": message,
        # Normalize contract: expose final_spec as connection_spec at the top level
        # so the frontend reads data.connection_spec (not data.context.final_spec).
        **(
            {"connection_spec": next_context.final_spec.model_dump()}
            if next_context.final_spec is not None
            else {}
        ),
    }


@router.get("/{session_id}", responses=_404_RESPONSE)
async def get_status(session_id: str) -> FSMContext:
    """Get current session status."""
    redis_client = get_omniboard_redis()
    try:
        context_json = await redis_client.get(f"omni:session:fsm:{session_id}")
        if not context_json:
            raise HTTPException(status_code=404, detail=SESSION_NOT_FOUND)
        return FSMContext.model_validate_json(context_json)
    finally:
        await redis_client.aclose()  # type: ignore[attr-defined]


@router.delete("/connection/{connection_id}")
async def disconnect(connection_id: str) -> dict[str, str]:
    """Disconnect a provider (lifecycle management)."""
    return {"status": "disconnected", "connection_id": connection_id}


@router.post("/connection/{connection_id}/rotate")
async def rotate(connection_id: str) -> dict[str, str]:
    """Rotate credentials for a connection."""
    new_ref = f"omni:vault:creds:{connection_id}"
    return {"status": "rotated", "connection_id": connection_id, "new_token_ref": new_ref}
