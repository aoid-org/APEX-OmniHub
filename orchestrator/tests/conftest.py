"""Pytest configuration and fixtures."""

import asyncio
import os
from collections.abc import AsyncGenerator, Generator

import pytest
import pytest_asyncio

# Set test environment variables
os.environ["ENVIRONMENT"] = "test"
os.environ["LOG_LEVEL"] = "DEBUG"
os.environ["SUPABASE_URL"] = "http://localhost:54321"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-key"
os.environ["SUPABASE_DB_URL"] = "postgresql://postgres:postgres@localhost:54322/postgres"
os.environ["REDIS_URL"] = "redis://localhost:6379"
os.environ.setdefault("UPSTASH_REDIS_URL", "redis://localhost:6379")
# OmniBoard OAuth runs in mock mode under tests; production leaves this false.
os.environ.setdefault("OMNIBOARD_MOCK_OAUTH", "true")


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def reset_db_provider() -> None:
    """Reset database provider singleton before each test to prevent state bleed."""
    try:
        from providers.database.factory import reset_database_provider

        reset_database_provider()
    except ImportError:
        pass


@pytest_asyncio.fixture
async def temporal_env() -> AsyncGenerator:
    """
    Create isolated Temporal test environment.

    This is a local in-memory Temporal server for testing (no Docker required).
    Requires temporalio package - skipped if not installed.
    """
    try:
        from temporalio.testing import WorkflowEnvironment

        async with await WorkflowEnvironment.start_time_skipping() as env:
            yield env
    except ImportError:
        pytest.skip("temporalio not installed - skipping workflow tests")
        yield None
