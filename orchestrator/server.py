"""
APEX Orchestrator — HTTP API Server.

FastAPI application serving the orchestrator's HTTP endpoints.
This module is cleanly separated from the Temporal Worker entrypoint (main.py).

Usage:
    python main.py api    # Starts the HTTP API server
"""

import logging
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from temporalio.client import Client
from uvicorn import Config, Server

from config import settings
from core.intent_registry import registry
from metrics import get_metrics_app
from omniboard.router import router as omniboard_router
from security.request_signing import SignatureVerificationMiddleware
from workflows.agent_saga import AgentWorkflow
from workflows.universal_saga import UniversalOrchestratorWorkflow

# Ensure registry is seeded before any request arrives
import core.intents  # noqa: F401

logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# FastAPI app for HTTP API
app = FastAPI(title="APEX Orchestrator API", version="1.0.0")

# Register OmniBoard Router
app.include_router(omniboard_router)

# Mount Prometheus /metrics endpoint
app.mount("/metrics", get_metrics_app())

# Attach rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware - Configure allowed origins from environment
CORS_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "https://apexomnihub.icu,https://www.apexomnihub.icu"
).split(",")

# HMAC Signature Verification Middleware
app.add_middleware(SignatureVerificationMiddleware)

# Add CORSMiddleware last so it runs outermost (handles preflight before auth)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class GoalRequest(BaseModel):
    user_id: str
    user_intent: str
    trace_id: str


@app.post("/api/v1/goals", responses={500: {"description": "Internal Server Error"}})
async def create_goal(request: GoalRequest):
    """
    Create and start a new agent workflow.

    This endpoint receives requests from the Edge Function router
    and starts Temporal workflows for AI agent orchestration.
    """
    try:
        logger.info("Creating goal workflow")

        # Connect to Temporal
        client = await Client.connect(
            os.getenv("TEMPORAL_HOST", "localhost:7233"),
            namespace=os.getenv("TEMPORAL_NAMESPACE", "default"),
        )

        # Start workflow with unique ID
        workflow_id = f"goal-{request.trace_id}"

        # C3: Start workflow via function reference for type safety
        handle = await client.start_workflow(
            AgentWorkflow.run,
            args=[request.user_intent, request.user_id, {"trace_id": request.trace_id}],
            id=workflow_id,
            task_queue=os.getenv("TEMPORAL_TASK_QUEUE", "apex-orchestrator"),
        )

        logger.info("✓ Workflow started")
        return {"workflowId": handle.id, "status": "started"}

    except Exception:
        logger.error("Unhandled exception", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from None


@app.post("/api/v1/intents", responses={500: {"description": "Internal Server Error"}})
async def execute_intent(request: Request):
    """
    Execute an intent via the Universal Orchestrator Workflow.

    This endpoint receives a full Python EventEnvelope-compliant JSON body
    from the edge function (constructed by toPythonEventEnvelope in the
    event-ingress-adapter). The body is passed through as-is to the
    UniversalOrchestratorWorkflow, which validates it with Pydantic.

    Wire format: see models.events.EventEnvelope for the full schema.
    """
    try:
        envelope_dict = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body") from None

    # Extract intent_id from payload.intentId for early fail-closed check
    payload = envelope_dict.get("payload", {})
    intent_id = payload.get("intentId", "")
    correlation_id = envelope_dict.get("correlation_id", "unknown")

    if not intent_id:
        raise HTTPException(
            status_code=400,
            detail="Missing payload.intentId in EventEnvelope",
        )

    # Fail-closed: reject unregistered intents before hitting Temporal
    if intent_id not in registry:
        return {
            "intentId": intent_id,
            "traceId": correlation_id,
            "status": "offline",
            "error": f"Intent '{intent_id}' is not registered.",
            "schemaVersion": "1.0.0",
        }

    try:
        client = await Client.connect(
            os.getenv("TEMPORAL_HOST", "localhost:7233"),
            namespace=os.getenv("TEMPORAL_NAMESPACE", "default"),
        )

        workflow_id = f"intent-{correlation_id}"

        # Pass the raw envelope dict — the workflow validates with Pydantic
        handle = await client.start_workflow(
            UniversalOrchestratorWorkflow.run,
            args=[envelope_dict],
            id=workflow_id,
            task_queue=os.getenv("TEMPORAL_TASK_QUEUE", "apex-orchestrator"),
        )

        logger.info("Universal workflow started: %s", handle.id)
        return {"workflowId": handle.id, "status": "started"}

    except Exception:
        logger.error("Intent execution failed", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from None


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


async def start_api_server() -> None:
    """Start FastAPI server for HTTP API."""
    logger.info("🚀 Starting APEX Orchestrator API Server...")
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    logger.info(f"API Server: http://{host}:{port}")
    logger.info("Health check: http://{host}:{port}/health")

    # Run FastAPI with uvicorn
    config = Config(
        app=app,
        host=host,
        port=port,
        log_level=settings.log_level.lower(),
    )
    server = Server(config)
    await server.serve()
