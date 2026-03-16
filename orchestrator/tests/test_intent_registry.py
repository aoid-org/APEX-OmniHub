from __future__ import annotations

import pytest

from core.intent_registry import IntentRegistry, OmniModalPayload

# ── OmniModalPayload ─────────────────────────────────────────────────


class TestOmniModalPayload:
    def test_creation_with_defaults(self) -> None:
        payload = OmniModalPayload(intent_id="test.intent", status="ok")

        assert payload.intent_id == "test.intent"
        assert payload.status == "ok"
        assert payload.data == {}
        assert payload.error is None
        assert payload.trace_id is None

    def test_creation_with_all_fields(self) -> None:
        payload = OmniModalPayload(
            intent_id="crm.sync",
            status="error",
            data={"key": "value"},
            error="something broke",
            trace_id="trace-abc-123",
        )

        assert payload.intent_id == "crm.sync"
        assert payload.status == "error"
        assert payload.data == {"key": "value"}
        assert payload.error == "something broke"
        assert payload.trace_id == "trace-abc-123"

    def test_frozen(self) -> None:
        payload = OmniModalPayload(intent_id="x", status="ok")
        with pytest.raises(AttributeError):
            payload.status = "error"  # type: ignore[misc]

    def test_to_dict(self) -> None:
        payload = OmniModalPayload(
            intent_id="crm.sync",
            status="offline",
            data={"count": 42},
            error="gone",
            trace_id="t-1",
        )
        result = payload.to_dict()

        assert result == {
            "intentId": "crm.sync",
            "status": "offline",
            "data": {"count": 42},
            "error": "gone",
            "traceId": "t-1",
        }

    def test_to_dict_defaults(self) -> None:
        payload = OmniModalPayload(intent_id="x", status="ok")
        result = payload.to_dict()

        assert result == {
            "intentId": "x",
            "status": "ok",
            "data": {},
            "error": None,
            "traceId": None,
        }


# ── IntentRegistry ───────────────────────────────────────────────────


@pytest.fixture()
def reg() -> IntentRegistry:
    """Return a fresh IntentRegistry for each test."""
    return IntentRegistry()


class TestRegisterIntent:
    def test_happy_path(self, reg: IntentRegistry) -> None:
        @reg.register_intent("crm.sync_contacts")
        def sync_contacts(payload: dict) -> dict:
            return payload

        assert "crm.sync_contacts" in reg
        assert reg.resolve("crm.sync_contacts") == "sync_contacts"

    def test_returns_original_function(self, reg: IntentRegistry) -> None:
        @reg.register_intent("crm.ping")
        def ping() -> str:
            return "pong"

        assert ping() == "pong"

    def test_duplicate_raises_value_error(self, reg: IntentRegistry) -> None:
        @reg.register_intent("crm.dup")
        def first() -> None: ...

        with pytest.raises(ValueError, match="duplicate registration.*crm\\.dup"):

            @reg.register_intent("crm.dup")
            def second() -> None: ...


class TestMapIntent:
    def test_happy_path(self, reg: IntentRegistry) -> None:
        reg.map_intent("billing.charge", "charge_activity")

        assert "billing.charge" in reg
        assert reg.resolve("billing.charge") == "charge_activity"

    def test_duplicate_raises_value_error(self, reg: IntentRegistry) -> None:
        reg.map_intent("billing.charge", "charge_activity")

        with pytest.raises(ValueError, match="duplicate registration.*billing\\.charge"):
            reg.map_intent("billing.charge", "other_activity")


class TestResolve:
    def test_returns_activity_name(self, reg: IntentRegistry) -> None:
        reg.map_intent("crm.sync", "sync_act")
        assert reg.resolve("crm.sync") == "sync_act"

    def test_returns_none_for_unknown(self, reg: IntentRegistry) -> None:
        assert reg.resolve("nonexistent") is None


class TestResolveOrOffline:
    def test_returns_name_for_known_intent(self, reg: IntentRegistry) -> None:
        reg.map_intent("crm.sync", "sync_act")
        result = reg.resolve_or_offline("crm.sync", trace_id="t-1")

        assert result == "sync_act"

    def test_returns_payload_for_unknown_intent(self, reg: IntentRegistry) -> None:
        result = reg.resolve_or_offline("unknown.intent", trace_id="t-99")

        assert isinstance(result, OmniModalPayload)
        assert result.intent_id == "unknown.intent"
        assert result.status == "offline"
        assert "not registered" in (result.error or "")
        assert result.trace_id == "t-99"

    def test_returns_payload_without_trace_id(self, reg: IntentRegistry) -> None:
        result = reg.resolve_or_offline("unknown.intent")

        assert isinstance(result, OmniModalPayload)
        assert result.trace_id is None


class TestListIntents:
    def test_empty_registry(self, reg: IntentRegistry) -> None:
        assert reg.list_intents() == []

    def test_returns_sorted(self, reg: IntentRegistry) -> None:
        reg.map_intent("z.last", "act_z")
        reg.map_intent("a.first", "act_a")
        reg.map_intent("m.middle", "act_m")

        assert reg.list_intents() == ["a.first", "m.middle", "z.last"]


class TestContainsAndLen:
    def test_contains_registered(self, reg: IntentRegistry) -> None:
        reg.map_intent("crm.sync", "sync_act")
        assert "crm.sync" in reg

    def test_not_contains_unregistered(self, reg: IntentRegistry) -> None:
        assert "nonexistent" not in reg

    def test_len_empty(self, reg: IntentRegistry) -> None:
        assert len(reg) == 0

    def test_len_after_registrations(self, reg: IntentRegistry) -> None:
        reg.map_intent("a", "act_a")
        reg.map_intent("b", "act_b")
        assert len(reg) == 2

    def test_len_with_decorator(self, reg: IntentRegistry) -> None:
        @reg.register_intent("x")
        def x_fn() -> None: ...

        @reg.register_intent("y")
        def y_fn() -> None: ...

        assert len(reg) == 2
