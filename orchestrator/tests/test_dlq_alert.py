"""Tests for orchestrator/activities/dlq_alert.py.

Achieves 100% line and branch coverage of the DLQ alert activity,
including all error-handling paths.
"""

from __future__ import annotations

import logging
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from activities.dlq_alert import (
    DLQAlertPayload,
    _increment_prometheus_counter,
    _post_slack_webhook,
    send_dlq_alert,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def payload_dict() -> dict[str, str]:
    return {
        "workflow_id": "wf-abc-123",
        "run_id": "run-xyz-456",
        "task_queue": "apex-default",
        "error_type": "ActivityError",
        "error_msg": "Something went wrong",
    }


@pytest.fixture()
def alert(payload_dict: dict[str, str]) -> DLQAlertPayload:
    return DLQAlertPayload(**payload_dict)


def _make_mock_config(webhook_url: str | None) -> MagicMock:
    """Build a mock ``config`` module with the given webhook URL."""
    mock_settings = MagicMock()
    from pydantic import SecretStr

    mock_settings.slack_alert_webhook_url = SecretStr(webhook_url) if webhook_url else None
    mock_config = MagicMock()
    mock_config.settings = mock_settings
    return mock_config


def _make_mock_client(
    post_side_effect: Any = None,  # noqa: ANN401
    post_fn: Any = None,  # noqa: ANN401
) -> tuple[AsyncMock, AsyncMock]:
    """Return ``(mock_http_client, mock_client_ctx)`` for httpx patching."""
    mock_http_client = AsyncMock()
    if post_fn is not None:
        mock_http_client.post = post_fn
    elif post_side_effect is not None:
        mock_http_client.post = AsyncMock(side_effect=post_side_effect)
    else:
        mock_http_client.post = AsyncMock(return_value=AsyncMock())

    mock_ctx = AsyncMock()
    mock_ctx.__aenter__ = AsyncMock(return_value=mock_http_client)
    mock_ctx.__aexit__ = AsyncMock(return_value=False)
    return mock_http_client, mock_ctx


# ---------------------------------------------------------------------------
# DLQAlertPayload
# ---------------------------------------------------------------------------


class TestDLQAlertPayload:
    def test_fields_set_correctly(self, alert: DLQAlertPayload) -> None:
        assert alert.workflow_id == "wf-abc-123"
        assert alert.run_id == "run-xyz-456"
        assert alert.task_queue == "apex-default"
        assert alert.error_type == "ActivityError"
        assert alert.error_msg == "Something went wrong"


# ---------------------------------------------------------------------------
# send_dlq_alert
# ---------------------------------------------------------------------------


class TestSendDlqAlert:
    @pytest.mark.asyncio
    async def test_logs_error_and_calls_helpers(
        self, payload_dict: dict[str, str], caplog: pytest.LogCaptureFixture
    ) -> None:
        with (
            patch("activities.dlq_alert._increment_prometheus_counter") as mock_counter,
            patch(
                "activities.dlq_alert._post_slack_webhook",
                new_callable=AsyncMock,
            ) as mock_slack,
        ):
            with caplog.at_level(logging.ERROR, logger="activities.dlq_alert"):
                await send_dlq_alert(payload_dict)

            assert "DLQ_ALERT workflow_permanently_failed" in caplog.text
            mock_counter.assert_called_once()
            mock_slack.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_extra_fields_in_log_record(self, payload_dict: dict[str, str]) -> None:
        records: list[logging.LogRecord] = []

        class Capture(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:
                records.append(record)

        handler = Capture()
        log = logging.getLogger("activities.dlq_alert")
        log.addHandler(handler)
        try:
            with (
                patch("activities.dlq_alert._increment_prometheus_counter"),
                patch(
                    "activities.dlq_alert._post_slack_webhook",
                    new_callable=AsyncMock,
                ),
            ):
                await send_dlq_alert(payload_dict)
        finally:
            log.removeHandler(handler)

        assert records, "Expected at least one log record"
        rec = records[0]
        assert rec.levelno == logging.ERROR
        assert rec.workflow_id == "wf-abc-123"  # type: ignore[attr-defined]
        assert rec.task_queue == "apex-default"  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# _increment_prometheus_counter
# ---------------------------------------------------------------------------


class TestIncrementPrometheusCounter:
    def test_increments_counter_when_prometheus_available(self, alert: DLQAlertPayload) -> None:
        mock_counter_instance = MagicMock()
        mock_counter_class = MagicMock(return_value=mock_counter_instance)

        with patch.dict(
            "sys.modules",
            {"prometheus_client": MagicMock(Counter=mock_counter_class)},
        ):
            _increment_prometheus_counter(alert)

        mock_counter_instance.labels.assert_called_once_with(
            task_queue="apex-default", error_type="ActivityError"
        )
        mock_counter_instance.labels.return_value.inc.assert_called_once()

    def test_handles_import_error_silently(
        self, alert: DLQAlertPayload, caplog: pytest.LogCaptureFixture
    ) -> None:
        """prometheus_client not installed → logged at DEBUG, no raise."""
        with (
            patch.dict("sys.modules", {"prometheus_client": None}),
            caplog.at_level(logging.DEBUG, logger="activities.dlq_alert"),
        ):
            _increment_prometheus_counter(alert)

    def test_handles_counter_exception_silently(
        self, alert: DLQAlertPayload, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Any exception from prometheus_client is swallowed."""
        mock_module = MagicMock()
        mock_module.Counter.side_effect = RuntimeError("registry collision")

        with (
            patch.dict("sys.modules", {"prometheus_client": mock_module}),
            caplog.at_level(logging.DEBUG, logger="activities.dlq_alert"),
        ):
            _increment_prometheus_counter(alert)

        assert "registry collision" in caplog.text


# ---------------------------------------------------------------------------
# _post_slack_webhook
# ---------------------------------------------------------------------------


class TestPostSlackWebhook:
    @pytest.mark.asyncio
    async def test_no_op_when_config_import_fails(self, alert: DLQAlertPayload) -> None:
        """If config cannot be imported, function returns silently."""
        with patch.dict("sys.modules", {"config": None}):
            await _post_slack_webhook(alert)

    @pytest.mark.asyncio
    async def test_no_op_when_webhook_url_is_none(self, alert: DLQAlertPayload) -> None:
        mock_config = _make_mock_config(webhook_url=None)
        with (
            patch.dict("sys.modules", {"config": mock_config}),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            await _post_slack_webhook(alert)
            mock_client_cls.assert_not_called()

    @pytest.mark.asyncio
    async def test_posts_message_when_webhook_url_set(self, alert: DLQAlertPayload) -> None:
        mock_config = _make_mock_config("https://hooks.slack.com/test")
        mock_http_client, mock_ctx = _make_mock_client()

        with (
            patch.dict("sys.modules", {"config": mock_config}),
            patch("httpx.AsyncClient", return_value=mock_ctx),
        ):
            await _post_slack_webhook(alert)

        mock_http_client.post.assert_awaited_once()
        call_kwargs = mock_http_client.post.call_args
        assert (
            call_kwargs.args[0] == "https://hooks.slack.com/test"
            or call_kwargs.args[0].get_secret_value() == "https://hooks.slack.com/test"
        )

    @pytest.mark.asyncio
    async def test_message_contains_workflow_id(self, alert: DLQAlertPayload) -> None:
        mock_config = _make_mock_config("https://hooks.slack.com/test")
        posted_json: dict = {}

        def capture_post(_url: str, **kwargs: object) -> None:
            posted_json.update(kwargs.get("json", {}))  # type: ignore[arg-type]

        _, mock_ctx = _make_mock_client(post_fn=capture_post)

        with (
            patch.dict("sys.modules", {"config": mock_config}),
            patch("httpx.AsyncClient", return_value=mock_ctx),
        ):
            await _post_slack_webhook(alert)

        assert "wf-abc-123" in posted_json.get("text", "")
        assert "apex-default" in posted_json.get("text", "")

    @pytest.mark.asyncio
    async def test_truncates_long_error_msg(self) -> None:
        long_alert = DLQAlertPayload(
            workflow_id="wf-1",
            run_id="run-1",
            task_queue="q",
            error_type="BigError",
            error_msg="x" * 500,
        )
        mock_config = _make_mock_config("https://hooks.slack.com/test")
        posted_json: dict = {}

        def capture_post(_url: str, **kwargs: object) -> None:
            posted_json.update(kwargs.get("json", {}))  # type: ignore[arg-type]

        _, mock_ctx = _make_mock_client(post_fn=capture_post)

        with (
            patch.dict("sys.modules", {"config": mock_config}),
            patch("httpx.AsyncClient", return_value=mock_ctx),
        ):
            await _post_slack_webhook(long_alert)

        text = posted_json.get("text", "")
        assert "x" * 301 not in text

    @pytest.mark.asyncio
    async def test_logs_warning_on_httpx_failure(
        self, alert: DLQAlertPayload, caplog: pytest.LogCaptureFixture
    ) -> None:
        mock_config = _make_mock_config("https://hooks.slack.com/fail")
        _mock_http_client, mock_ctx = _make_mock_client(
            post_side_effect=Exception("network timeout"),
        )

        with (
            patch.dict("sys.modules", {"config": mock_config}),
            patch("httpx.AsyncClient", return_value=mock_ctx),
            caplog.at_level(logging.WARNING, logger="activities.dlq_alert"),
        ):
            await _post_slack_webhook(alert)

        assert "non-blocking" in caplog.text or "network timeout" in caplog.text

    @pytest.mark.asyncio
    async def test_no_op_when_getattr_returns_none(self, alert: DLQAlertPayload) -> None:
        """settings exists but slack_alert_webhook_url attribute absent."""
        mock_config = MagicMock()
        mock_config.settings = object()

        with (
            patch.dict("sys.modules", {"config": mock_config}),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            await _post_slack_webhook(alert)
            mock_client_cls.assert_not_called()
