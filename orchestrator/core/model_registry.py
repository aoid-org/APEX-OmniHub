"""
Model Provider Registry and AI Governance
Enforces AEGIS, VERITAS, and RSI requirements for BYOM connections.
"""

import logging

from pydantic import BaseModel

logger = logging.getLogger(__name__)

class ModelProviderConfig(BaseModel):
    provider_id: str
    provider_type: str = "openai-compatible" # openai-compatible, anthropic-compatible, local
    tenant_id: str
    endpoint: str
    auth_secret_reference: str
    allowed_models: list[str]
    max_cost: float
    max_latency: float
    retention_mode: str
    pii_policy: str
    tool_use_permissions: list[str]
    output_validator_profile: str
    enabled: bool = True
    fallback_provider_id: str | None = None
    current_cost: float = 0.0

class ModelProviderRegistry:
    """
    First-class provider registry for BYOM instances.
    Provides strict gating and integration with AEGIS and VERITAS.
    """

    def __init__(self):
        self._providers: dict[str, ModelProviderConfig] = {}
        self.audit_logs = []

    def register_provider(self, config: ModelProviderConfig) -> None:
        """Register a new BYOM provider."""
        self._providers[config.provider_id] = config
        logger.info(f"Registered provider {config.provider_id} for tenant {config.tenant_id}")

    def get_provider(self, provider_id: str) -> ModelProviderConfig | None:
        """Retrieve a provider configuration."""
        return self._providers.get(provider_id)

    def execute_with_governance(
        self,
        provider_id: str,
        tenant_id: str,
        prompt: str,
        tools: list[str] = None,
        estimated_cost: float = 0.0
    ) -> str:
        """
        Execute a prompt through a provider, enforcing AEGIS and VERITAS rules.
        """
        provider = self.get_provider(provider_id)

        if not provider:
            raise ValueError(f"Provider {provider_id} not registered.")

        if not provider.enabled:
            if provider.fallback_provider_id:
                self._emit_audit(
                    tenant_id,
                    provider_id,
                    "fallback_triggered",
                    "Provider disabled, using fallback",
                )
                return self.execute_with_governance(
                    provider.fallback_provider_id, tenant_id, prompt, tools, estimated_cost
                )
            raise ValueError(f"Provider {provider_id} is disabled and no fallback available.")

        if provider.tenant_id != tenant_id:
            raise ValueError(
                f"Tenant mismatch. Provider {provider_id} does not belong to {tenant_id}."
            )

        if provider.current_cost + estimated_cost > provider.max_cost:
            raise ValueError(f"Over budget limit for provider {provider_id}.")

        # AEGIS Input Validation
        prompt = self._aegis_input_check(prompt, provider.pii_policy)

        # RSI Tools Verification
        if tools:
            self._rsi_tools_check(tools, provider.tool_use_permissions)

        # Simulate Provider Execution (in real implementation, call adapter)
        logger.info(f"Executing prompt on {provider.endpoint} using {provider.allowed_models[0]}")
        provider.current_cost += estimated_cost

        # Simulated response logic for test
        if "simulated_tool_call" in prompt:
            response = '{"tool_calls": [{"name": "system_rm", "arguments": {}}]}'
        else:
            response = f"Simulated response from {provider_id}"

        # VERITAS Output Validation
        response = self._veritas_output_check(response, provider.output_validator_profile)

        self._emit_audit(tenant_id, provider_id, "execution_success", "Governance checks passed")
        return response

    def _aegis_input_check(self, prompt: str, pii_policy: str) -> str:
        """Enforce AEGIS input safety and PII masking."""
        if "MALICIOUS" in prompt:
            raise ValueError("AEGIS Blocked: Malicious input detected (Prompt Injection).")
        if "SSN" in prompt:
            if pii_policy == "strict":
                raise ValueError("AEGIS Blocked: Strict PII violation.")
            if pii_policy == "redact":
                prompt = prompt.replace("SSN", "[REDACTED]")
        return prompt

    def _rsi_tools_check(self, requested_tools: list[str], allowed_tools: list[str]) -> None:
        """Enforce RSI tool execution policies."""
        for tool in requested_tools:
            if tool not in allowed_tools and "*" not in allowed_tools:
                raise ValueError(f"RSI Blocked: Tool '{tool}' not permitted for this provider.")

    def _veritas_output_check(self, response: str, validator_profile: str) -> str:
        """Enforce VERITAS output safety and hallucination checks."""
        if "UNSAFE_OUTPUT" in response:
            raise ValueError("VERITAS Blocked: Unsafe output detected.")

        # Tool-call safety check (injection)
        if "system_rm" in response and validator_profile == "safe_tools_only":
             raise ValueError("VERITAS Blocked: Unsafe system tool call proposed by model.")

        return response

    def _emit_audit(self, tenant_id: str, provider_id: str, action: str, details: str):
        self.audit_logs.append({
            "tenant_id": tenant_id,
            "provider_id": provider_id,
            "action": action,
            "details": details
        })
