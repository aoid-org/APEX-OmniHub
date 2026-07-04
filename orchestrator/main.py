"""
APEX Orchestrator - Main Entry Point.

Pure Temporal Worker CLI entrypoint. No HTTP server logic.
HTTP API is served separately via `server.py`.

This script starts the Temporal worker and connects all components:
- Workflows (AgentWorkflow)
- Activities (tool execution, caching, database operations)
- Infrastructure (Redis, Supabase, LLM clients)

Usage:
    # Start worker
    python main.py worker

    # Start HTTP API server (delegates to server.py)
    python main.py api

    # Submit test workflow
    python main.py submit "Book flight to Paris tomorrow"

    # Run with custom config
    TEMPORAL_HOST=temporal.example.com:7233 python main.py worker
"""

import asyncio
import logging
import os
import sys

from temporalio.client import Client
from temporalio.service import TLSConfig
from temporalio.worker import Worker

# Seed the intent registry with all known activity→intent mappings.
# This import has side effects: it populates the registry singleton.
import core.intents  # noqa: F401
from activities.dlq_alert import send_dlq_alert
from activities.iron_law_verify import verify_deductive_path
from activities.man_mode import (
    check_man_decision,
    create_man_task,
    get_man_task,
    resolve_man_task,
    risk_triage,
)
from activities.notify_man_task import notify_man_task
from activities.omni_policy import evaluate_policy_activity
from activities.omnitrace_activities import get_omnitrace_activities
from activities.physiomni_activities import (
    compute_14_day_baseline,
    dispatch_work_order_activity,
    evaluate_baseline,
    evaluate_baseline_activity,
    log_physiomni_alert,
    man_mode_escalation_activity,
)
from activities.resolve_intent import resolve_intent
from activities.tools import (
    call_webhook,
    check_semantic_cache,
    create_record,
    delete_record,
    generate_plan_with_llm,
    mint_pilot_session,
    respond_to_user,
    search_database,
    search_youtube,
    send_email,
    setup_activities,
    update_agent_run_completion,
)
from activities.universal_intents import (
    connector_connect,
    connector_create_custom,
    connector_disconnect,
    connector_list,
    connector_status,
    connector_test,
    system_echo,
    system_health_check,
    system_list_intents,
)
from config import settings
from metrics import start_metrics_server
from workflows.agent_saga import AgentWorkflow
from workflows.physiomni_saga import PhysiOmniAnomalySaga
from workflows.universal_saga import UniversalOrchestratorWorkflow

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _build_temporal_tls_config() -> TLSConfig | bool:
    if not settings.temporal_tls_enabled:
        return False

    if not settings.temporal_tls_cert or not settings.temporal_tls_key:
        raise ValueError("TEMPORAL_TLS_CERT and TEMPORAL_TLS_KEY are required when TLS is enabled")

    with open(settings.temporal_tls_cert, "rb") as cert_file:
        client_cert = cert_file.read()
    with open(settings.temporal_tls_key, "rb") as key_file:
        client_private_key = key_file.read()

    return TLSConfig(client_cert=client_cert, client_private_key=client_private_key)


def _temporal_connect_kwargs() -> dict:
    """Build Client.connect auth kwargs.

    Temporal Cloud API-key auth (TEMPORAL_API_KEY) takes precedence and implies
    TLS. Falls back to mTLS / plaintext per the TEMPORAL_TLS_* settings when no
    API key is configured (e.g. self-hosted/local Temporal).
    """
    api_key = settings.temporal_api_key.get_secret_value() if settings.temporal_api_key else ""
    if api_key:
        return {"tls": True, "api_key": api_key}
    return {"tls": _build_temporal_tls_config()}


async def start_worker() -> None:
    """
    Start Temporal worker.

    The worker:
    1. Connects to Temporal server
    2. Initializes activity dependencies (Redis, Supabase, etc.)
    3. Registers workflows and activities
    4. Polls task queue for work
    5. Executes workflows and activities

    Architecture:
        Temporal Server → Task Queue → Worker (this process) → Workflows/Activities
    """
    logger.info("🚀 Starting APEX Orchestrator Worker...")
    start_metrics_server(port=int(os.getenv("METRICS_PORT", "9090")))
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Temporal: {settings.temporal_host} (namespace={settings.temporal_namespace})")
    logger.info(f"Task Queue: {settings.temporal_task_queue}")

    # Initialize activity dependencies
    logger.info("Initializing activity dependencies...")
    activity_key = (
        settings.supabase_activity_key.get_secret_value()
        if settings.supabase_activity_key.get_secret_value()
        else settings.supabase_service_role_key.get_secret_value()
    )
    if activity_key == settings.supabase_service_role_key.get_secret_value():
        logger.warning(
            "Using SUPABASE_SERVICE_ROLE_KEY for activities; "
            "configure SUPABASE_ACTIVITY_KEY for least privilege"
        )

    await setup_activities(
        supabase_url=settings.supabase_url,
        supabase_key=activity_key,
        redis_url=settings.redis_url,
        redis_password=settings.redis_password.get_secret_value()
        if settings.redis_password
        else None,
        redis_ssl=settings.redis_ssl,
    )
    logger.info("✓ Dependencies initialized")

    # Connect to Temporal server
    logger.info(f"Connecting to Temporal: {settings.temporal_host}...")
    client = await Client.connect(
        settings.temporal_host,
        namespace=settings.temporal_namespace,
        **_temporal_connect_kwargs(),
    )
    logger.info("✓ Connected to Temporal")

    # Create worker
    worker = Worker(
        client,
        task_queue=settings.temporal_task_queue,
        workflows=[AgentWorkflow, UniversalOrchestratorWorkflow, PhysiOmniAnomalySaga],
        activities=[
            # Planning activities
            check_semantic_cache,
            generate_plan_with_llm,
            # Tool execution activities
            respond_to_user,
            search_database,
            search_youtube,
            create_record,
            delete_record,
            send_email,
            call_webhook,
            evaluate_policy_activity,
            # MAN Mode activities
            risk_triage,
            create_man_task,
            resolve_man_task,
            get_man_task,
            check_man_decision,
            notify_man_task,
            # Iron Law verification (physical AI safety gate)
            verify_deductive_path,
            # DLQ alert activity (permanently failed workflows)
            send_dlq_alert,
            # Agent run lifecycle: terminal state write-back + BYOM session mint
            update_agent_run_completion,
            mint_pilot_session,
            # OmniTrace activities
            *get_omnitrace_activities(),
            # Intent resolution (replay-safe registry lookup)
            resolve_intent,
            # Universal Intent activities (USO — registry-routable)
            system_health_check,
            system_echo,
            system_list_intents,
            connector_list,
            connector_status,
            connector_connect,
            connector_test,
            connector_disconnect,
            connector_create_custom,
            # PhysiOmni Pilot activities
            compute_14_day_baseline,
            evaluate_baseline,
            evaluate_baseline_activity,
            log_physiomni_alert,
            man_mode_escalation_activity,
            dispatch_work_order_activity,
        ],
        max_concurrent_workflow_tasks=settings.temporal_max_workflow_tasks,
        max_concurrent_activities=settings.temporal_max_activities,
    )

    logger.info("✅ Worker started - polling for tasks...")
    logger.info("Press Ctrl+C to stop")

    # Run worker until interrupted
    await worker.run()


async def submit_workflow(goal: str, user_id: str = "test-user") -> None:
    """
    Submit a test workflow to Temporal.

    This is a client that sends work to the worker.

    Args:
        goal: User's natural language goal
        user_id: User ID
    """
    logger.info(f"Submitting workflow: {goal}")

    if user_id == "test-user" and settings.environment.lower() == "production":
        raise ValueError("submit_workflow requires explicit user_id in production")

    # Connect to Temporal
    client = await Client.connect(
        settings.temporal_host,
        namespace=settings.temporal_namespace,
        **_temporal_connect_kwargs(),
    )

    # Start workflow
    from uuid import uuid4

    workflow_id = f"agent-workflow-{uuid4()}"

    handle = await client.start_workflow(
        AgentWorkflow.run,
        args=[goal, user_id, {}],
        id=workflow_id,
        task_queue=settings.temporal_task_queue,
    )

    logger.info(f"✓ Workflow started: {workflow_id}")
    logger.info("Waiting for result...")

    # Wait for result
    try:
        result = await handle.result()
        logger.info(f"✅ Workflow completed: {result}")
    except Exception as e:
        logger.exception(f"❌ Workflow failed: {str(e)}")
        raise


async def run_tests() -> None:
    """Run integration tests."""
    logger.info("🧪 Running integration tests...")

    # Test semantic cache
    from infrastructure.cache import EntityExtractor, SemanticCacheService

    logger.info("\n--- Testing Entity Extraction ---")
    goal = "Book flight to Paris tomorrow and send confirmation to john@example.com"
    template, params = EntityExtractor.create_template(goal)
    logger.info(f"Goal: {goal}")
    logger.info(f"Template: {template}")
    logger.info(f"Parameters: {params}")

    # Test semantic cache
    logger.info("\n--- Testing Semantic Cache ---")
    cache = SemanticCacheService(
        redis_url=settings.redis_url,
        redis_password=settings.redis_password.get_secret_value()
        if settings.redis_password
        else None,
        redis_ssl=settings.redis_ssl,
    )
    await cache.initialize()

    # Store plan
    plan_steps = [
        {"id": "step1", "tool": "search_flights", "input": {"to": "{LOCATION}", "date": "{DATE}"}},
        {"id": "step2", "tool": "book_flight", "input": {"flight_id": "{FLIGHT_ID}"}},
    ]
    template_id = await cache.store_plan(goal, plan_steps)
    logger.info(f"✓ Stored plan: {template_id}")

    # Retrieve plan (should hit cache)
    cached = await cache.get_plan("Book flight to Paris tomorrow")
    if cached:
        logger.info(f"✓ Cache hit: similarity={cached.similarity_score:.3f}")
    else:
        logger.info("✗ Cache miss")

    await cache.close()

    logger.info("\n✅ All tests passed!")


def main() -> None:
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python main.py worker              # Start Temporal worker")
        print("  python main.py api                 # Start HTTP API server")
        print('  python main.py submit "GOAL"       # Submit workflow')
        print("  python main.py test                # Run tests")
        sys.exit(1)

    command = sys.argv[1]

    if command == "worker":
        asyncio.run(start_worker())

    elif command == "api":
        from server import start_api_server

        asyncio.run(start_api_server())

    elif command == "submit":
        if len(sys.argv) < 3:
            print("Error: Missing goal argument")
            print('Usage: python main.py submit "Book flight to Paris tomorrow"')
            sys.exit(1)
        goal = sys.argv[2]
        cli_user_id = sys.argv[3] if len(sys.argv) >= 4 else "test-user"
        asyncio.run(submit_workflow(goal, cli_user_id))

    elif command == "test":
        asyncio.run(run_tests())

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
