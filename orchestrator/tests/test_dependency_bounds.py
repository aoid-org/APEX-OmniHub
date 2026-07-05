"""Dependency guardrails for production-sensitive client libraries."""

from __future__ import annotations

from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - Python <3.11 fallback
    import tomli as tomllib  # type: ignore[no-redef]


ROOT = Path(__file__).resolve().parents[1]


def test_pyproject_caps_redis_below_incompatible_major() -> None:
    """redis-py 7.x rejects the ssl kwarg path used by current TLS startup code."""
    pyproject = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    redis_specs = [dep for dep in pyproject["project"]["dependencies"] if dep.startswith("redis[")]

    assert redis_specs == ["redis[hiredis]>=5.0.0,<6.0.0"]


def test_requirements_and_pyproject_keep_same_redis_bound() -> None:
    requirements = (ROOT / "requirements.txt").read_text(encoding="utf-8")

    assert "redis[hiredis]>=5.0.0,<6.0.0" in requirements
