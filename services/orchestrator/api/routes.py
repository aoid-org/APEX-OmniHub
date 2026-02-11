"""
APEX Orchestrator API Routes.
Glue layer between HTTP requests and deterministic FSM logic.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..fsm import FSM

router = APIRouter()
fsm = FSM()


# DTOs
class StartSessionRequest(BaseModel):
    """Request schema for starting a new session."""

    tenant_id: str


class TransitionRequest(BaseModel):
    """Request schema for state transitions."""

    state: dict
    event: str
    payload: dict


# ENDPOINTS
@router.post("/session/start")
async def start_session_handler(request: Request, body: StartSessionRequest) -> dict:
    """
    Injects Reality (Randomness) -> Calls Pure Logic.

    Args:
        request: FastAPI request object
        body: Session start request

    Returns:
        Success response with session data
    """
    # INJECTION POINT 1: UUID
    generated_session_id = str(uuid.uuid4())
    trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4()))

    try:
        result = fsm.start_session(
            tenant_id=body.tenant_id,
            trace_id=trace_id,
            session_id=generated_session_id,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/workflow/next")
async def transition_handler(body: TransitionRequest) -> dict:
    """
    Injects Reality (Time) -> Calls Pure Logic.

    Args:
        body: Transition request

    Returns:
        Success response with new state
    """
    # INJECTION POINT 2: TIME
    current_time_utc = datetime.now(UTC)

    try:
        result = fsm.transition(
            current_state=body.state,
            event=body.event,
            payload=body.payload,
            now=current_time_utc,
        )
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
