#!/usr/bin/env python3
"""
APEX-Sales Agent - Local machine script for outbound calling and booking.
Emits telemetry to OmniHub and executes tasks via OmniLink Port.

SECURITY NOTE: This script uses random.random() for SIMULATION ONLY.
The PRNG is used to generate realistic test data distributions (e.g., 70% call
connection rate) for demo purposes. In production, actual call outcomes would come
from real telephony systems. This is NOT used for any cryptographic or security-
sensitive operations (tokens, keys, authentication, etc.).
"""

import os
import sys
import time
import logging
import random
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List

# Import shared connector
from omnihub_connector import OmniHubConnector, TaskWorker, load_env_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ApexSalesAgent:
    """Outbound sales calling agent."""

    def __init__(self, connector: OmniHubConnector):
        self.connector = connector
        self.call_queue: List[Dict[str, Any]] = []

    async def attempt_call(self, lead_id: str, phone: str):
        """
        Attempt an outbound call.

        Args:
            lead_id: Lead identifier
            phone: Phone number to call
        """
        logger.info(f"Attempting call to lead {lead_id} ({phone})")

        await self.connector.emit_event(
            event_type="call_attempted",
            data={
                "lead_id": lead_id,
                "phone": phone,
                "attempted_at": datetime.now(timezone.utc).isoformat(),
            },
            idempotency_key=f"call_attempted_{lead_id}_{int(time.time())}",
        )

        # Simulate connection success rate (70%)
        # SECURITY: random.random() is safe here - only used for test data simulation,
        # NOT for cryptographic or security-sensitive operations. Production would use
        # actual telephony system outcomes instead of this simulated distribution.
        if random.random() < 0.7:  # nosec: simulation only, not security-sensitive
            await self.handle_connected(lead_id, phone)
        else:
            await self.handle_failed(lead_id, phone, "No answer")

    async def handle_connected(self, lead_id: str, phone: str):
        """Handle successful connection."""
        logger.info(f"Call connected to lead {lead_id}")

        await self.connector.emit_event(
            event_type="call_connected",
            data={
                "lead_id": lead_id,
                "phone": phone,
                "connected_at": datetime.now(timezone.utc).isoformat(),
            },
            idempotency_key=f"call_connected_{lead_id}_{int(time.time())}",
        )

        # Simulate booking success rate (40% of connected calls)
        # SECURITY: random.random() is safe here - only used for test data simulation,
        # NOT for cryptographic or security-sensitive operations. Production would use
        # actual booking system outcomes instead of this simulated distribution.
        if random.random() < 0.4:  # nosec: simulation only, not security-sensitive
            await self.book_meeting(lead_id, phone)
        else:
            await self.complete_call(lead_id, "Not interested")

    async def book_meeting(self, lead_id: str, phone: str):
        """Book a meeting."""
        logger.info(f"Meeting booked with lead {lead_id}")

        await self.connector.emit_event(
            event_type="meeting_booked",
            data={
                "lead_id": lead_id,
                "phone": phone,
                "booked_at": datetime.now(timezone.utc).isoformat(),
                "meeting_time": datetime.now(timezone.utc).isoformat(),  # Placeholder
            },
            idempotency_key=f"meeting_booked_{lead_id}_{int(time.time())}",
        )

        await self.complete_call(lead_id, "Meeting booked")

    async def complete_call(self, lead_id: str, outcome: str):
        """Mark call as completed."""
        logger.info(f"Call completed for lead {lead_id}: {outcome}")

        await self.connector.emit_event(
            event_type="call_completed",
            data={
                "lead_id": lead_id,
                "outcome": outcome,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            },
            idempotency_key=f"call_completed_{lead_id}_{int(time.time())}",
        )

    async def handle_failed(self, lead_id: str, phone: str, reason: str):
        """Handle failed call."""
        logger.warning(f"Call failed for lead {lead_id}: {reason}")

        await self.connector.emit_event(
            event_type="error",
            data={
                "lead_id": lead_id,
                "phone": phone,
                "reason": reason,
                "error_type": "call_failed",
                "failed_at": datetime.now(timezone.utc).isoformat(),
            },
            idempotency_key=f"call_failed_{lead_id}_{int(time.time())}",
        )

    async def simulate_outbound_session(self, count: int = 10):
        """Simulate outbound calling session."""
        logger.info(f"Simulating outbound session with {count} calls")
        tasks = []

        for i in range(count):
            lead_id = f"lead_sales_{int(time.time())}_{i}"
            phone = f"+1555000{i:04d}"

            # Create background task for each call workflow
            tasks.append(asyncio.create_task(self.attempt_call(lead_id, phone)))
            await asyncio.sleep(0.2)  # Small delay between starting calls

        # Wait for all calls to complete
        if tasks:
            await asyncio.gather(*tasks)


# Task handlers
async def handle_echo(task: Dict[str, Any]) -> Dict[str, Any]:
    """Echo task handler."""
    params = task.get('params', {})
    payload = params.get('payload', {})
    logger.info(f"Echo task: {payload}")
    return {
        "action": "echo",
        "payload": payload,
        "message": "Echo successful",
    }


async def handle_call_lead(task: Dict[str, Any]) -> Dict[str, Any]:
    """Call lead task handler."""
    params = task.get('params', {})
    payload = params.get('payload', {})
    lead_id = payload.get('lead_id', 'unknown')
    phone = payload.get('phone', '+15550000000')

    logger.info(f"Calling lead {lead_id} at {phone}")

    # In real implementation, this would initiate an actual call
    # For demo, we just simulate the telemetry
    return {
        "action": "call_lead",
        "lead_id": lead_id,
        "phone": phone,
        "message": "Call initiated successfully",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def main():
    """Main entry point for APEX-Sales agent."""
    print("APEX-Sales Agent - OmniHub Integration")
    print("=" * 50)

    # Load config from environment
    try:
        config = load_env_config()
    except ValueError as e:
        print(f"Configuration error: {e}")
        print("\nRequired environment variables:")
        print("  OMNIHUB_BASE_URL - OmniHub base URL")
        print("  OMNIHUB_API_KEY - OmniLink API key")
        print("  OMNIHUB_SOURCE - Source identifier (should be 'apex-sales')")
        print("  OMNIHUB_WORKER_ID - Unique worker identifier")
        sys.exit(1)

    # Initialize connector
    connector = OmniHubConnector(
        base_url=config['OMNIHUB_BASE_URL'],
        api_key=config['OMNIHUB_API_KEY'],
        source=config['OMNIHUB_SOURCE'],
        worker_id=config['OMNIHUB_WORKER_ID'],
        target='apex-sales',  # Only claim tasks targeted to apex-sales
    )

    # Initialize agent
    agent = ApexSalesAgent(connector)

    # Run mode selection
    mode = os.getenv('APEX_SALES_MODE', 'simulate')

    try:
        if mode == 'simulate':
            print("\nMode: SIMULATE - Running one-time outbound session simulation")
            await agent.simulate_outbound_session(count=10)
            print("\nSimulation complete. Check OmniDash at /omnidash/local-agents")

        elif mode == 'worker':
            print("\nMode: WORKER - Starting task worker loop")
            print("Press Ctrl+C to stop")

            # Register task handlers
            handlers = {
                'echo': handle_echo,
                'call_lead': handle_call_lead,
            }

            worker = TaskWorker(connector, handlers)
            await worker.run(poll_interval=5)

        elif mode == 'hybrid':
            print("\nMode: HYBRID - Running simulation + worker loop")

            # Start simulation task
            sim_task = asyncio.create_task(agent.simulate_outbound_session(count=10))

            print("\nStarting task worker loop (press Ctrl+C to stop)")
            handlers = {
                'echo': handle_echo,
                'call_lead': handle_call_lead,
            }

            worker = TaskWorker(connector, handlers)

            # Run worker loop
            worker_task = asyncio.create_task(worker.run(poll_interval=5, max_iterations=12))

            # Wait for both (or just worker if simulation ends early)
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
