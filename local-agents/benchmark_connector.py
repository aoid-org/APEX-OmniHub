#!/usr/bin/env python3
"""
Benchmark Script for OmniHub Connector Concurrency
Verifies that rate-limiting backoff is handled asynchronously.

Scenario:
- 50 concurrent requests.
- Each request is rate-limited once with a 1.0s delay.
- Expected duration: ~1.0s (concurrent) vs ~50.0s (sequential).
"""

import asyncio
import logging
import socket
import sys
import time
import uuid

from aiohttp import web

# Add current directory to path so we can import omnihub_connector
sys.path.append(".")
try:
    from omnihub_connector import OmniHubConnector
except ImportError:
    # Try importing assuming we are in local-agents/
    sys.path.append("local-agents")
    from omnihub_connector import OmniHubConnector

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("benchmark")

# Global state for the mock server
requests_seen = set()
RETRY_DELAY = 1.0
CONCURRENCY = 50


async def mock_events_handler(request):
    """
    Mock OmniHub events endpoint.
    Returns 'rate_limited' for the first attempt of each idempotency key,
    then 'ingested' for subsequent attempts.
    """
    try:
        # Read body to consume stream
        await request.json()
        headers = request.headers
        idempotency_key = headers.get('X-Idempotency-Key')

        if not idempotency_key:
            return web.json_response({"error": "Missing Idempotency Key"}, status=400)

        if idempotency_key not in requests_seen:
            requests_seen.add(idempotency_key)
            # Simulate rate limit
            return web.json_response({
                "results": [{
                    "status": "rate_limited",
                    "retry_after_seconds": RETRY_DELAY,
                    "message": "Simulated rate limit"
                }]
            })
        else:
            # Success on retry
            return web.json_response({
                "results": [{
                    "status": "ingested",
                    "id": str(uuid.uuid4())
                }]
            })
    except Exception as e:
        logger.error(f"Server error: {e}")
        return web.json_response({"error": str(e)}, status=500)


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]


async def start_mock_server(port):
    """Starts a local aiohttp server."""
    app = web.Application()
    app.router.add_post('/omnilink-port/events', mock_events_handler)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', port)
    await site.start()
    return runner


async def run_benchmark():
    logger.info("Starting Benchmark...")

    port = find_free_port()
    runner = await start_mock_server(port)
    base_url = f"http://localhost:{port}"
    logger.info(f"Mock server running at {base_url}")

    # Initialize connector
    connector = OmniHubConnector(
        base_url=base_url,
        api_key="mock-key",
        source="benchmark",
        worker_id="bench-worker"
    )

    # We want to measure the time it takes to complete all tasks.
    start_time = time.perf_counter()

    # We create a wrapper to run the emit_event and catch exceptions per task
    async def run_one(i):
        key = f"bench_{uuid.uuid4()}"
        try:
            await connector.emit_event(
                event_type="benchmark_event",
                data={"index": i},
                idempotency_key=key
            )
            return "success"
        except Exception as e:
            logger.error(f"Task {i} failed: {e}")
            return e

    logger.info(
        f"Spawning {CONCURRENCY} concurrent requests. "
        f"Expected delay: {RETRY_DELAY}s per request (once)."
    )

    # Use gather to run concurrently
    task_futures = [run_one(i) for i in range(CONCURRENCY)]
    results = await asyncio.gather(*task_futures)

    end_time = time.perf_counter()
    duration = end_time - start_time

    # Cleanup
    await connector.close()
    await runner.cleanup()

    # Analyze results
    failures = [r for r in results if r != "success"]
    if failures:
        logger.error(f"Encountered {len(failures)} failures.")
        return 1

    logger.info("=" * 40)
    logger.info("BENCHMARK RESULTS")
    logger.info("=" * 40)
    logger.info(f"Requests: {CONCURRENCY}")
    logger.info(f"Retry Delay: {RETRY_DELAY}s")
    logger.info(f"Total Duration: {duration:.4f}s")

    # Evaluation
    # If sequential: 50 * 1s = 50s
    # If concurrent: 1s + overhead (e.g., 1.1s - 2.5s)

    threshold = (RETRY_DELAY * 1.5) + (CONCURRENCY * 0.05)
    # 1.5s + 2.5s overhead = 4.0s max

    if duration < threshold:
        logger.info(
            f"✅ SUCCESS: Duration ({duration:.2f}s) is significantly less than "
            f"sequential time ({CONCURRENCY * RETRY_DELAY}s)."
        )
        logger.info("The implementation correctly handles concurrency.")
        return 0
    else:
        logger.error(
            f"❌ FAILURE: Duration ({duration:.2f}s) suggests sequential blocking or high overhead."
        )
        logger.error(f"Threshold was {threshold:.2f}s")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(run_benchmark()))
    except KeyboardInterrupt:
        pass
