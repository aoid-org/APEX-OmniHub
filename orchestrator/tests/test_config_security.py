import pytest
from pydantic import ValidationError

from config import Settings


def test_production_requires_redis_password():
    """Should raise ValidationError if redis_password is missing in production."""
    # We need to mock environment variables for required fields
    # supabase_url, supabase_service_role_key, supabase_db_url are required
    required_env = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        "SUPABASE_DB_URL": "postgresql://test",
    }

    # Test production without password
    with pytest.raises(ValidationError) as excinfo:
        Settings(
            environment="production",
            redis_password=None,
            **required_env
        )
    assert "redis_password must be set in production" in str(excinfo.value)

    # Test production with empty password
    with pytest.raises(ValidationError) as excinfo:
        Settings(
            environment="production",
            redis_password="",
            **required_env
        )
    assert "redis_password must be set in production" in str(excinfo.value)

    # Test production with password
    settings = Settings(
        environment="production",
        redis_password="secure-password",
        **required_env
    )
    assert settings.redis_password.get_secret_value() == "secure-password"

def test_development_allows_no_redis_password():
    """Should allow missing redis_password in development."""
    required_env = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        "SUPABASE_DB_URL": "postgresql://test",
    }

    settings = Settings(
        environment="development",
        redis_password=None,
        **required_env
    )
    assert settings.redis_password is None
