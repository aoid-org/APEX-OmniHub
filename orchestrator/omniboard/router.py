import os
from typing import Any

import redis.asyncio as redis
from fastapi import APIRouter, HTTPException

from .fsm import OmniBoardFSM
from .schema import FSMContext, FSMEvent
from .service import OmniBoardService

router = APIRouter(prefix="/omniboard", tags=["omniboard"])


@router.post("/start", response_model=FSMContext)
async def start_session(tenant_id: str, trace_id: str) -> FSMContext:
    """Start a new OmniBoard onboarding session."""
    context = OmniBoardFSM.start_session(tenant_id, trace_id)

    redis_client = redis.from_url(os.environ["UPSTASH_REDIS_URL"])
    try:
        await redis_client.setex(
            f"omni:session:fsm:{context.session_id}", 1800, context.model_dump_json()
        )
    finally:
        await redis_client.aclose()  # type: ignore[attr-defined]

    return context


SESSION_NOT_FOUND = "Session not found"
_404_RESPONSE: dict[int | str, dict[str, Any]] = {404: {"description": SESSION_NOT_FOUND}}


@router.post(
    "/{session_id}/next",
    response_model=dict[str, Any],
    responses=_404_RESPONSE,
)
async def next_turn(session_id: str, event: FSMEvent) -> dict[str, Any]:
    """
    Process a user turn and advance the FSM.
    Returns the updated context and the system's response message.
    """
    redis_client = redis.from_url(os.environ["UPSTASH_REDIS_URL"])
    try:
        context_json = await redis_client.get(f"omni:session:fsm:{session_id}")
        if not context_json:
            raise HTTPException(status_code=404, detail=SESSION_NOT_FOUND)

        context = FSMContext.model_validate_json(context_json)
        next_context, message = OmniBoardFSM.transition(context, event)

        await redis_client.setex(
            f"omni:session:fsm:{session_id}", 1800, next_context.model_dump_json()
        )
    finally:
        await redis_client.aclose()  # type: ignore[attr-defined]

    return {"context": next_context.model_dump(), "message": message}


@router.get("/{session_id}", response_model=FSMContext, responses=_404_RESPONSE)
async def get_status(session_id: str) -> FSMContext:
    """Get current session status."""
    redis_client = redis.from_url(os.environ["UPSTASH_REDIS_URL"])
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
    success = OmniBoardService.disconnect_provider(connection_id)
    return {"status": "disconnected" if success else "failed", "connection_id": connection_id}


@router.post("/connection/{connection_id}/rotate")
async def rotate(connection_id: str) -> dict[str, str]:
    """Rotate credentials for a connection."""
    new_ref = OmniBoardService.rotate_credentials(connection_id)
    return {"status": "rotated", "connection_id": connection_id, "new_token_ref": new_ref}
