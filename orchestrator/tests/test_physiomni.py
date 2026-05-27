"""
Unit tests for PhysiOmni Phase 2 intelligence layer & orchestration saga.

Covers:
1. activities/physiomni_activities.py (100% coverage goal)
2. workflows/physiomni_saga.py (100% coverage goal)
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
import pytest
from temporalio.exceptions import ApplicationError

# Import activities in isolation by patching temporal/database boundaries
with patch("temporalio.activity.defn", lambda _name=None, **_kw: lambda f: f):
    with patch("providers.database.factory.get_database_provider") as mock_get_db:
        from activities.physiomni_activities import (
            compute_14_day_baseline,
            evaluate_baseline,
            evaluate_baseline_activity,
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
# TESTS: compute_14_day_baseline
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_compute_14_day_baseline_empty_telemetry():
    """Fallback standard envelopes should be saved when telemetry is empty."""
    db = _make_db_mock()
    # Mock direct client table chain
    client_mock = MagicMock()
    db.client = client_mock

    # Mock existing baselines lookup returns empty data
    existing_resp = MagicMock()
    existing_resp.data = []

    # Mock telemetry lookup returns empty data
    telemetry_resp = MagicMock()
    telemetry_resp.data = []

    def mock_table(table_name):
        table_mock = MagicMock()
        if table_name == "physiomni_telemetry":
            table_mock.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute = MagicMock(
                return_value=telemetry_resp
            )
        elif table_name == "physiomni_baselines":
            table_mock.select.return_value.eq.return_value.execute = MagicMock(
                return_value=existing_resp
            )
        return table_mock

    client_mock.table.side_effect = mock_table

    with patch("activities.physiomni_activities.get_database_provider", return_value=db):
        params = {
            "device_id": str(uuid4()),
            "tenant_id": str(uuid4()),
            "device_serial": "DEV-TEST-100",
            "asset_class": "industrial_pump",
        }
        result = await compute_14_day_baseline(params)
        assert result["success"] is True
        assert result["device_serial"] == "DEV-TEST-100"
        assert result["envelope"]["rms_envelope"]["x"] == pytest.approx(1.2)
        assert result["envelope"]["peak_envelope"]["y"] == pytest.approx(2.5)


@pytest.mark.asyncio
async def test_compute_14_day_baseline_with_records():
    """RMS and Peak envelopes should be computed accurately from telemetry rows."""
    db = _make_db_mock()
    client_mock = MagicMock()
    db.client = client_mock

    # Mock telemetry records
    records = [
        {
            "vibration_x": 1.0,
            "vibration_y": 2.0,
            "vibration_z": 3.0,
            "temperature_c": 40.0,
            "captured_at": "2026-05-26T00:00:00Z",
        },
        {
            "vibration_x": 2.0,
            "vibration_y": -4.0,
            "vibration_z": 6.0,
            "temperature_c": 42.0,
            "captured_at": "2026-05-26T01:00:00Z",
        },
    ]
    telemetry_resp = MagicMock()
    telemetry_resp.data = records

    # Mock existing baseline found
    existing_resp = MagicMock()
    existing_resp.data = [{"id": "baseline-uuid-123"}]

    def mock_table(table_name):
        table_mock = MagicMock()
        if table_name == "physiomni_telemetry":
            table_mock.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute = MagicMock(
                return_value=telemetry_resp
            )
        elif table_name == "physiomni_baselines":
            table_mock.select.return_value.eq.return_value.execute = MagicMock(
                return_value=existing_resp
            )
        return table_mock

    client_mock.table.side_effect = mock_table

    with patch("activities.physiomni_activities.get_database_provider", return_value=db):
        params = {
            "device_id": str(uuid4()),
            "tenant_id": str(uuid4()),
            "device_serial": "DEV-TEST-101",
        }
        result = await compute_14_day_baseline(params)
        assert result["success"] is True
        assert result["envelope"]["sample_count"] == 2
        # Check Root Mean Square formula correctness
        assert result["envelope"]["rms_envelope"]["x"] == pytest.approx(1.5811, abs=1e-4)
        # Peak envelope calculation check
        assert result["envelope"]["peak_envelope"]["y"] == pytest.approx(4.0)


@pytest.mark.asyncio
async def test_compute_14_day_baseline_error():
    """An ApplicationError should be raised on database client failures."""
    db = _make_db_mock()
    client_mock = MagicMock()
    client_mock.table.side_effect = Exception("Database connection failure")
    db.client = client_mock

    with patch("activities.physiomni_activities.get_database_provider", return_value=db):
        with pytest.raises(ApplicationError):
            await compute_14_day_baseline(
                {"device_id": "x", "tenant_id": "y", "device_serial": "z"}
            )


# ---------------------------------------------------------------------------
# TESTS: evaluate_baseline
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_evaluate_baseline_device_not_found():
    """NOMINAL safety bounds returned when device not found."""
    db = _make_db_mock()
    client_mock = MagicMock()
    db.client = client_mock

    dev_resp = MagicMock()
    dev_resp.data = []
    client_mock.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = dev_resp

    with patch("activities.physiomni_activities.get_database_provider", return_value=db):
        payload = {
            "device_serial": "DEV-NOT-HERE",
            "tenant_id": str(uuid4()),
            "vibration_x": 1.0,
            "vibration_y": 1.0,
            "vibration_z": 1.0,
        }
        result = await evaluate_baseline(payload)
        assert result["deviation_exceeded"] is False
        assert "Device registration record not found" in result["reason"]


@pytest.mark.asyncio
async def test_evaluate_baseline_no_baseline_profile():
    """Default limits should be used when baseline profile is missing."""
    db = _make_db_mock()
    client_mock = MagicMock()
    db.client = client_mock

    # Device found
    dev_resp = MagicMock()
    dev_resp.data = [{"id": str(uuid4())}]
    # Baseline empty
    baseline_resp = MagicMock()
    baseline_resp.data = []

    def mock_table(table_name):
        table_mock = MagicMock()
        if table_name == "physiomni_devices":
            table_mock.select.return_value.eq.return_value.eq.return_value.execute = MagicMock(
                return_value=dev_resp
            )
        elif table_name == "physiomni_baselines":
            table_mock.select.return_value.eq.return_value.execute = MagicMock(
                return_value=baseline_resp
            )
        return table_mock

    client_mock.table.side_effect = mock_table

    with patch("activities.physiomni_activities.get_database_provider", return_value=db):
        payload = {
            "device_serial": "DEV-TEST-102",
            "tenant_id": str(uuid4()),
            "vibration_x": 20.0,  # Exceeds default limit (12.0 * 1.5 = 18.0)
            "vibration_y": 1.0,
            "vibration_z": 1.0,
            "anomaly_score": 0.85,
        }
        result = await evaluate_baseline(payload)
        assert result["deviation_exceeded"] is True
        assert result["escalation_required"] is True
        assert result["guardian_confidence"] == pytest.approx(0.85)


@pytest.mark.asyncio
async def test_evaluate_baseline_within_baseline():
    """NOMINAL status should be returned when vibration is within 1.5x of peak envelope."""
    db = _make_db_mock()
    client_mock = MagicMock()
    db.client = client_mock

    dev_resp = MagicMock()
    dev_resp.data = [{"id": str(uuid4())}]

    baseline_resp = MagicMock()
    baseline_resp.data = [{"normal_envelope": {"peak_envelope": {"x": 5.0, "y": 5.0, "z": 5.0}}}]

    def mock_table(table_name):
        table_mock = MagicMock()
        if table_name == "physiomni_devices":
            table_mock.select.return_value.eq.return_value.eq.return_value.execute = MagicMock(
                return_value=dev_resp
            )
        elif table_name == "physiomni_baselines":
            table_mock.select.return_value.eq.return_value.execute = MagicMock(
                return_value=baseline_resp
            )
        return table_mock

    client_mock.table.side_effect = mock_table

    with patch("activities.physiomni_activities.get_database_provider", return_value=db):
        payload = {
            "device_serial": "DEV-TEST-103",
            "tenant_id": str(uuid4()),
            "vibration_x": 7.0,  # Within 7.5 limit (5.0 * 1.5)
            "vibration_y": 2.0,
            "vibration_z": 3.0,
            "anomaly_score": 0.50,
        }
        result = await evaluate_baseline_activity(payload)
        assert result["deviation_exceeded"] is False
        assert result["guardian_confidence"] == pytest.approx(0.96)


@pytest.mark.asyncio
async def test_evaluate_baseline_confidence_bounds():
    """Guardian confidence should scale dynamically with high anomaly scores."""
    db = _make_db_mock()
    client_mock = MagicMock()
    db.client = client_mock

    dev_resp = MagicMock()
    dev_resp.data = [{"id": str(uuid4())}]
    baseline_resp = MagicMock()
    baseline_resp.data = [{"normal_envelope": {"peak_envelope": {"x": 2.0, "y": 2.0, "z": 2.0}}}]

    def mock_table(table_name):
        table_mock = MagicMock()
        if table_name == "physiomni_devices":
            table_mock.select.return_value.eq.return_value.eq.return_value.execute = MagicMock(
                return_value=dev_resp
            )
        elif table_name == "physiomni_baselines":
            table_mock.select.return_value.eq.return_value.execute = MagicMock(
                return_value=baseline_resp
            )
        return table_mock

    client_mock.table.side_effect = mock_table

    with patch("activities.physiomni_activities.get_database_provider", return_value=db):
        payload = {
            "device_serial": "DEV-TEST-104",
            "tenant_id": str(uuid4()),
            "vibration_x": 1.0,
            "vibration_y": 1.0,
            "vibration_z": 1.0,
            "anomaly_score": 0.98,
        }
        result = await evaluate_baseline(payload)
        assert result["guardian_confidence"] == pytest.approx(0.70)


# ---------------------------------------------------------------------------
# TESTS: log_physiomni_alert
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_log_physiomni_alert_success():
    """Alert record should be successfully inserted and returned."""
    db = _make_db_mock()
    client_mock = MagicMock()
    db.client = client_mock

    alert_data = {"id": "alert-uuid-1", "severity": "warning"}
    insert_resp = MagicMock()
    insert_resp.data = [alert_data]
    client_mock.table.return_value.insert.return_value.execute.return_value = insert_resp

    with patch("activities.physiomni_activities.get_database_provider", return_value=db):
        params = {
            "tenant_id": str(uuid4()),
            "device_serial": "DEV-1",
            "message": "Vibration warning limit exceeded",
        }
        result = await log_physiomni_alert(params)
        assert result["id"] == "alert-uuid-1"


# ---------------------------------------------------------------------------
# TESTS: man_mode_escalation_activity
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_man_mode_escalation_activity_success():
    """Structured safety override task should be inserted in public.man_tasks."""
    db = _make_db_mock()
    client_mock = MagicMock()
    db.client = client_mock

    task_data = {"id": "task-uuid-99"}
    insert_resp = MagicMock()
    insert_resp.data = [task_data]
    client_mock.table.return_value.insert.return_value.execute.return_value = insert_resp

    mock_act_info = MagicMock()
    mock_act_info.workflow_id = "wf-test-uuid-99"

    with patch("activities.physiomni_activities.get_database_provider", return_value=db):
        with patch("temporalio.activity.info", return_value=mock_act_info):
            params = {
                "tenant_id": str(uuid4()),
                "device_serial": "DEV-ESCALATE-99",
            }
            result = await man_mode_escalation_activity(params)
            assert result["task_id"] == "task-uuid-99"
            assert result["status"] == "PENDING"


# ---------------------------------------------------------------------------
# TESTS: dispatch_work_order_activity
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_dispatch_work_order_activity_success():
    """Actuation dispatch log should be created in audit_logs."""
    db = _make_db_mock()
    client_mock = MagicMock()
    db.client = client_mock

    audit_data = {"id": "audit-log-uuid-10"}
    insert_resp = MagicMock()
    insert_resp.data = [audit_data]
    client_mock.table.return_value.insert.return_value.execute.return_value = insert_resp

    with patch("activities.physiomni_activities.get_database_provider", return_value=db):
        params = {
            "tenant_id": str(uuid4()),
            "device_serial": "DEV-ACTUATE-10",
        }
        result = await dispatch_work_order_activity(params)
        assert result["status"] == "dispatched"
        assert result["audit_id"] == "audit-log-uuid-10"


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
