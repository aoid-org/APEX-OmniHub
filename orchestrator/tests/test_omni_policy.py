"""Tests for OmniPolicy evaluation — cached, deterministic policy enforcement."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from security.omni_policy import (
    OmniPolicyEvaluator,
    PolicyRecord,
    _hash_ctx,
    evaluate_policy,
)


def _make_policy(
    name: str = "test_policy",
    version: int = 1,
    priority: int = 10,
    match: dict | None = None,
    decision: str = "DENY",
    lane: str = "RED",
    reason: str = "Test reason",
) -> PolicyRecord:
    return PolicyRecord(
        name=name,
        version=version,
        priority=priority,
        match=match if match is not None else {},
        decision=decision,
        lane=lane,
        reason=reason,
    )


class TestPolicyRecord:
    """Tests for the PolicyRecord dataclass."""

    def test_policy_record_is_frozen(self):
        record = _make_policy()
        with pytest.raises((AttributeError, TypeError)):
            record.name = "new_name"  # type: ignore[misc]

    def test_policy_record_fields(self):
        record = _make_policy(name="p1", version=2, priority=5)
        assert record.name == "p1"
        assert record.version == 2
        assert record.priority == 5


class TestOmniPolicyEvaluatorGetPolicies:
    """Tests for the _get_policies caching logic."""

    @pytest.mark.asyncio
    async def test_get_policies_loads_on_first_call(self):
        loader = AsyncMock(
            return_value=[
                {
                    "name": "p1",
                    "version": 1,
                    "priority": 10,
                    "match": {},
                    "decision": "DENY",
                    "lane": "RED",
                    "reason": "r",
                }
            ]
        )
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60, loader=loader)
        policies = await evaluator._get_policies()
        assert len(policies) == 1
        assert policies[0].name == "p1"
        loader.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_policies_uses_cache_on_second_call(self):
        loader = AsyncMock(
            return_value=[
                {
                    "name": "p1",
                    "version": 1,
                    "priority": 10,
                    "match": {},
                    "decision": "DENY",
                    "lane": "RED",
                    "reason": "r",
                }
            ]
        )
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60, loader=loader)
        await evaluator._get_policies()
        await evaluator._get_policies()
        # Loader should only be called once due to caching
        assert loader.await_count == 1

    @pytest.mark.asyncio
    async def test_get_policies_refreshes_after_ttl(self):
        import time

        loader = AsyncMock(
            return_value=[
                {
                    "name": "p1",
                    "version": 1,
                    "priority": 10,
                    "match": {},
                    "decision": "DENY",
                    "lane": "RED",
                    "reason": "r",
                }
            ]
        )
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=1, loader=loader)
        await evaluator._get_policies()
        # Force TTL expiry by setting expires_at in the past
        evaluator._cache_expires_at = time.monotonic() - 1
        await evaluator._get_policies()
        assert loader.await_count == 2

    @pytest.mark.asyncio
    async def test_get_policies_sorts_by_priority_then_name_then_version_desc(self):
        loader = AsyncMock(
            return_value=[
                {
                    "name": "b_policy",
                    "version": 1,
                    "priority": 5,
                    "match": {},
                    "decision": "ALLOW",
                    "lane": "GREEN",
                    "reason": "r",
                },
                {
                    "name": "a_policy",
                    "version": 2,
                    "priority": 5,
                    "match": {},
                    "decision": "ALLOW",
                    "lane": "GREEN",
                    "reason": "r",
                },
                {
                    "name": "c_policy",
                    "version": 1,
                    "priority": 1,
                    "match": {},
                    "decision": "DENY",
                    "lane": "RED",
                    "reason": "r",
                },
            ]
        )
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60, loader=loader)
        policies = await evaluator._get_policies()
        # c_policy (priority=1) should come first, then a_policy (priority=5, name=a < b)
        assert policies[0].name == "c_policy"
        assert policies[1].name == "a_policy"
        assert policies[2].name == "b_policy"

    @pytest.mark.asyncio
    async def test_get_policies_applies_defaults_for_missing_fields(self):
        loader = AsyncMock(
            return_value=[
                {
                    "name": "minimal",
                    # Missing version, priority, match, decision, lane, reason
                }
            ]
        )
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60, loader=loader)
        policies = await evaluator._get_policies()
        assert len(policies) == 1
        record = policies[0]
        assert record.version == 1
        assert record.priority == 100
        assert record.match == {}
        assert record.decision == "ALLOW"
        assert record.lane == "GREEN"
        assert record.reason == "No reason provided"

    @pytest.mark.asyncio
    async def test_get_policies_normalizes_decision_to_uppercase(self):
        loader = AsyncMock(
            return_value=[
                {
                    "name": "p",
                    "version": 1,
                    "priority": 10,
                    "match": {},
                    "decision": "deny",
                    "lane": "red",
                    "reason": "r",
                }
            ]
        )
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60, loader=loader)
        policies = await evaluator._get_policies()
        assert policies[0].decision == "DENY"
        assert policies[0].lane == "RED"


class TestOmniPolicyEvaluatorMatches:
    """Tests for _matches static method."""

    def test_matches_empty_match_dict_returns_true(self):
        policy = _make_policy(match={})
        assert OmniPolicyEvaluator._matches(policy, {"tool": "read", "action": "get"}) is True

    def test_matches_tool_in_list(self):
        policy = _make_policy(match={"tool_in": ["read", "write"]})
        assert OmniPolicyEvaluator._matches(policy, {"tool": "read"}) is True
        assert OmniPolicyEvaluator._matches(policy, {"tool": "delete"}) is False

    def test_matches_is_case_insensitive(self):
        policy = _make_policy(match={"tool_in": ["READ"]})
        assert OmniPolicyEvaluator._matches(policy, {"tool": "read"}) is True

    def test_matches_multiple_fields_all_must_match(self):
        policy = _make_policy(match={"tool_in": ["read"], "action_in": ["get"]})
        assert OmniPolicyEvaluator._matches(policy, {"tool": "read", "action": "get"}) is True
        assert OmniPolicyEvaluator._matches(policy, {"tool": "read", "action": "post"}) is False

    def test_matches_missing_field_in_ctx_acts_as_empty_string(self):
        policy = _make_policy(match={"tool_in": [""]})
        # ctx missing "tool" key, so ctx.get("tool", "") == "", which is in [""]
        assert OmniPolicyEvaluator._matches(policy, {}) is True

    def test_matches_none_values_in_match_treated_as_wildcard(self):
        policy = _make_policy(match={"tool_in": None})
        assert OmniPolicyEvaluator._matches(policy, {"tool": "any"}) is True

    def test_matches_resource_and_data_class_fields(self):
        policy = _make_policy(match={"resource_in": ["db"], "data_class_in": ["pii"]})
        assert OmniPolicyEvaluator._matches(policy, {"resource": "db", "data_class": "pii"}) is True
        assert (
            OmniPolicyEvaluator._matches(policy, {"resource": "db", "data_class": "public"})
            is False
        )


class TestOmniPolicyEvaluatorEvaluate:
    """Tests for the evaluate method."""

    @pytest.mark.asyncio
    async def test_evaluate_returns_matching_policy_decision(self):
        loader = AsyncMock(
            return_value=[
                {
                    "name": "block_delete",
                    "version": 1,
                    "priority": 1,
                    "match": {"action_in": ["delete"]},
                    "decision": "DENY",
                    "lane": "BLOCKED",
                    "reason": "No deletes allowed",
                }
            ]
        )
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60, loader=loader)
        result = await evaluator.evaluate({"action": "delete"})
        assert result["decision"] == "DENY"
        assert result["lane"] == "BLOCKED"
        assert result["reason"] == "No deletes allowed"
        assert result["policy_name"] == "block_delete"
        assert result["policy_version"] == 1

    @pytest.mark.asyncio
    async def test_evaluate_returns_default_allow_when_no_policy_matches(self):
        loader = AsyncMock(
            return_value=[
                {
                    "name": "block_delete",
                    "version": 1,
                    "priority": 1,
                    "match": {"action_in": ["delete"]},
                    "decision": "DENY",
                    "lane": "BLOCKED",
                    "reason": "No deletes allowed",
                }
            ]
        )
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60, loader=loader)
        result = await evaluator.evaluate({"action": "read"})
        assert result["decision"] == "ALLOW"
        assert result["policy_name"] == "default_allow"
        assert result["policy_version"] == 1
        assert "No matching policy" in result["reason"]

    @pytest.mark.asyncio
    async def test_evaluate_returns_default_allow_when_no_policies(self):
        loader = AsyncMock(return_value=[])
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60, loader=loader)
        result = await evaluator.evaluate({"action": "read"})
        assert result["decision"] == "ALLOW"
        assert result["policy_name"] == "default_allow"

    @pytest.mark.asyncio
    async def test_evaluate_matches_first_policy_by_priority(self):
        loader = AsyncMock(
            return_value=[
                {
                    "name": "low_priority",
                    "version": 1,
                    "priority": 100,
                    "match": {},
                    "decision": "ALLOW",
                    "lane": "GREEN",
                    "reason": "Low priority allow",
                },
                {
                    "name": "high_priority",
                    "version": 1,
                    "priority": 1,
                    "match": {},
                    "decision": "DENY",
                    "lane": "RED",
                    "reason": "High priority deny",
                },
            ]
        )
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60, loader=loader)
        result = await evaluator.evaluate({"action": "read"})
        # High priority (lower number) should win
        assert result["policy_name"] == "high_priority"
        assert result["decision"] == "DENY"


class TestHashCtx:
    """Tests for _hash_ctx helper."""

    def test_hash_ctx_returns_sha256_hex(self):
        ctx = {"user_id": "u1", "tool": "read"}
        result = _hash_ctx(ctx)
        assert len(result) == 64  # SHA-256 hex is 64 chars
        assert all(c in "0123456789abcdef" for c in result)

    def test_hash_ctx_is_deterministic(self):
        ctx = {"a": 1, "b": "two"}
        assert _hash_ctx(ctx) == _hash_ctx(ctx)

    def test_hash_ctx_differs_for_different_ctx(self):
        ctx1 = {"key": "value1"}
        ctx2 = {"key": "value2"}
        assert _hash_ctx(ctx1) != _hash_ctx(ctx2)

    def test_hash_ctx_is_key_order_independent(self):
        ctx1 = {"a": 1, "b": 2}
        ctx2 = {"b": 2, "a": 1}
        assert _hash_ctx(ctx1) == _hash_ctx(ctx2)


class TestEvaluatePolicy:
    """Tests for the module-level evaluate_policy function."""

    @pytest.mark.asyncio
    async def test_evaluate_policy_returns_decision(self):
        """evaluate_policy should return a decision dict."""
        with patch("security.omni_policy._evaluator") as mock_evaluator:
            mock_evaluator.evaluate = AsyncMock(
                return_value={
                    "decision": "ALLOW",
                    "lane": "GREEN",
                    "reason": "No matching policy",
                    "policy_name": "default_allow",
                    "policy_version": 1,
                }
            )
            with patch("security.omni_policy.log_audit_event", new=AsyncMock()):
                result = await evaluate_policy({"user_id": "u1", "tool": "read"})
        assert result["decision"] == "ALLOW"
        assert result["policy_name"] == "default_allow"

    @pytest.mark.asyncio
    async def test_evaluate_policy_uses_user_id_from_ctx(self):
        """evaluate_policy passes user_id from ctx to audit log."""
        audit_calls = []

        async def fake_audit(**kwargs):  # NOSONAR
            audit_calls.append(kwargs)
            return "log-id"

        with patch("security.omni_policy._evaluator") as mock_evaluator:
            mock_evaluator.evaluate = AsyncMock(
                return_value={
                    "decision": "DENY",
                    "lane": "RED",
                    "reason": "blocked",
                    "policy_name": "block_all",
                    "policy_version": 1,
                }
            )
            with patch("security.omni_policy.log_audit_event", side_effect=fake_audit):
                result = await evaluate_policy({"user_id": "user-abc", "tool": "delete"})

        assert result["decision"] == "DENY"
        assert len(audit_calls) == 1
        assert audit_calls[0]["actor_id"] == "user-abc"

    @pytest.mark.asyncio
    async def test_evaluate_policy_uses_unknown_when_no_user_id(self):
        """evaluate_policy defaults actor_id to 'unknown' when user_id missing."""
        audit_calls = []

        async def fake_audit(**kwargs):  # NOSONAR
            audit_calls.append(kwargs)
            return "log-id"

        with patch("security.omni_policy._evaluator") as mock_evaluator:
            mock_evaluator.evaluate = AsyncMock(
                return_value={
                    "decision": "ALLOW",
                    "lane": "GREEN",
                    "reason": "No matching policy",
                    "policy_name": "default_allow",
                    "policy_version": 1,
                }
            )
            with patch("security.omni_policy.log_audit_event", side_effect=fake_audit):
                await evaluate_policy({"tool": "read"})

        assert audit_calls[0]["actor_id"] == "unknown"

    @pytest.mark.asyncio
    async def test_evaluate_policy_suppresses_audit_log_errors(self):
        """Audit log failures must not propagate — policy result still returned."""

        async def failing_audit(**_kwargs):  # NOSONAR
            msg = "DB connection failed"
            raise RuntimeError(msg)

        with patch("security.omni_policy._evaluator") as mock_evaluator:
            mock_evaluator.evaluate = AsyncMock(
                return_value={
                    "decision": "ALLOW",
                    "lane": "GREEN",
                    "reason": "No matching policy",
                    "policy_name": "default_allow",
                    "policy_version": 1,
                }
            )
            with patch("security.omni_policy.log_audit_event", side_effect=failing_audit):
                # Should not raise even though audit fails
                result = await evaluate_policy({"tool": "read"})

        assert result["decision"] == "ALLOW"


class TestLoadFromDb:
    """Tests for _load_from_db method."""

    @pytest.mark.asyncio
    async def test_load_from_db_returns_rows(self):
        """_load_from_db should call DB select and return rows."""
        mock_db = MagicMock()
        mock_db.select = AsyncMock(
            return_value=[
                {
                    "name": "p1",
                    "version": 1,
                    "priority": 10,
                    "match": {"tool_in": ["read"]},
                    "decision": "ALLOW",
                    "lane": "GREEN",
                    "reason": "Allow reads",
                }
            ]
        )
        with patch("security.omni_policy.get_database_provider", return_value=mock_db):
            evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60)
            rows = await evaluator._load_from_db()
        assert len(rows) == 1
        assert rows[0]["name"] == "p1"

    @pytest.mark.asyncio
    async def test_load_from_db_returns_empty_list_when_no_rows(self):
        """_load_from_db should return [] when DB returns None or empty."""
        mock_db = MagicMock()
        mock_db.select = AsyncMock(return_value=None)
        with patch("security.omni_policy.get_database_provider", return_value=mock_db):
            evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60)
            rows = await evaluator._load_from_db()
        assert rows == []


class TestCacheTtlFromEnv:
    """Tests for TTL initialization from environment variable."""

    def test_cache_ttl_defaults_to_60_seconds(self, monkeypatch):
        monkeypatch.delenv("OMNIPOLICY_CACHE_TTL_SECONDS", raising=False)
        evaluator = OmniPolicyEvaluator()
        assert evaluator.cache_ttl_seconds == 60

    def test_cache_ttl_reads_from_env(self, monkeypatch):
        monkeypatch.setenv("OMNIPOLICY_CACHE_TTL_SECONDS", "120")
        evaluator = OmniPolicyEvaluator()
        assert evaluator.cache_ttl_seconds == 120

    def test_cache_ttl_explicit_parameter_overrides_env(self, monkeypatch):
        monkeypatch.setenv("OMNIPOLICY_CACHE_TTL_SECONDS", "999")
        evaluator = OmniPolicyEvaluator(cache_ttl_seconds=30)
        assert evaluator.cache_ttl_seconds == 30


@pytest.mark.asyncio
async def test_builtin_control_plane_database_guard_defers_without_loaded_policy():
    loader = AsyncMock(return_value=[])
    evaluator = OmniPolicyEvaluator(cache_ttl_seconds=60, loader=loader)

    result = await evaluator.evaluate({"tool": "search_database", "resource": "connections"})

    assert result["decision"] == "DEFER"
    assert result["lane"] == "RED"
    assert result["policy_name"] == "builtin_control_plane_database_guard"
    loader.assert_not_awaited()
