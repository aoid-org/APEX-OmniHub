import pytest
from pydantic import ValidationError

from config import Settings


def clear_settings_env(monkeypatch) -> None:
    """Clear all CI env vars that could silently satisfy production validators.

    Call this at the top of every config-security test that constructs a
    Settings() instance directly.  Without this, GitHub Actions secrets
    (REDIS_PASSWORD, ANTHROPIC_API_KEY, etc.) bleed into pydantic-settings
    and cause the wrong validator branch to fire — masking the assertion
    under test.
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

    required_env = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        "SUPABASE_DB_URL": "postgresql://test",
        # Satisfy the anthropic_api_key production guard so the redis check
        # (which appears first in validate_production_config) is what fires.
        "ANTHROPIC_API_KEY": "ci-placeholder-anthropic-key",  # noqa: S106
    }

    # Production without redis_password must raise
    with pytest.raises(ValidationError) as excinfo:
        Settings(environment="production", redis_password=None, **required_env)
    assert "redis_password must be set in production" in str(excinfo.value)

    # Production with empty string password must also raise
    with pytest.raises(ValidationError) as excinfo:
        Settings(environment="production", redis_password="", **required_env)
    assert "redis_password must be set in production" in str(excinfo.value)

    # Production with a real password — all checks must pass
    settings = Settings(
        environment="production",
        redis_password="secure-password",  # noqa: S106
        **required_env,
    )
    assert settings.redis_password.get_secret_value() == "secure-password"


def test_development_allows_no_redis_password(monkeypatch):
    """Should allow missing redis_password in development."""
    clear_settings_env(monkeypatch)

    required_env = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        "SUPABASE_DB_URL": "postgresql://test",
    }

    settings = Settings(environment="development", redis_password=None, **required_env)
    assert settings.redis_password is None
