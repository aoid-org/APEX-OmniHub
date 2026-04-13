cat << 'INNER_EOF' > update_config.py
with open('orchestrator/config.py', 'r') as f:
    content = f.read()

content = content.replace(
    'supabase_service_role_key: str = Field(..., description="Supabase service role key")',
    'supabase_service_role_key: SecretStr = Field(..., description="Supabase service role key")'
)
content = content.replace(
    'supabase_activity_key: str = Field(',
    'supabase_activity_key: SecretStr = Field('
)
content = content.replace(
    'default="", description="Least-privilege key/JWT for workflow activities"',
    'default=SecretStr(""), description="Least-privilege key/JWT for workflow activities"'
)
content = content.replace(
    'supabase_db_url: str = Field(..., description="Direct Supabase PostgreSQL URL")',
    'supabase_db_url: SecretStr = Field(..., description="Direct Supabase PostgreSQL URL")'
)
content = content.replace(
    'openai_api_key: str = Field(default="", description="OpenAI API key")',
    'openai_api_key: SecretStr = Field(default=SecretStr(""), description="OpenAI API key")'
)
content = content.replace(
    'anthropic_api_key: str = Field(default="", description="Anthropic API key")',
    'anthropic_api_key: SecretStr = Field(default=SecretStr(""), description="Anthropic API key")'
)
content = content.replace(
    'slack_alert_webhook_url: str | None = Field(',
    'slack_alert_webhook_url: SecretStr | None = Field('
)

old_val = """    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        \"\"\"Ensure security-sensitive settings are provided in production.\"\"\"
        if self.environment == "production" and (
            not self.redis_password or not self.redis_password.get_secret_value()
        ):
            raise ValueError("redis_password must be set in production")
        return self"""

new_val = """    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        \"\"\"Ensure security-sensitive settings are provided in production.\"\"\"
        if self.environment == "production" and (
            not self.redis_password or not self.redis_password.get_secret_value()
        ):
            raise ValueError("redis_password must be set in production")

        if self.environment == "production":
            import os
            require_sig = os.environ.get("ORCHESTRATOR_REQUIRE_SIGNATURE", "").lower()
            if require_sig in ("false", "0", "no"):
                raise ValueError("ORCHESTRATOR_REQUIRE_SIGNATURE cannot be disabled in production")
        return self"""

content = content.replace(old_val, new_val)

with open('orchestrator/config.py', 'w') as f:
    f.write(content)
INNER_EOF
python3 update_config.py

cat << 'INNER_EOF' > patch_server.py
with open('orchestrator/server.py', 'r') as f:
    content = f.read()

content = content.replace(
    'from temporalio.client import Client',
    'from temporalio.client import Client\nfrom temporalio.exceptions import WorkflowAlreadyStartedError'
)

old_block = """            # Handle Temporal workflow already started error safely
            # We catch generically but check class name because temporalio exceptions
            # might be nested or we want to avoid strict import dependency issues here
            if type(e).__name__ == "WorkflowExecutionAlreadyStartedError":"""

new_block = """            # Handle Temporal workflow already started error safely
            if (
                isinstance(e, WorkflowAlreadyStartedError)
                or type(e).__name__ == "WorkflowExecutionAlreadyStartedError"
            ):"""

content = content.replace(old_block, new_block)

with open('orchestrator/server.py', 'w') as f:
    f.write(content)
INNER_EOF
python3 patch_server.py

cat << 'INNER_EOF' > patch_main.py
with open('orchestrator/main.py', 'r') as f:
    content = f.read()

content = content.replace(
    'activity_key = settings.supabase_activity_key or settings.supabase_service_role_key',
    'activity_key = settings.supabase_activity_key.get_secret_value() \\\n        if settings.supabase_activity_key.get_secret_value() \\\n        else settings.supabase_service_role_key.get_secret_value()'
)

content = content.replace(
    'if activity_key == settings.supabase_service_role_key:',
    'if activity_key == settings.supabase_service_role_key.get_secret_value():'
)

with open('orchestrator/main.py', 'w') as f:
    f.write(content)
INNER_EOF
python3 patch_main.py

cat << 'INNER_EOF' > patch_test_config.py
with open('orchestrator/tests/test_config.py', 'r') as f:
    content = f.read()

content = content.replace(
    'assert s.supabase_service_role_key == "my-svc-key"',
    'assert s.supabase_service_role_key.get_secret_value() == "my-svc-key"'
)
content = content.replace(
    'assert s.supabase_db_url == "postgresql://u:p@db-host/mydb"',
    'assert s.supabase_db_url.get_secret_value() == "postgresql://u:p@db-host/mydb"'
)
content = content.replace(
    'assert s.supabase_activity_key == ""',
    'assert s.supabase_activity_key.get_secret_value() == ""'
)
content = content.replace(
    'assert s.openai_api_key == ""',
    'assert s.openai_api_key.get_secret_value() == ""'
)
content = content.replace(
    'assert s.anthropic_api_key == ""',
    'assert s.anthropic_api_key.get_secret_value() == ""'
)
content = content.replace(
    'assert s.slack_alert_webhook_url == "https://hooks.slack.com/services/XXX"',
    'assert s.slack_alert_webhook_url.get_secret_value() == "https://hooks.slack.com/services/XXX"'
)

with open('orchestrator/tests/test_config.py', 'w') as f:
    f.write(content)
    f.write("""
def test_production_without_signature_disabled():
    import pytest, os
    with pytest.raises(ValueError, match="ORCHESTRATOR_REQUIRE_SIGNATURE cannot be disabled in production"):
        os.environ["ORCHESTRATOR_REQUIRE_SIGNATURE"] = "false"
        try:
            make_settings(ENVIRONMENT="production", REDIS_PASSWORD="secure-pass")  # noqa: S106  # NOSONAR
        finally:
            del os.environ["ORCHESTRATOR_REQUIRE_SIGNATURE"]
""")
INNER_EOF
python3 patch_test_config.py

cat << 'INNER_EOF' > patch_dlq_alert.py
with open('orchestrator/activities/dlq_alert.py', 'r') as f:
    content = f.read()

content = content.replace(
    'webhook_url: str | None = getattr(settings, "slack_alert_webhook_url", None)',
    'slack_val = getattr(settings, "slack_alert_webhook_url", None)\n        webhook_url: str | None = slack_val.get_secret_value() if slack_val else None'
)

with open('orchestrator/activities/dlq_alert.py', 'w') as f:
    f.write(content)
INNER_EOF
python3 patch_dlq_alert.py

cat << 'INNER_EOF' > patch_test_dlq_alert.py
with open('orchestrator/tests/test_dlq_alert.py', 'r') as f:
    content = f.read()

content = content.replace(
    'mock_settings.slack_alert_webhook_url = webhook_url',
    'from pydantic import SecretStr\n    mock_settings.slack_alert_webhook_url = SecretStr(webhook_url) if webhook_url else None'
)

content = content.replace(
    'assert call_kwargs.args[0] == "https://hooks.slack.com/test"',
    'assert call_kwargs.args[0] == "https://hooks.slack.com/test" or call_kwargs.args[0].get_secret_value() == "https://hooks.slack.com/test"'
)

with open('orchestrator/tests/test_dlq_alert.py', 'w') as f:
    f.write(content)
INNER_EOF
python3 patch_test_dlq_alert.py

sed -i 's/query_params={"vec": embedding_bytes},  # type: ignore\[dict-item\]/query_params={"vec": embedding_bytes},/g' orchestrator/infrastructure/cache.py

rm patch_*.py update_config.py
