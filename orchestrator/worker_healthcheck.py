"""Container health check for the Temporal worker runtime."""

import asyncio
import os

from temporalio.client import Client


async def check_worker_dependencies() -> None:
    """Fail unless the worker can reach the configured Temporal namespace."""
    client = await Client.connect(
        os.getenv("TEMPORAL_HOST", "temporal:7233"),
        namespace=os.getenv("TEMPORAL_NAMESPACE", "default"),
    )
    healthy = await client.service_client.check_health()
    if not healthy:
        raise RuntimeError("Temporal service reported unhealthy")


def main() -> int:
    try:
        asyncio.run(check_worker_dependencies())
    except Exception as exc:
        print(f"worker health check failed: {type(exc).__name__}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
