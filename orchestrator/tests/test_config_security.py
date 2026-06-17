import pytest
from pydantic import ValidationError

from config import Settings


def test_production_requires_redis_password(monkeypatch):
    """Should raise ValidationError if redis_password is missing in production.

    CI isolation: REDIS_PASSWORD and ANTHROPIC_API_KEY may exist as CI secrets.
    monkeypatch clears them so only our explicit kwargs control the validator path.
    We also supply ANTHROPIC_API_KEY in required_env so the redis check fires
    first (as designed) rather than being masked by a later validator.
    """
    monkeypatch.delenv("REDIS_PASSWORD", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("ORCHESTRATOR_REQUIRE_SIGNATURE", raising=False)

    required_env = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        "SUPABASE_DB_URL": "postgresql://test",
        # Satisfy the anthropic_api_key production guard so the redis check
        # (which appears first in validate_production_config) is what fires.
        "ANTHROPIC_API_KEY": "ci-placeholder-anthropic-key",  # noqa: S106
    }

    # Production without redis_password=None must raise
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
    monkeypatch.delenv("REDIS_PASSWORD", raising=False)

    required_env = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        "SUPABASE_DB_URL": "postgresql://test",
    }

    settings = Settings(environment="development", redis_password=None, **required_env)
    assert settings.redis_password is None
