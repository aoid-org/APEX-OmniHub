import pytest
from pydantic import ValidationError

from config import Settings


def clear_settings_env(monkeypatch) -> None:
    """Clear CI env vars that could silently satisfy production validators.

    pydantic-settings reads field values from os.environ (env source) when
    init kwargs are absent or None.  Without this guard, GitHub Actions
    secrets leak into Settings() calls and cause the wrong validator branch
    to fire — masking the assertion under test.

    IMPORTANT: pydantic-settings' InitSettingsSource resolves init kwargs by
    exact lowercase field name.  Uppercase kwargs (e.g. ANTHROPIC_API_KEY=...)
    are silently ignored.  Use monkeypatch.setenv() — not dict kwargs — to
    inject env-sourced values reliably.

    Call this at the top of every config-security test that constructs a
    Settings() instance directly.
    """
    for key in (
        "REDIS_PASSWORD",
        "ANTHROPIC_API_KEY",
        "GROQ_API_KEY",
        "DEFAULT_LLM_MODEL",
        "DEFAULT_LLM_PROVIDER",
        "ENVIRONMENT",
        "ORCHESTRATOR_REQUIRE_SIGNATURE",
    ):
        monkeypatch.delenv(key, raising=False)


def test_production_requires_redis_password(monkeypatch):
    """Should raise ValidationError if redis_password is missing in production."""
    clear_settings_env(monkeypatch)
    # Inject via env (uppercase dict kwargs are silently dropped by
    # InitSettingsSource; monkeypatch.setenv is the only reliable path).
    monkeypatch.setenv("ANTHROPIC_API_KEY", "ci-placeholder-anthropic-key")

    # Production without redis_password must raise
    with pytest.raises(ValidationError) as excinfo:
        Settings(environment="production", redis_password=None)
    assert "redis_password must be set in production" in str(excinfo.value)

    # Production with empty string password must also raise
    with pytest.raises(ValidationError) as excinfo:
        Settings(environment="production", redis_password="")
    assert "redis_password must be set in production" in str(excinfo.value)

    # Production with a real password — all checks must pass
    settings = Settings(environment="production", redis_password="secure-password")  # noqa: S106
    assert settings.redis_password.get_secret_value() == "secure-password"


def test_development_allows_no_redis_password(monkeypatch):
    """Should allow missing redis_password in development."""
    clear_settings_env(monkeypatch)

    settings = Settings(environment="development", redis_password=None)
    assert settings.redis_password is None
