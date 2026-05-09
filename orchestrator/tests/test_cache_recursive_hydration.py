"""Regression tests for recursive semantic-cache parameter hydration."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np

from infrastructure.cache import SemanticCacheService


def _make_cache() -> SemanticCacheService:
    """Build cache service with mocked sentence-transformer dependency."""
    model = MagicMock()
    model.encode.return_value = np.array([0.1, 0.2, 0.3], dtype=np.float32)
    model.get_sentence_embedding_dimension.return_value = 3

    with patch("infrastructure.cache.SentenceTransformer", return_value=model):
        cache = SemanticCacheService(redis_url="redis://localhost:6379")
    cache.embedding_model = model
    return cache


def test_inject_parameters_recurses_nested_payloads() -> None:
    """Nested dict/list payloads should receive placeholder injection."""
    cache = _make_cache()
    plan_steps = [
        {
            "id": "step-1",
            "tool": "call_webhook",
            "input": {
                "url": "https://api.example.com/{TENANT}",
                "payload": {
                    "subject": "Report for {DATE}",
                    "targets": ["{EMAIL}", "ops+{TENANT}@example.com"],
                },
            },
            "notes": ["Run on {DATE}", {"owner": "{EMAIL}"}],
        }
    ]

    result = cache._inject_parameters(
        plan_steps,
        {"TENANT": "acme", "DATE": "2026-04-11", "EMAIL": "ops@acme.com"},
    )

    step = result[0]
    assert step["input"]["url"] == "https://api.example.com/acme"
    assert step["input"]["payload"]["subject"] == "Report for 2026-04-11"
    assert step["input"]["payload"]["targets"][0] == "ops@acme.com"
    assert step["input"]["payload"]["targets"][1] == "ops+acme@example.com"
    assert step["notes"][0] == "Run on 2026-04-11"
    assert step["notes"][1]["owner"] == "ops@acme.com"


def test_parameterize_steps_recurses_nested_payloads() -> None:
    """Nested dict/list payloads should be converted into placeholders."""
    cache = _make_cache()
    plan_steps = [
        {
            "id": "step-1",
            "tool": "send_email",
            "input": {
                "to": "ops@acme.com",
                "body": "Status for acme on 2026-04-11",
                "meta": {"tenant": "acme", "date": "2026-04-11"},
            },
            "notes": ["owner=ops@acme.com", {"line": "acme"}],
        }
    ]

    result = cache._parameterize_steps(
        plan_steps,
        {"EMAIL": "ops@acme.com", "TENANT": "acme", "DATE": "2026-04-11"},
    )

    step = result[0]
    assert step["input"]["to"] == "{EMAIL}"
    assert step["input"]["body"] == "Status for {TENANT} on {DATE}"
    assert step["input"]["meta"]["tenant"] == "{TENANT}"
    assert step["input"]["meta"]["date"] == "{DATE}"
    assert step["notes"][0] == "owner={EMAIL}"
    assert step["notes"][1]["line"] == "{TENANT}"


def test_replacement_pairs_are_sorted_longest_first() -> None:
    """Longer keys should be replaced first to avoid overlap corruption."""
    pairs = SemanticCacheService._build_replacement_pairs(
        {
            "{TENANT_NAME}": "acme-labs",
            "{TENANT}": "acme",
        }
    )
    assert pairs[0][0] == "{TENANT_NAME}"
    assert pairs[1][0] == "{TENANT}"
