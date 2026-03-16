from omnilink.scopes import (
    allow_adapter,
    allow_workflow,
    enforce_env_allowlist,
    evaluate_scope,
    match_permission,
)


def test_match_permission():
    assert match_permission(["events:write"], "events:write")
    assert match_permission(["events:*"], "events:write")
    assert match_permission(["*"], "commands.calendar.create")
    assert not match_permission(["events:write"], "commands.calendar.create")


def test_enforce_env_allowlist_empty_allowlist():
    """Line 31: empty allowlist always returns True."""
    assert enforce_env_allowlist("app://vendor/app/dev", []) is True


def test_allow_adapter_empty_allowlist():
    """Line 38: empty allowlist always returns True."""
    assert allow_adapter({"system": "any"}, []) is True


def test_allow_workflow_empty_allowlist():
    """Line 45: empty allowlist always returns True."""
    assert allow_workflow({"name": "anything"}, []) is True


def test_allow_workflow_no_name():
    """Line 50: workflow dict with no 'name' key returns False."""
    assert allow_workflow({"version": "1.0"}, [{"name": "sync"}]) is False


def test_allow_adapter_and_workflow():
    assert allow_adapter({"system": "webhook"}, ["webhook"])
    assert not allow_adapter({"system": "calendar"}, ["webhook"])

    assert allow_workflow({"name": "sync", "version": "1.0.0"}, [{"name": "sync"}])
    assert not allow_workflow(
        {"name": "sync", "version": "1.0.0"},
        [{"name": "sync", "version": "2.0.0"}],
    )


def test_evaluate_scope():
    scopes = {
        "permissions": ["events:write", "orchestrations:request", "commands:calendar.create"],
        "constraints": {
            "env_allowlist": ["prod"],
            "allowed_adapters": ["calendar"],
            "allowed_workflows": [{"name": "sync"}],
        },
    }

    ok, reason = evaluate_scope(
        scopes,
        "event",
        {"type": "event.created", "source": "app://vendor/app/prod"},
    )
    assert ok is True
    assert reason == "ok"

    ok, reason = evaluate_scope(
        scopes,
        "command",
        {
            "type": "calendar.create",
            "source": "app://vendor/app/prod",
            "target": {"system": "calendar"},
        },
    )
    assert ok is True

    ok, reason = evaluate_scope(
        scopes,
        "workflow",
        {
            "type": "workflow.run.requested",
            "source": "app://vendor/app/prod",
            "workflow": {"name": "sync"},
        },
    )
    assert ok is True

    ok, reason = evaluate_scope(
        scopes,
        "workflow",
        {
            "type": "workflow.run.requested",
            "source": "app://vendor/app/dev",
            "workflow": {"name": "sync"},
        },
    )
    assert ok is False
    assert reason == "env_not_allowed"


def test_evaluate_scope_permission_denied():
    """Line 80: missing permission returns permission_denied."""
    scopes = {
        "permissions": [],  # No permissions granted
        "constraints": {},
    }
    ok, reason = evaluate_scope(scopes, "event", {"source": "app://env/prod"})
    assert ok is False
    assert reason == "permission_denied"


def test_evaluate_scope_adapter_not_allowed():
    """Line 90: command with disallowed adapter returns adapter_not_allowed."""
    scopes = {
        "permissions": ["commands:send.email"],
        "constraints": {
            "env_allowlist": ["prod"],
            "allowed_adapters": ["email"],
        },
    }
    ok, reason = evaluate_scope(
        scopes,
        "command",
        {
            "type": "send.email",
            "source": "app://env/prod",
            "target": {"system": "sms"},  # 'sms' not in allowed_adapters
        },
    )
    assert ok is False
    assert reason == "adapter_not_allowed"


def test_evaluate_scope_workflow_not_allowed():
    """Line 96: workflow not in allowlist returns workflow_not_allowed."""
    scopes = {
        "permissions": ["orchestrations:request"],
        "constraints": {
            "env_allowlist": ["prod"],
            "allowed_workflows": [{"name": "sync"}],
        },
    }
    ok, reason = evaluate_scope(
        scopes,
        "workflow",
        {
            "source": "app://env/prod",
            "workflow": {"name": "unknown_workflow"},
        },
    )
    assert ok is False
    assert reason == "workflow_not_allowed"
