from typing import Any

from fastapi import APIRouter, HTTPException

from .fsm import OmniBoardFSM
from .schema import FSMContext, FSMEvent
from .service import OmniBoardService

router = APIRouter(prefix="/omniboard", tags=["omniboard"])

# In-memory session store for demo purposes (replace with Redis in prod)
# session_id -> FSMContext
session_store: dict[str, FSMContext] = {}


@router.post("/start", response_model=FSMContext)
async def start_session(tenant_id: str, trace_id: str):
    """Start a new OmniBoard onboarding session."""
    context = OmniBoardFSM.start_session(tenant_id, trace_id)
    session_store[context.session_id] = context
    return context


@router.post("/{session_id}/next", response_model=dict[str, Any])
async def next_turn(session_id: str, event: FSMEvent):
    """
    Process a user turn and advance the FSM.
    Returns the updated context and the system's response message.
    """
    context = session_store.get(session_id)
    if not context:
        raise HTTPException(status_code=404, detail="Session not found")

    next_context, message = OmniBoardFSM.transition(context, event)
    session_store[session_id] = next_context

    return {"context": next_context.model_dump(), "message": message}


@router.get("/{session_id}", response_model=FSMContext)
async def get_status(session_id: str):
    """Get current session status."""
    context = session_store.get(session_id)
    if not context:
        raise HTTPException(status_code=404, detail="Session not found")
    return context


@router.delete("/connection/{connection_id}")
async def disconnect(connection_id: str):
    """Disconnect a provider (lifecycle management)."""
    success = OmniBoardService.disconnect_provider(connection_id)
    return {"status": "disconnected" if success else "failed", "connection_id": connection_id}


@router.post("/connection/{connection_id}/rotate")
async def rotate(connection_id: str):
    """Rotate credentials for a connection."""
    new_ref = OmniBoardService.rotate_credentials(connection_id)
    return {"status": "rotated", "connection_id": connection_id, "new_token_ref": new_ref}
