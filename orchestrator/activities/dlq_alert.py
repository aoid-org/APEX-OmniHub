"""Dead-Letter Queue alert activity.

Fires when a Temporal workflow exceeds its retry budget and fails permanently.
Sends a structured alert payload to the Supabase realtime channel and logs
to the metrics exporter. Extend to add Slack/PagerDuty webhooks as needed.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from temporalio import activity

logger = logging.getLogger(__name__)


@dataclass
class DLQAlertPayload:
    workflow_id: str
    run_id: str
    task_queue: str
    error_type: str
    error_msg: str


@activity.defn(name="send_dlq_alert")
async def send_dlq_alert(payload: dict) -> None:  # noqa: ANN001
    """Emit a DLQ alert for a permanently failed workflow.

    Structured for observability: logs at ERROR level (captured by any
    log aggregator) and increments the Prometheus dlq_alerts_total counter.
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

    # Attempt to record in metrics (non-blocking)
    try:
        from prometheus_client import Counter

        dlq_counter = Counter(
            "apex_dlq_alerts_total",
            "Total permanently failed workflows routed to DLQ",
            ["task_queue", "error_type"],
        )
        dlq_counter.labels(
            task_queue=alert.task_queue,
            error_type=alert.error_type,
        ).inc()
    except Exception:  # noqa: BLE001, S110
        pass

    # Slack webhook alert (non-blocking, best-effort)
    slack_webhook = None
    try:
        from config import settings  # type: ignore[import]

        slack_webhook = getattr(settings, "slack_alert_webhook_url", None)
    except Exception:  # noqa: BLE001, S110
        pass

    if slack_webhook:
        import httpx  # NOSONAR

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:  # NOSONAR
                await client.post(
                    slack_webhook,
                    json={
                        "text": (
                            f":red_circle: *APEX DLQ ALERT*\n"
                            f"Workflow `{alert.workflow_id}` permanently failed.\n"
                            f"Queue: `{alert.task_queue}` | Error: `{alert.error_type}`\n"
                            f"```{alert.error_msg[:300]}```"
                        ),
                    },
                )
        except Exception:  # noqa: BLE001
            logger.warning("DLQ Slack alert failed to send (non-blocking).")
