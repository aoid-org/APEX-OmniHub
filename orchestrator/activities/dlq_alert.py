"""Dead-Letter Queue alert activity for APEX OmniHub.

Fires when a Temporal workflow exhausts its retry budget and fails
permanently. Emits a structured ERROR log (captured by any aggregator),
increments a Prometheus counter, and optionally posts a Slack webhook
message when SLACK_ALERT_WEBHOOK_URL is configured.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx
from temporalio import activity

logger = logging.getLogger(__name__)


@dataclass
class DLQAlertPayload:
    """Structured payload for a permanently failed workflow alert."""

    workflow_id: str
    run_id: str
    task_queue: str
    error_type: str
    error_msg: str


@activity.defn(name="send_dlq_alert")
async def send_dlq_alert(payload: dict[str, str]) -> None:
    """Emit a DLQ alert for a permanently failed Temporal workflow.

    Guarantees:
    - Always logs at ERROR level (observable by any log aggregator).
    - Never raises — DLQ alert failure must not shadow the original
      error.
    - Slack webhook is best-effort; failure is logged at WARNING.

    Args:
        payload: Dict with keys workflow_id, run_id, task_queue,
                 error_type, error_msg.
    """
    alert = DLQAlertPayload(**payload)

    logger.error(
        "DLQ_ALERT workflow_permanently_failed",
        extra={
            "workflow_id": alert.workflow_id,
            "run_id": alert.run_id,
            "task_queue": alert.task_queue,
            "error_type": alert.error_type,
            "error_msg": alert.error_msg,
        },
    )

    _increment_prometheus_counter(alert)
    await _post_slack_webhook(alert)


def _increment_prometheus_counter(alert: DLQAlertPayload) -> None:
    """Increment the DLQ alert Prometheus counter (best-effort)."""
    try:
        from prometheus_client import Counter  # type: ignore

        counter = Counter(
            "apex_dlq_alerts_total",
            "Total permanently failed workflows routed to DLQ",
            ["task_queue", "error_type"],
        )
        counter.labels(
            task_queue=alert.task_queue,
            error_type=alert.error_type,
        ).inc()
    except Exception as exc:  # noqa: BLE001
        logger.debug("Prometheus counter increment failed: %s", exc)


async def _post_slack_webhook(alert: DLQAlertPayload) -> None:
    """Post a Slack alert message (best-effort, no-op if unconfigured)."""
    try:
        from config import settings  # type: ignore

        webhook_url: str | None = getattr(settings, "slack_alert_webhook_url", None)
    except Exception:  # noqa: BLE001
        return

    if not webhook_url:
        return

    message = (
        ":red_circle: *APEX DLQ ALERT*\n"
        f"Workflow `{alert.workflow_id}` permanently failed.\n"
        f"Queue: `{alert.task_queue}` | "
        f"Error: `{alert.error_type}`\n"
        f"```{alert.error_msg[:300]}```"
    )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(webhook_url, json={"text": message})
    except Exception as exc:  # noqa: BLE001
        logger.warning("DLQ Slack webhook failed (non-blocking): %s", exc)
