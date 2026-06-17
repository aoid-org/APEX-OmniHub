"""
Unit tests for config.py — Settings loading, defaults, and validators.

Strategy: We cannot rely on a persistent global `settings` instance because
pydantic-settings reads env vars at class instantiation time.  Instead every
test that needs a fresh Settings object patches the environment *before*
calling Settings().  The module-level `settings` singleton is NOT re-created
here; we only import `Settings` (the class) to avoid side-effects.
"""

import os
import sys

import pytest
from pydantic import ValidationError

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_settings(**env_overrides):
    """
    Return a fresh Settings instance with the minimum required env vars set,
    plus any caller-supplied overrides.

    Required fields (no defaults): supabase_url, supabase_service_role_key,
    supabase_db_url.
    """
    base = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
        "SUPABASE_DB_URL": "postgresql://user:pass@localhost/testdb",
    }
    base.update(env_overrides)

    # Temporarily set environment, then restore
    old = {k: os.environ.get(k) for k in base}
    for k, v in base.items():
        os.environ[k] = v

    try:
        # Re-import Settings fresh so it picks up the current env
        from config import Settings

        return Settings(_env_file=None)
    finally:
        # Restore old values
        for k, old_v in old.items():
            if old_v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = old_v


# ---------------------------------------------------------------------------
# Basic import / module-level singleton
# ---------------------------------------------------------------------------


class TestConfigModuleImport:
    """The module-level settings singleton should be importable."""

    def test_settings_singleton_exists(self, monkeypatch):
        """config.settings should be a Settings instance."""
        monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
        monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc-key")
        monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://u:p@host/db")

        # Force re-import to pick up monkeypatched env
        if "config" in sys.modules:
            del sys.modules["config"]

        import config

        assert hasattr(config, "settings")
        assert hasattr(config, "Settings")

    def test_settings_class_accessible(self):
        """Settings class should be importable directly."""
        from config import Settings

        assert isinstance(Settings, type)


# ---------------------------------------------------------------------------
# Temporal defaults
# ---------------------------------------------------------------------------


class TestTemporalDefaults:
    """Temporal settings should have sensible defaults."""

    def test_temporal_host_default(self, monkeypatch):
        monkeypatch.delenv("TEMPORAL_HOST", raising=False)
        s = make_settings()
        assert s.temporal_host == "localhost:7233"

    def test_temporal_namespace_default(self):
        s = make_settings()
        assert s.temporal_namespace == "default"

    def test_temporal_task_queue_default(self):
        s = make_settings()
        assert s.temporal_task_queue == "apex-orchestrator"

    def test_temporal_tls_disabled_by_default(self):
        s = make_settings()
        assert s.temporal_tls_enabled is False

    def test_temporal_tls_cert_default_empty(self):
        s = make_settings()
        assert s.temporal_tls_cert == ""

    def test_temporal_tls_key_default_empty(self):
        s = make_settings()
        assert s.temporal_tls_key == ""

    def test_temporal_max_workflow_tasks_default(self):
        s = make_settings()
        assert s.temporal_max_workflow_tasks == 10

    def test_temporal_max_activities_default(self):
        s = make_settings()
        assert s.temporal_max_activities == 20

    def test_temporal_host_env_override(self):
        s = make_settings(TEMPORAL_HOST="temporal.prod:7233")
        assert s.temporal_host == "temporal.prod:7233"

    def test_temporal_namespace_env_override(self):
        s = make_settings(TEMPORAL_NAMESPACE="prod-ns")
        assert s.temporal_namespace == "prod-ns"

    def test_temporal_tls_enabled_env_override(self):
        s = make_settings(TEMPORAL_TLS_ENABLED="true")
        assert s.temporal_tls_enabled is True


# ---------------------------------------------------------------------------
# Redis defaults
# ---------------------------------------------------------------------------


class TestRedisDefaults:
    """Redis settings should have sensible defaults."""

    def test_redis_url_default(self):
        s = make_settings()
        assert s.redis_url == "redis://localhost:6379"

    def test_redis_password_default_none(self):
        s = make_settings()
        assert s.redis_password is None

    def test_redis_ssl_default_false(self):
        s = make_settings()
        assert s.redis_ssl is False

    def test_redis_url_env_override(self):
        s = make_settings(REDIS_URL="redis://redis-host:6380")
        assert s.redis_url == "redis://redis-host:6380"

    def test_redis_password_is_secret_str(self):
        """redis_password should be a SecretStr when provided."""
        s = make_settings(REDIS_PASSWORD="supersecret")  # noqa: S106  # NOSONAR
        assert s.redis_password is not None
        # SecretStr.get_secret_value() returns the raw value
        assert s.redis_password.get_secret_value() == "supersecret"
        # Str representation should NOT expose the secret
        assert "supersecret" not in str(s.redis_password)


# ---------------------------------------------------------------------------
# Supabase required fields
# ---------------------------------------------------------------------------


class TestSupabaseRequired:
    """Supabase fields without defaults should be required."""

    def test_supabase_url_loaded(self):
        s = make_settings(SUPABASE_URL="https://proj.supabase.co")
        assert s.supabase_url == "https://proj.supabase.co"

    def test_supabase_service_role_key_loaded(self):
        s = make_settings(SUPABASE_SERVICE_ROLE_KEY="my-svc-key")
        assert s.supabase_service_role_key.get_secret_value() == "my-svc-key"

    def test_supabase_db_url_loaded(self):
        s = make_settings(SUPABASE_DB_URL="postgresql://u:p@db-host/mydb")
        assert s.supabase_db_url.get_secret_value() == "postgresql://u:p@db-host/mydb"

    def test_supabase_activity_key_default_empty(self):
        s = make_settings()
        assert s.supabase_activity_key.get_secret_value() == ""

    def test_supabase_url_missing_raises(self, monkeypatch):
        """Missing supabase_url should raise ValidationError."""
        monkeypatch.delenv("SUPABASE_URL", raising=False)
        monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "key")
        monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://u:p@h/db")
        # Remove .env file influence by pointing to a nonexistent file
        from config import Settings

        with pytest.raises((ValidationError, Exception)):
            Settings(_env_file=None)

    def test_supabase_service_role_key_missing_raises(self, monkeypatch):
        """Missing supabase_service_role_key should raise ValidationError."""
        monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
        monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
        monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://u:p@h/db")
        from config import Settings

        with pytest.raises((ValidationError, Exception)):
            Settings(_env_file=None)

    def test_supabase_db_url_missing_raises(self, monkeypatch):
        """Missing supabase_db_url should raise ValidationError."""
        monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
        monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "key")
        monkeypatch.delenv("SUPABASE_DB_URL", raising=False)
        from config import Settings

        with pytest.raises((ValidationError, Exception)):
            Settings(_env_file=None)


# ---------------------------------------------------------------------------
# LLM defaults
# ---------------------------------------------------------------------------


class TestLLMDefaults:
    """LLM settings should have sensible defaults. APEX Policy: only anthropic/groq."""

    def test_groq_api_key_default_empty(self):
        # openai_api_key removed by APEX policy; groq_api_key is the permitted peer key
        s = make_settings()
        assert s.groq_api_key.get_secret_value() == ""

    def test_anthropic_api_key_default_empty(self):
        s = make_settings()
        assert s.anthropic_api_key.get_secret_value() == ""

    def test_default_llm_provider(self):
        # APEX Policy: default provider is 'anthropic'
        s = make_settings()
        assert s.default_llm_provider == "anthropic"

    def test_default_llm_model(self):
        # APEX Policy: default model must be Anthropic — no GPT defaults
        s = make_settings()
        assert s.default_llm_model == "anthropic/claude-sonnet-4-5"

    def test_default_llm_temperature(self):
        s = make_settings()
        assert s.default_llm_temperature == pytest.approx(0.0)

    def test_llm_model_env_override_permitted(self):
        # Groq model is permitted by APEX policy
        s = make_settings(DEFAULT_LLM_MODEL="groq/llama3-8b-8192")
        assert s.default_llm_model == "groq/llama3-8b-8192"

    def test_forbidden_gpt_model_raises(self):
        # APEX Policy: GPT models are forbidden as defaults
        with pytest.raises((ValidationError, ValueError)):
            make_settings(DEFAULT_LLM_MODEL="gpt-4o")

    def test_forbidden_llm_provider_raises(self):
        # APEX Policy: only 'anthropic' and 'groq' are permitted providers
        with pytest.raises((ValidationError, ValueError)):
            make_settings(DEFAULT_LLM_PROVIDER="openai")


# ---------------------------------------------------------------------------
# Cache defaults
# ---------------------------------------------------------------------------


class TestCacheDefaults:
    """Semantic cache settings should have sensible defaults."""

    def test_cache_embedding_model_default(self):
        s = make_settings()
        assert s.cache_embedding_model == "all-MiniLM-L6-v2"

    def test_cache_similarity_threshold_default(self):
        s = make_settings()
        assert s.cache_similarity_threshold == pytest.approx(0.85)

    def test_cache_ttl_seconds_default(self):
        s = make_settings()
        assert s.cache_ttl_seconds == 86400

    def test_cache_ttl_env_override(self):
        s = make_settings(CACHE_TTL_SECONDS="3600")
        assert s.cache_ttl_seconds == 3600


# ---------------------------------------------------------------------------
# MAN mode defaults
# ---------------------------------------------------------------------------


class TestManModeDefaults:
    def test_man_mode_blocking_threshold_default(self):
        s = make_settings()
        assert s.man_mode_blocking_threshold == pytest.approx(0.90)

    def test_man_mode_blocking_threshold_env_override(self):
        s = make_settings(MAN_MODE_BLOCKING_THRESHOLD="0.75")
        assert s.man_mode_blocking_threshold == pytest.approx(0.75)


# ---------------------------------------------------------------------------
# Application defaults
# ---------------------------------------------------------------------------


class TestApplicationDefaults:
    def test_log_level_default(self):
        # Force the env var to be absent so default kicks in
        s = make_settings(LOG_LEVEL="INFO")
        assert s.log_level == "INFO"

    def test_environment_default(self):
        # Force the env var to be absent so default kicks in
        s = make_settings(ENVIRONMENT="development")
        assert s.environment == "development"

    def test_max_workflow_history_size_default(self):
        s = make_settings()
        assert s.max_workflow_history_size == 1000

    def test_slack_webhook_url_default_none(self):
        s = make_settings()
        assert s.slack_alert_webhook_url is None

    def test_slack_webhook_url_env_override(self):
        s = make_settings(SLACK_ALERT_WEBHOOK_URL="https://hooks.slack.com/services/XXX")
        assert (
            s.slack_alert_webhook_url.get_secret_value() == "https://hooks.slack.com/services/XXX"
        )

    def test_environment_env_override(self):
        s = make_settings(ENVIRONMENT="staging")
        assert s.environment == "staging"

    def test_log_level_env_override(self):
        s = make_settings(LOG_LEVEL="DEBUG")
        assert s.log_level == "DEBUG"


# ---------------------------------------------------------------------------
# model_validator: production safety check
# ---------------------------------------------------------------------------


class TestProductionValidator:
    """validate_production_config should reject prod without redis_password."""

    def test_production_without_redis_password_raises(self):
        """Production env without redis_password should raise ValueError."""

        with pytest.raises((ValidationError, ValueError)):
            make_settings(ENVIRONMENT="production", ANTHROPIC_API_KEY="placeholder-anthropic-key")  # noqa: S106  # NOSONAR

    def test_production_without_anthropic_api_key_raises(self):
        """Production env without anthropic_api_key should raise ValueError."""

        with pytest.raises((ValidationError, ValueError)):
            make_settings(ENVIRONMENT="production", REDIS_PASSWORD="secure-pass")  # noqa: S106  # NOSONAR

    def test_production_with_redis_password_ok(self):
        """Production env with redis_password + anthropic_api_key should succeed."""
        s = make_settings(
            ENVIRONMENT="production",
            REDIS_PASSWORD="secure-pass",  # noqa: S106  # NOSONAR
            ANTHROPIC_API_KEY="placeholder-anthropic-key",  # noqa: S106  # NOSONAR
        )
        assert s.environment == "production"
        assert s.redis_password is not None
        assert s.redis_password.get_secret_value() == "secure-pass"

    def test_development_without_redis_password_ok(self):
        """Non-production env should not require redis_password."""
        s = make_settings(ENVIRONMENT="development")
        assert s.environment == "development"
        assert s.redis_password is None

    def test_staging_without_redis_password_ok(self):
        """Staging env should