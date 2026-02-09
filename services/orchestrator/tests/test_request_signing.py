"""
Unit tests for request signing validation.
"""

import pytest
from fastapi import Request, Response
from unittest.mock import AsyncMock, MagicMock
from services.orchestrator.security.request_signing import dispatch


@pytest.mark.asyncio
async def test_dispatch_prompts_signing_for_signed_paths():
    """Test that requests to signed paths are processed."""
    request = MagicMock(spec=Request)
    request.method = "POST"
    request.url.path = "/api/v1/goals"

    call_next = AsyncMock(return_value=Response(status_code=200))

    response = await dispatch(request, call_next)

    assert response.status_code == 200
    call_next.assert_called_once()


@pytest.mark.asyncio
async def test_dispatch_skips_signing_for_unsigned_paths():
    """Test that requests to unsigned paths are passed through."""
    request = MagicMock(spec=Request)
    request.method = "GET"  # Not POST
    request.url.path = "/health"

    call_next = AsyncMock(return_value=Response(status_code=200))

    response = await dispatch(request, call_next)

    assert response.status_code == 200
    call_next.assert_called_once()
