import asyncio
import sys
import os
import pytest
from aiohttp import web
from unittest.mock import patch, MagicMock

# Ensure we can import benchmark_connector
sys.path.insert(0, os.path.dirname(__file__))

import benchmark_connector

@pytest.mark.asyncio
async def test_run_benchmark():
    # Running the benchmark covers most of the file (server startup, rate limiting logic, etc.)
    # We can run the benchmark directly.
    result = await benchmark_connector.run_benchmark()
    assert result == 0

@pytest.mark.asyncio
async def test_mock_events_handler_missing_idempotency_key():
    # Directly test the mock handler for missing idempotency key
    class MockRequest:
        def __init__(self, headers, return_json_exc=False):
            self.headers = headers
            self.return_json_exc = return_json_exc
            
        async def json(self):
            if self.return_json_exc:
                raise ValueError("Invalid JSON")
            return {}

    req = MockRequest(headers={})
    response = await benchmark_connector.mock_events_handler(req)
    assert response.status == 400

@pytest.mark.asyncio
async def test_mock_events_handler_server_error():
    # Directly test the mock handler for an internal exception (e.g., json parsing error)
    class MockRequest:
        def __init__(self, headers):
            self.headers = headers
            
        async def json(self):
            raise Exception("Force server error")

    req = MockRequest(headers={"X-Idempotency-Key": "123"})
    response = await benchmark_connector.mock_events_handler(req)
    assert response.status == 500

@pytest.mark.asyncio
async def test_run_one_exception():
    # To cover the task failure path in run_benchmark, we can mock emit_event to raise an exception
    with patch("benchmark_connector.OmniHubConnector") as mock_conn_cls:
        mock_conn = MagicMock()
        # Make emit_event async and raise an exception
        async def mock_emit(*args, **kwargs):
            raise Exception("Simulated emit error")
            
        mock_conn.emit_event = mock_emit
        
        # Async mock for close
        async def mock_close():
            pass
        mock_conn.close = mock_close
        
        mock_conn_cls.return_value = mock_conn
        
        # Reduce concurrency to 1 to speed up test
        original_concurrency = benchmark_connector.CONCURRENCY
        benchmark_connector.CONCURRENCY = 1
        
        try:
            result = await benchmark_connector.run_benchmark()
            # If all tasks fail, run_benchmark returns 1
            assert result == 1
        finally:
            benchmark_connector.CONCURRENCY = original_concurrency

