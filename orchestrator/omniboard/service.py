import logging
import uuid
from typing import Any

logger = logging.getLogger(__name__)


class OmniBoardService:
    """
    Service layer for OmniBoard.

    Handles:
    - Provider Registry Lookup (mocked)
    - Fuzzy Matching
    - Vault Storage (mocked)
    - OmniPort Registration (mocked)
    """

    # Mock Registry
    KNOWN_PROVIDERS = [
        "Gmail",
        "Slack",
        "Salesforce",
        "HubSpot",
        "Notion",
        "Linear",
        "Jira",
        "GitHub",
    ]

    @classmethod
    def fuzzy_match_provider(cls, input_text: str) -> list[str]:
        """
        Fuzzy match provider names against query string.

        Matching rules (in priority order):
        1. Exact match (case-insensitive)
        2. Starts with query
        3. Contains query as substring
        4. Query contains provider name (reverse match)

        Returns matches sorted by relevance:
        - Exact matches first
        - Shorter names before longer (more specific)
        - Alphabetical within same length

        Security: Returns empty list for empty/whitespace input.
        """
        query_clean = input_text.strip()

        # Early exit for empty queries (Security)
        if not query_clean:
            return []

        query_lower = query_clean.lower()
        matches = []

        for provider in cls.KNOWN_PROVIDERS:
            provider_lower = provider.lower()
            score = 0

            # Exact match
            if provider_lower == query_lower:
                score = 1000
            # Starts with query
            elif provider_lower.startswith(query_lower):
                score = 500
            # Contains query
            elif query_lower in provider_lower:
                score = 250
            # Reverse: query contains provider
            elif provider_lower in query_lower:
                score = 100

            if score > 0:
                # Penalize longer names (tie-breaker)
                score -= len(provider) * 0.1
                matches.append((score, provider))

        # Sort by score (descending), then provider name (ascending)
        matches.sort(key=lambda x: (-x[0], x[1]))

        return [provider for _, provider in matches]

    @classmethod
    def generate_oauth_url(cls, provider: str, tenant_id: str) -> str:
        """
        MOCK: Generates an OAuth authorization URL.
        In real life, this would call endpoints or use a library to generate
        a PAR/PKCE URL for the specific provider.
        """
        base_url = "https://mock-oauth.omniboard.dev/authorize"
        return f"{base_url}?provider={provider}&tenant={tenant_id}&response_type=code"

    @classmethod
    def validate_api_key(cls, _provider: str, api_key: str) -> bool:
        """
        MOCK: Validates an API Key format/validity locally if possible.
        """
        return bool(api_key and len(api_key) >= 10)

    @classmethod
    def initiate_device_code_flow(cls, _provider: str) -> dict[str, str]:
        """
        MOCK: Initiates Device Code flow.
        Returns dict with 'user_code', 'verification_uri', 'device_code', etc.
        """
        return {
            "user_code": "ABCD-1234",
            "verification_uri": "https://device.mock-provider.com/activate",
            "device_code": f"dev_{uuid.uuid4()}",
            "expires_in": "1800",
        }

    @classmethod
    def store_credentials_in_vault(
        cls, tenant_id: str, provider: str, _credentials: dict[str, Any]
    ) -> str:
        """
        MOCK: Stores credentials in Vault and returns token_ref.
        """
        token_ref = f"vault://{tenant_id}/{provider.lower()}/token"
        logger.info(f"Storing credentials for {provider} in {token_ref}")
        # In real impl: vault_client.write(token_ref, credentials)
        return token_ref

    @classmethod
    def verify_connection(cls, provider: str, token_ref: str) -> dict[str, Any]:
        """
        MOCK: Performs connectivity check.
        Returns detailed verification result.
        """
        logger.info(f"Verifying connection to {provider} using {token_ref}")

        # 1. Least Privilege Ping
        ping_ok = True

        # 2. Token Introspection (Scope check)
        scopes_ok = True

        # Mock failure for specific token
        if "fail_ping" in token_ref:
            ping_ok = False
        if "fail_scope" in token_ref:
            scopes_ok = False

        return {
            "verified": ping_ok and scopes_ok,
            "ping": ping_ok,
            "introspection": scopes_ok,
            "provider_id": "user_12345",  # Mock identity from introspection
        }

    @classmethod
    def register_with_omniport(cls, _tenant_id: str, provider: str, _token_ref: str) -> str:
        """
        MOCK: Registers connection in OmniPort.
        Returns connection_id.
        """
        connection_id = f"conn_{uuid.uuid4()}"
        logger.info(f"Registered {connection_id} for {provider}")
        return connection_id

    @classmethod
    def disconnect_provider(cls, connection_id: str) -> bool:
        """MOCK: Disconnects a provider."""
        logger.info(f"Disconnecting {connection_id}")
        return True

    @classmethod
    def rotate_credentials(cls, connection_id: str) -> str:
        """MOCK: Rotates credentials. Returns new token ref."""
        logger.info(f"Rotating credentials for {connection_id}")
        return f"vault://rotated/{connection_id}/token"
