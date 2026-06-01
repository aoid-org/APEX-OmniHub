"""Regression tests for tenant scoping on service-role database tools."""

import pytest

from activities.tools import _tenant_scoped_filters, _tenant_scoped_record
from providers.database.base import DatabaseError


ATTACKER_ID = "00000000-0000-0000-0000-000000000001"
VICTIM_ID = "00000000-0000-0000-0000-000000000002"


def test_workflow_search_injects_actor_user_scope() -> None:
    filters = _tenant_scoped_filters(
        "workflows",
        {},
        {"actor_user_id": ATTACKER_ID},
    )

    assert filters == {"user_id": ATTACKER_ID}


def test_workflow_search_overrides_plan_supplied_victim_scope() -> None:
    filters = _tenant_scoped_filters(
        "workflow_runs",
        {"user_id": VICTIM_ID, "status": "pending"},
        {"actor_user_id": ATTACKER_ID},
    )

    assert filters == {"user_id": ATTACKER_ID, "status": "pending"}


def test_workflow_create_overrides_plan_supplied_victim_user_id() -> None:
    record = _tenant_scoped_record(
        "workflows",
        {"user_id": VICTIM_ID, "name": "malicious", "definition": {}},
        {"actor_user_id": ATTACKER_ID},
    )

    assert record["user_id"] == ATTACKER_ID
    assert record["name"] == "malicious"


def test_tenant_scoped_table_requires_trusted_actor_scope() -> None:
    with pytest.raises(DatabaseError, match="requires trusted actor user scope"):
        _tenant_scoped_filters("workflows", {}, {})


def test_unscoped_tables_preserve_existing_filters() -> None:
    filters = _tenant_scoped_filters("audit_logs", {"user_id": VICTIM_ID}, {})

    assert filters == {"user_id": VICTIM_ID}
