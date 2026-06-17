"""
Configuration management for APEX Orchestrator.

Uses pydantic-settings for type-safe environment variable loading.
"""

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Priority:
    1. Environment variables
    2. .env file
    3. Default values
    """

    # Temporal Configuration
    temporal_host: str = Field(default="localhost:7233", description="Temporal server host")
    temporal_namespace: str = Field(default="default", description="Temporal namespace")
    temporal_task_queue: str = Field(
        default="apex-orchestrator", description="Temporal task queue name"
    )
    temporal_tls_enabled: bool = Field(
        default=False, description="Enable TLS when connecting to Temporal"
    )
    temporal_tls_cert: str = Field(default="", description="Path to Temporal TLS client cert")
    temporal_tls_key: str = Field(default="", description="Path to Temporal TLS client key")
    temporal_max_workflow_tasks: int = Field(
        default=10, description="Max concurrent workflow tasks for worker"
    )
    temporal_max_activities: int = Field(
        default=20, description="Max concurrent activities for worker"
    )

    # Redis Configuration
    redis_url: str = Field(default="redis://localhost:6379", description="Redis connection URL")
    redis_password: SecretStr | None = Field(default=None, description="Redis password")
    redis_ssl: bool = Field(default=False, description="Use SSL for Redis")

    # Supabase Configuration
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_service_role_key: SecretStr = Field(..., description="Supabase service role key")
    supabase_activity_key: SecretStr = Field(
        default=SecretStr(""), description="Least-privilege key/JWT for workflow activities"
    )
    supabase_db_url: SecretStr = Field(..., description="Direct Supabase PostgreSQL URL")

    # LLM Configuration
    # APEX Policy: Only 'groq' and 'anthropic' are permitted providers.
    # OPENAI_API_KEY is FORBIDDEN. No GPT model defaults.
    groq_api_key: SecretStr = Field(default=SecretStr(""), description="Groq key")
    anthropic_api_key: SecretStr = Field(default=SecretStr(""), description="Anthropic key")
    default_llm_provider: str = Field(default="anthropic", description="Default provider")
    default_llm_model: str = Field(
        default="anthropic/claude-sonnet-4-5",
        description="Default Anthropic planner model (LiteLLM format: provider/model)",
    )
    default_llm_temperature: float = Field(default=0.0, description="LLM temperature")

    # Semantic Cache Configuration
    cache_embedding_model: str = Field(
        default="all-MiniLM-L6-v2", description="Sentence-transformers model"
    )
    cache_similarity_threshold: float = Field(
        default=0.85, description="Minimum similarity for cache hit"
    )
    cache_ttl_seconds: int = Field(default=86400, description="Cache TTL (24h default)")

    # MAN Mode Configuration
    man_mode_blocking_threshold: float = Field(
        default=0.90, description="Risk score threshold for blocking (0.0-1.0)"
    )

    # Application Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    environment: str = Field(default="development", description="Environment name")
    max_workflow_history_size: int = Field(
        default=1000, description="Max events before continue-as-new"
    )

    slack_alert_webhook_url: SecretStr | None = Field(
        default=None,
        description=(
            "Slack incoming webhook URL for DLQ and critical "
            "failure alerts. Set SLACK_ALERT_WEBHOOK_URL "
            "environment variable to enable."
        ),
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        """Ensure security-sensitive settings are provided in production."""
        if self.environment == "production" and (
            not self.redis_password or not self.redis_password.get_secret_value()
        ):
            raise ValueError("redis_password must be set in production")

        # APEX Policy: default_llm_provider must be 'anthropic' or 'groq'
        if self.default_llm_provider not in ("anthropic", "groq"):
            raise ValueError(f"Invalid default_llm_provider: '{self.default_llm_provider}'")

        # APEX Policy: Planner defaults must not be OpenAI/GPT
        if self.default_llm_model.startswith(("gpt-", "openai/", "text-davinci")):
            raise ValueError(
                f"Model '{self.default_llm_model}' is forbidden by APEX policy. "
                "Use 'anthropic/claude-*' or 'groq/llama-*'."
            )

        if self.environment == "production":
            import os

            require_sig = os.environ.get("ORCHESTRATOR_REQUIRE_SIGNATURE", "").lower()
            if require_sig in ("false", "0", "no"):
                raise ValueError("ORCHESTRATOR_REQUIRE_SIGNATURE cannot be disabled in production")

            # In production, require Anthropic key for planner
            if not self.anthropic_api_key.get_secret_value():
                raise ValueError("anthropic_api_key must be set in production")

        return self


# Global settings instance
settings = Settings()  # type: ignore[call-arg]
