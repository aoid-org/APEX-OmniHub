#!/usr/bin/env python3
"""
Lead-Gen Agent - Local machine script for lead ingestion and qualification.
Emits telemetry to OmniHub and executes tasks via OmniLink Port.
"""

import os
import sys
import time
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List

# Import shared connector
from omnihub_connector import OmniHubConnector, TaskWorker, load_env_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class LeadGenAgent:
    """Lead generation and qualification agent."""

    def __init__(self, connector: OmniHubConnector):
        self.connector = connector
        self.qualified_queue: List[Dict[str, Any]] = []

    async def ingest_lead(self, lead_id: str, url: str, role: str, score: float):
        """
        Ingest a new lead and emit telemetry.

        Args:
            lead_id: Unique lead identifier
            url: Lead URL
            role: Business role (e.g., "HVAC owner")
            score: Lead score (0.0-1.0)
        """
        logger.info(f"Ingesting lead {lead_id}: {url} (role={role}, score={score:.2f})")

        await self.connector.emit_event(
            event_type="lead_ingested",
            data={
                "lead_id": lead_id,
                "url": url,
                "role": role,
                "score": score,
                "ingested_at": datetime.now(timezone.utc).isoformat(),
            },
            idempotency_key=f"lead_ingested_{lead_id}",
        )

        # Qualify if score above threshold
        if score >= 0.7:
            await self.qualify_lead(lead_id, url, role, score)

    async def qualify_lead(self, lead_id: str, url: str, role: str, score: float):
        """Mark lead as qualified and add to queue."""
        logger.info(f"Qualifying lead {lead_id} (score={score:.2f})")

        await self.connector.emit_event(
            event_type="lead_qualified",
            data={
                "lead_id": lead_id,
                "url": url,
                "role": role,
                "score": score,
                "qualified_at": datetime.now(timezone.utc).isoformat(),
            },
            idempotency_key=f"lead_qualified_{lead_id}",
        )

        self.qualified_queue.append({
            "lead_id": lead_id,
            "url": url,
            "role": role,
            "score": score,
        })

    async def seed_queue(self):
        """Emit queue seeding event with current queue size."""
        queue_size = len(self.qualified_queue)
        logger.info(f"Seeding queue with {queue_size} qualified leads")

        await self.connector.emit_event(
            event_type="queue_seeded",
            data={
                "queue_size": queue_size,
                "qualified_leads": self.qualified_queue,
                "seeded_at": datetime.now(timezone.utc).isoformat(),
            },
            idempotency_key=f"queue_seeded_{int(time.time())}",
        )

    async def simulate_ingestion(self, count: int = 14):
        """Simulate lead ingestion for demo purposes."""
        logger.info(f"Simulating ingestion of {count} leads")

        # Sample lead data
        roles = ["HVAC owner", "Plumber", "Electrician", "Contractor", "Roofer"]
        urls = [f"https://example{i}.com" for i in range(count)]

        tasks = []
        for i in range(count):
            lead_id = f"lead_{int(time.time())}_{i}"
            url = urls[i]
            role = roles[i % len(roles)]
            score = 0.5 + (i % 5) * 0.1  # Scores from 0.5 to 0.9

            tasks.append(asyncio.create_task(self.ingest_lead(lead_id, url, role, score)))
            await asyncio.sleep(0.1)  # Small delay to avoid overwhelming

        # Wait for all ingestion tasks
        if tasks:
            await asyncio.gather(*tasks)

        await self.seed_queue()


# Task handlers
def handle_echo(task: Dict[str, Any]) -> Dict[str, Any]:
    """Echo task handler - returns the payload."""
    params = task.get('params', {})
    payload = params.get('payload', {})
    logger.info(f"Echo task: {payload}")
    return {
        "action": "echo",
        "payload": payload,
        "message": "Echo successful",
    }


def handle_refresh_queue(task: Dict[str, Any]) -> Dict[str, Any]:
    """Refresh queue task handler - simulates queue refresh."""
    logger.info("Refreshing lead queue")
    # In real implementation, this would refresh from actual data source
    return {
        "action": "refresh_queue",
        "message": "Queue refreshed successfully",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def main():
    """Main entry point for Lead-Gen agent."""
    print("Lead-Gen Agent - OmniHub Integration")
    print("=" * 50)

    # Load config from environment
    try:
        config = load_env_config()
    except ValueError as e:
        print(f"Configuration error: {e}")
        print("\nRequired environment variables:")
        print("  OMNIHUB_BASE_URL - OmniHub base URL")
        print("  OMNIHUB_API_KEY - OmniLink API key")
        print("  OMNIHUB_SOURCE - Source identifier (should be 'lead-gen')")
        print("  OMNIHUB_WORKER_ID - Unique worker identifier")
        sys.exit(1)

    # Initialize connector
    connector = OmniHubConnector(
        base_url=config['OMNIHUB_BASE_URL'],
        api_key=config['OMNIHUB_API_KEY'],
        source=config['OMNIHUB_SOURCE'],
        worker_id=config['OMNIHUB_WORKER_ID'],
        target='lead-gen',  # Only claim tasks targeted to lead-gen
    )

    # Initialize agent
    agent = LeadGenAgent(connector)

    # Run mode selection
    mode = os.getenv('LEAD_GEN_MODE', 'simulate')

    try:
        if mode == 'simulate':
            print("\nMode: SIMULATE - Running one-time ingestion simulation")
            await agent.simulate_ingestion(count=14)
            print("\nSimulation complete. Check OmniDash at /omnidash/local-agents")

        elif mode == 'worker':
            print("\nMode: WORKER - Starting task worker loop")
            print("Press Ctrl+C to stop")

            # Register task handlers
            handlers = {
                'echo': handle_echo,
                'refresh_queue': handle_refresh_queue,
            }

            worker = TaskWorker(connector, handlers)
            await worker.run(poll_interval=5)

        elif mode == 'hybrid':
            print("\nMode: HYBRID - Running simulation + worker loop")

            sim_task = asyncio.create_task(agent.simulate_ingestion(count=14))

            print("\nStarting task worker loop (press Ctrl+C to stop)")
            handlers = {
                'echo': handle_echo,
                'refresh_queue': handle_refresh_queue,
            }

            worker = TaskWorker(connector, handlers)

            worker_task = asyncio.create_task(worker.run(poll_interval=5, max_iterations=12))

            await asyncio.gather(sim_task, worker_task)

        else:
            print(f"Unknown mode: {mode}")
            print("Valid modes: simulate, worker, hybrid")
            sys.exit(1)

    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        await connector.close()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
