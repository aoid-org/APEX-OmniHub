"""
FR4 — Lite semantic cache mode + hit/miss instrumentation.

Proves the zero-cost semantic-cache path:
1. LiteEmbedder: deterministic, 384-dim, L2-normalized, stdlib-only encoder.
2. SemanticCacheService accepts an injected encoder WITHOUT importing
   sentence_transformers (the torch import is what OOMs a 512 MB worker).
3. check_semantic_cache increments Prometheus hit/miss/disabled counters so
   production hit-rate is measurable (AUDIT_2026-07.md §4).
"""

import sys

import numpy as np
import pytest

from infrastructure.lite_embedder import LiteEmbedder
from metrics import semantic_cache_lookups


# ── LiteEmbedder contract ────────────────────────────────────────────


def test_lite_embedder_refuses_tensor_output():
    emb = LiteEmbedder()
    with pytest.raises(NotImplementedError, match="convert_to_numpy=False"):
        emb.encode("anything", convert_to_numpy=False)


def test_lite_embedder_shape_dtype_and_norm():
    emb = LiteEmbedder()
    vec = emb.encode("Book flight to {DESTINATION} {DATE}", convert_to_numpy=True)
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (emb.get_sentence_embedding_dimension(),)
    assert vec.dtype == np.float32
    assert np.isclose(float(np.linalg.norm(vec)), 1.0, atol=1e-5)


def test_lite_embedder_deterministic():
    emb = LiteEmbedder()
    a = emb.encode("Send email to {EMAIL}", convert_to_numpy=True)
    b = emb.encode("Send email to {EMAIL}", convert_to_numpy=True)
    assert np.array_equal(a, b)


def test_lite_embedder_similarity_ordering():
    """Near-duplicate templates must score higher than unrelated ones."""
    emb = LiteEmbedder()
    base = emb.encode("Book flight to {DESTINATION} {DATE}", convert_to_numpy=True)
    near = emb.encode("Book a flight to {DESTINATION} on {DATE}", convert_to_numpy=True)
    far = emb.encode("Delete database record {ID}", convert_to_numpy=True)
    assert float(np.dot(base, near)) > float(np.dot(base, far))
    assert float(np.dot(base, near)) > 0.5


def test_lite_embedder_empty_and_unicode_safe():
    emb = LiteEmbedder()
    zero = emb.encode("", convert_to_numpy=True)
    assert zero.shape == (emb.get_sentence_embedding_dimension(),)
    assert not np.isnan(zero).any()
    uni = emb.encode("Réserver un vol à Montréal — 你好", convert_to_numpy=True)
    assert np.isclose(float(np.linalg.norm(uni)), 1.0, atol=1e-5)


# ── Lazy heavy-import + injection ───────────────────────────────────


def test_cache_service_injection_never_imports_sentence_transformers(monkeypatch):
    """
    Constructing SemanticCacheService with an injected encoder must not touch
    sentence_transformers (poisoned here so any import attempt raises).
    """
    import infrastructure.cache as cache_mod

    monkeypatch.delitem(sys.modules, "sentence_transformers", raising=False)
    monkeypatch.setitem(sys.modules, "sentence_transformers", None)  # import → error

    svc = cache_mod.SemanticCacheService(
        redis_url="redis://localhost:6379",
        embedding_model=LiteEmbedder(),
    )
    assert svc.embedding_dim == LiteEmbedder().get_sentence_embedding_dimension()
    # Distinct vector space must not share the full-model index/key namespace.
    assert svc.index_name != "idx:plan_templates"
    assert svc.key_prefix != "plan:"


# ── Mode resolution (tools.py gate) ──────────────────────────────────


def test_resolve_cache_mode_matrix(monkeypatch):
    from activities.tools import _resolve_cache_mode

    monkeypatch.delenv("SEMANTIC_CACHE_ENABLED", raising=False)
    monkeypatch.delenv("SEMANTIC_CACHE_MODE", raising=False)
    assert _resolve_cache_mode() == "full"  # existing default preserved

    monkeypatch.setenv("SEMANTIC_CACHE_ENABLED", "false")
    assert _resolve_cache_mode() == "off"  # legacy kill-switch always wins

    monkeypatch.setenv("SEMANTIC_CACHE_MODE", "lite")
    assert _resolve_cache_mode() == "off"  # kill-switch still wins

    monkeypatch.setenv("SEMANTIC_CACHE_ENABLED", "true")
    assert _resolve_cache_mode() == "lite"

    monkeypatch.setenv("SEMANTIC_CACHE_MODE", "full")
    assert _resolve_cache_mode() == "full"

    monkeypatch.setenv("SEMANTIC_CACHE_MODE", "off")
    assert _resolve_cache_mode() == "off"


# ── Hit/miss instrumentation ─────────────────────────────────────────


def _counter_value(result: str) -> float:
    return semantic_cache_lookups.labels(result=result)._value.get()


@pytest.mark.asyncio
async def test_check_semantic_cache_counts_disabled(monkeypatch):
    import activities.tools as tools_mod

    monkeypatch.setattr(tools_mod, "_semantic_cache", None)
    before = _counter_value("disabled")
    assert await tools_mod.check_semantic_cache("any goal") is None
    assert _counter_value("disabled") == before + 1


@pytest.mark.asyncio
async def test_check_semantic_cache_counts_hit_and_miss(monkeypatch):
    import activities.tools as tools_mod
    from infrastructure.cache import CachedPlan

    class StubCache:
        def __init__(self, plan):
            self._plan = plan

        async def get_plan(self, _goal):
            return self._plan

    plan = CachedPlan(
        plan_id="p1",
        template_id="t1",
        steps=[],
        parameters={},
        similarity_score=0.99,
    )

    monkeypatch.setattr(tools_mod, "_semantic_cache", StubCache(plan))
    hit_before = _counter_value("hit")
    assert await tools_mod.check_semantic_cache("Book flight to Paris") is not None
    assert _counter_value("hit") == hit_before + 1

    monkeypatch.setattr(tools_mod, "_semantic_cache", StubCache(None))
    miss_before = _counter_value("miss")
    assert await tools_mod.check_semantic_cache("Book flight to Paris") is None
    assert _counter_value("miss") == miss_before + 1
