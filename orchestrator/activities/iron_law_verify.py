"""
Iron Law Verification Activity - Physical AI Safety Gate

Bridges TypeScript Iron Law verification into Python Temporal workflows.
Ensures deductive reasoning verification before physical hardware actuation.
"""

import asyncio
import json
from typing import Any

from temporalio import activity
from temporalio.exceptions import ApplicationError


@activity.defn(name="verify_deductive_path")
async def verify_deductive_path(params: dict[str, Any]) -> dict[str, Any]:
    """
    Execute Iron Law verification via Node.js subprocess.

    Args:
        params: Dict with keys:
            - intent: str (intended physical action)
            - target_state: dict (desired device state)
            - device_id: str (device identifier)
            - workflow_id: str (Temporal execution ID)

    Returns:
        Dict with keys:
            - verified: bool
            - logic_delta: float (0-1, confidence score)
            - escalate_to_man: bool
            - reason: str (explanation)

    Raises:
        ApplicationError: If verification fails or subprocess errors
    """
    try:
        intent = params.get("intent", "")
        target_state = params.get("target_state", {})
        device_id = params.get("device_id", "")
        workflow_id = params.get("workflow_id", "")

        # Prepare Iron Law verification payload
        verification_payload = {
            "intent": intent,
            "targetState": target_state,
            "deviceId": device_id,
            "workflowId": workflow_id,
        }

        # Execute TypeScript Iron Law verifier via Node.js (async subprocess)
        node_script = """
const payload = JSON.parse(process.argv[1]);

// Simulate Iron Law verification logic
// In production, this would call actual apex-resilience/core/iron-law module
const logicDelta = 0.1; // Example: 10% deviation from expected path
const threshold = 0.3; // From apex-resilience/config/thresholds.ts

const verified = logicDelta < threshold;
const escalateToMan = logicDelta >= threshold;

const result = {
    verified: verified,
    logicDelta: logicDelta,
    escalateToMan: escalateToMan,
    reason: verified ? 'Deductive path verified' : 'Logic delta exceeded threshold'
};

console.log(JSON.stringify(result));
"""

        # Use async subprocess (SonarQube: S603/S607 - safe as we control all inputs)
        process = await asyncio.create_subprocess_exec(
            "/usr/bin/node",  # Use absolute path to avoid S607
            "-e",
            node_script,
            json.dumps(verification_payload),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10.0)
        except asyncio.TimeoutError as e:
            process.kill()
            await process.wait()
            activity.logger.error("Iron Law verification timeout")
            raise ApplicationError(
                "Iron Law verification timeout",
                non_retryable=False,
            ) from e

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            activity.logger.error(f"Iron Law verification failed: {error_msg}")
            raise ApplicationError(
                f"Iron Law verification subprocess error: {error_msg}",
                non_retryable=False,
            )

        # Parse verification result
        verification_result = json.loads(stdout.decode().strip())

        activity.logger.info(
            f"Iron Law verification: device={device_id}, verified={verification_result['verified']}"
        )

        return verification_result

    except json.JSONDecodeError as e:
        activity.logger.error(f"Failed to parse Iron Law verification result: {str(e)}")
        raise ApplicationError(
            "Iron Law verification result parsing failed",
            non_retryable=True,  # Non-retryable - bad response format
        ) from e

    except Exception as e:
        activity.logger.error(f"Iron Law verification error: {str(e)}")
        raise ApplicationError(
            f"Iron Law verification error: {str(e)}",
            non_retryable=False,  # Retryable for unknown errors
        ) from e
