"""
Unit tests for PhysiOmni Phase 2 intelligence layer & orchestration saga.

Covers:
1. activities/physiomni_activities.py (100% coverage goal)
2. workflows/physiomni_saga.py (100% coverage goal)
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
import pytest

# Import activities in isolation by patching temporal/database boundaries
with patch("temporalio.activity.defn", lambda _name=None, **_kw: lambda f: f):
    with patch("providers.database.factory.get_database_provider") as mock_get_db:
        from activities.physiomni_activities import (
            evaluate_baseline,
            log_physiomni_alert,
            man_mode_escalation_activity,
            dispatch_work_order_activity,
        )

from workflows.physiomni_saga import PhysiOmniAnomalySaga


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------
def _make_db_mock():
    db = MagicMock()
    db.select = AsyncMock(return_value=[])
    db.insert = AsyncMock(return_value={"id": str(uuid4())})
    db.update = AsyncMock(return_value={"id": str(uuid4())})
    db.upsert = AsyncMock(return_value={"id": str(uuid4())})
    return db



# ---------------------------------------------------------------------------
# TESTS: PhysiOmniAnomalySaga Workflow
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_saga_run_nominal():
    """Workflow should return nominal status directly if deviation not exceeded."""
    wf = PhysiOmniAnomalySaga()

    payload = {
        "tenant_id": "tenant-uuid-1",
        "device_serial": "DEV-NOMINAL",
    }

    # Mock evaluate_baseline returns deviation_exceeded=False
    evaluation_result = {"deviation_exceeded": False}

    with patch("workflows.physiomni_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(return_value=evaluation_result)

        result = await wf.run(payload)

        assert result["status"] == "nominal"
        assert "normal" in result["message"].lower()
        mock_wf.execute_activity.assert_called_once()


@pytest.mark.asyncio
async def test_saga_run_high_confidence_direct_actuation():
    """Direct actuation should be triggered when vibration deviates but Guardian confidence is high."""
    wf = PhysiOmniAnomalySaga()

    payload = {
        "tenant_id": "tenant-uuid-1",
        "device_serial": "DEV-HIGH-CONF",
    }

    evaluation_result = {
        "deviation_exceeded": True,
        "guardian_confidence": 0.95,  # 95% is >= 90% threshold
    }

    call_count = 0

    def mock_execute_activity(activity_fn, args, **_kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # First call: evaluate_baseline
            assert activity_fn == evaluate_baseline
            return evaluation_result
        if call_count == 2:
            # Second call: log warning alert
            assert activity_fn == log_physiomni_alert
            assert args[0]["severity"] == "warning"
            return {}
        if call_count == 3:
            # Third call: log physical actuation started critical alert
            assert activity_fn == log_physiomni_alert
            assert args[0]["severity"] == "critical"
            return {}
        if call_count == 4:
            # Fourth call: dispatch work order
            assert activity_fn == dispatch_work_order_activity
            return {"audit_id": "audit-123"}
        return {}

    with patch("workflows.physiomni_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(side_effect=mock_execute_activity)

        result = await wf.run(payload)

        assert result["status"] == "actuated"
        assert result["details"]["audit_id"] == "audit-123"
        assert call_count == 4


@pytest.mark.asyncio
async def test_saga_run_low_confidence_approved_polling():
    """Polled approval loop should authorize actuation if manual override returns APPROVED."""
    wf = PhysiOmniAnomalySaga()

    payload = {
        "tenant_id": "tenant-uuid-1",
        "device_serial": "DEV-LOW-CONF-APP",
    }

    evaluation_result = {
        "deviation_exceeded": True,
        "guardian_confidence": 0.85,  # 85% is < 90% threshold -> requires override
    }

    escalation_result = {"task_id": "man-task-uuid-abc"}

    call_count = 0

    def mock_execute_activity(activity_fn, _args=None, **_kwargs):
        nonlocal call_count
        call_count += 1

        # We can pass activity as string inside workflows like execute_activity("check_man_decision")
        is_string = isinstance(activity_fn, str)

        if call_count == 1:
            assert activity_fn == evaluate_baseline
            return evaluation_result
        if call_count == 2:
            assert activity_fn == log_physiomni_alert
            return {}
        if call_count == 3:
            assert activity_fn == man_mode_escalation_activity
            return escalation_result
        if is_string and activity_fn == "check_man_decision":
            # Polled database decision returns APPROVED on first poll check
            return {"decided": True, "status": "APPROVED"}
        if call_count == 5:
            assert activity_fn == log_physiomni_alert
            return {}
        if call_count == 6:
            assert activity_fn == dispatch_work_order_activity
            return {"audit_id": "audit-456"}
        return {}

    with patch("workflows.physiomni_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(side_effect=mock_execute_activity)
        mock_wf.sleep = AsyncMock()

        result = await wf.run(payload)

        assert result["status"] == "actuated"
        assert result["details"]["audit_id"] == "audit-456"


@pytest.mark.asyncio
async def test_saga_run_low_confidence_rejected_polling():
    """Override rejection should cleanly abort actuation and log critical safety denied alerts."""
    wf = PhysiOmniAnomalySaga()

    payload = {
        "tenant_id": "tenant-uuid-1",
        "device_serial": "DEV-LOW-CONF-REJ",
    }

    evaluation_result = {
        "deviation_exceeded": True,
        "guardian_confidence": 85.0,  # Percentage input support test
    }

    escalation_result = {"task_id": "man-task-uuid-xyz"}

    call_count = 0

    def mock_execute_activity(activity_fn, args=None, **_kwargs):
        nonlocal call_count
        call_count += 1

        is_string = isinstance(activity_fn, str)

        if call_count == 1:
            assert activity_fn == evaluate_baseline
            return evaluation_result
        if call_count == 2:
            assert activity_fn == log_physiomni_alert
            return {}
        if call_count == 3:
            assert activity_fn == man_mode_escalation_activity
            return escalation_result
        if is_string and activity_fn == "check_man_decision":
            # Polled database decision returns REJECTED on first check
            return {"decided": True, "status": "REJECTED"}
        if call_count == 5:
            assert activity_fn == log_physiomni_alert
            assert args[0]["alert_type"] == "safety_override_denied"
            return {}
        return {}

    with patch("workflows.physiomni_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(side_effect=mock_execute_activity)
        mock_wf.sleep = AsyncMock()

        result = await wf.run(payload)

        assert result["status"] == "rejected"
        assert "aborted" in result["message"].lower()


@pytest.mark.asyncio
async def test_saga_signals_approve():
    """Signals for direct override approvals should bypass database check gates."""
    wf = PhysiOmniAnomalySaga()

    payload = {
        "tenant_id": "tenant-uuid-1",
        "device_serial": "DEV-SIGNAL-APP",
    }

    evaluation_result = {"deviation_exceeded": True, "guardian_confidence": 0.80}

    escalation_result = {"task_id": "man-task-uuid-sig"}

    call_count = 0

    def mock_execute_activity(_activity_fn, _args=None, **_kwargs):
        nonlocal call_count
        call_count += 1

        if call_count == 1:
            return evaluation_result
        if call_count == 2:
            return {}
        if call_count == 3:
            return escalation_result
        if call_count == 4:
            # Physical actuation log
            return {}
        if call_count == 5:
            # Dispatch work order
            return {"audit_id": "audit-sig"}
        return {}

    # Trigger Temporal signals directly on workflow instance
    wf.approve_saga()

    with patch("workflows.physiomni_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(side_effect=mock_execute_activity)

        result = await wf.run(payload)

        assert result["status"] == "actuated"
        assert result["details"]["audit_id"] == "audit-sig"


@pytest.mark.asyncio
async def test_saga_signals_reject():
    """Signals for direct override rejections should cleanly abort safety protocols."""
    wf = PhysiOmniAnomalySaga()

    payload = {
        "tenant_id": "tenant-uuid-1",
        "device_serial": "DEV-SIGNAL-REJ",
    }

    evaluation_result = {"deviation_exceeded": True, "guardian_confidence": 0.80}

    escalation_result = {"task_id": "man-task-uuid-sig-rej"}

    call_count = 0

    def mock_execute_activity(_activity_fn, args=None, **_kwargs):
        nonlocal call_count
        call_count += 1

        if call_count == 1:
            return evaluation_result
        if call_count == 2:
            return {}
        if call_count == 3:
            return escalation_result
        if call_count == 4:
            # Critical alert safety denied log
            assert args[0]["alert_type"] == "safety_override_denied"
            return {}
        return {}

    # Trigger Temporal signal for reject directly
    wf.reject_saga()

    with patch("workflows.physiomni_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(side_effect=mock_execute_activity)

        result = await wf.run(payload)

        assert result["status"] == "rejected"
