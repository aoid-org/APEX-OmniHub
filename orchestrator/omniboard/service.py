import json
import logging
import os
import uuid
from typing import Any

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client  # type: ignore

from providers.database.factory import get_database_provider

from ._redis import get_omniboard_redis

logger = logging.getLogger(__name__)


def _omniboard_mock_oauth_enabled() -> bool:
    """Mock OAuth endpoints are reachable only when explicitly enabled (non-prod)."""
    return os.environ.get("OMNIBOARD_MOCK_OAUTH", "false").lower() == "true"


class OmniBoardService:
    """
    Service layer for OmniBoard.

    Handles:
    - Provider Registry Lookup (env-var driven; set OMNIBOARD_MOCK_OAUTH=true for local dev)
    - Fuzzy Matching
    - Vault Storage (Supabase-backed via SUPABASE_ACTIVITY_KEY)
    - OmniPort Registration (via OmniPort API)
    """

    @classmethod
    async def get_known_providers(cls) -> list[str]:
        """
        Query Supabase provider_registry table and cache in Redis.
        """
        cache_key = "omni:cache:providers"
        redis_client = get_omniboard_redis()
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            from typing import cast

            from providers.database.supabase_provider import SupabaseDatabaseProvider

            db = cast(SupabaseDatabaseProvider, get_database_provider())
            res = await db.select(table="provider_registry", select_fields="name")
            providers = [r["name"] for r in res if "name" in r]

            if providers:
                await redis_client.setex(cache_key, 300, json.dumps(providers))
            return providers
        finally:
            await redis_client.aclose()  # type: ignore[attr-defined]

    KNOWN_PROVIDERS = [
        # AI Frontiers & Agents
        "Claude",
        "ChatGPT",
        "Gemini",
        "Grok",
        "Perplexity",
        "Google Antigravity",
        "Google Jules",
        # Prediction Markets & Sports
        "Kalshi",
        "Polymarket",
        "ESPN",
        "NBA",
        "NFL",
        "NHL",
        # Google Workspace & Cloud Suite
        "Google Workspace",
        "Gmail",
        "Google Drive",
        "Google Docs",
        "Google Sheets",
        "Google Calendar",
        "Google Cloud",
        # Microsoft 365 & Cloud Suite
        "Microsoft 365",
        "Microsoft Teams",
        "Microsoft Outlook",
        "Microsoft Excel",
        "Microsoft Word",
        "Microsoft SharePoint",
        "Microsoft OneDrive",
        "Azure",
        # Open Banking & Fintech APIs
        "Plaid",
        "Mercury",
        "Brex",
        "Ramp",
        "Wise",
        "Revolut",
        "Square",
        "Xero",
        # Commercial & Retail Banking
        "Chase",
        "Bank of America",
        "Wells Fargo",
        "Citi",
        "Capital One",
        "RBC",
        "TD Bank",
        "Scotiabank",
        "BMO",
        "CIBC",
        # Wealth, Brokerage & Custody
        "Coinbase",
        "Robinhood",
        "Fidelity",
        "Charles Schwab",
        "Vanguard",
        # Developer & DevOps
        "GitHub",
        "GitLab",
        "Bitbucket",
        "Postman",
        "Sentry",
        "Datadog",
        # Collaboration & Messaging
        "Slack",
        "Discord",
        "Twilio",
        "Intercom",
        # Workspace & Productivity
        "Notion",
        "Trello",
        "Airtable",
        # Project & Task Management
        "Linear",
        "Jira",
        "Asana",
        "ClickUp",
        "Monday",
        # CRM & Sales
        "Salesforce",
        "HubSpot",
        "Pipedrive",
        "Zendesk",
        # Cloud Hosting & Infrastructure
        "AWS",
        "Cloudflare",
        "Vercel",
        # Finance, Payments & Commerce
        "Stripe",
        "QuickBooks",
        "Shopify",
        "PayPal",
        # Database & Data Infrastructure
        "Supabase",
        "Snowflake",
        "PostgreSQL",
        "MongoDB",
        "Redis",
    ]

    # Optimized lookup structures (cached)
    _LOWER_PROVIDERS_CACHE: list[tuple[str, str]] | None = None
    _EXACT_MATCH_DICT: dict[str, str] | None = None
    _LAST_KNOWN_PROVIDERS_ID: int | None = None

    @classmethod
    def _get_optimized_providers(cls) -> tuple[list[tuple[str, str]], dict[str, str]]:
        """
        Returns pre-calculated lowercase provider mappings and exact match dictionary.
        Detects if KNOWN_PROVIDERS has been replaced (e.g., in tests) and refreshes cache.
        """
        current_id = id(cls.KNOWN_PROVIDERS)
        if (
            cls._LOWER_PROVIDERS_CACHE is None
            or cls._EXACT_MATCH_DICT is None
            or current_id != cls._LAST_KNOWN_PROVIDERS_ID
        ):
            cls._LOWER_PROVIDERS_CACHE = [(p.lower(), p) for p in cls.KNOWN_PROVIDERS]
            cls._EXACT_MATCH_DICT = dict(cls._LOWER_PROVIDERS_CACHE)
            cls._LAST_KNOWN_PROVIDERS_ID = current_id
        return cls._LOWER_PROVIDERS_CACHE, cls._EXACT_MATCH_DICT

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

        lower_providers, exact_dict = cls._get_optimized_providers()

        # 1. Check for O(1) Exact match
        if query_lower in exact_dict:
            provider = exact_dict[query_lower]
            # Exact match score = 1000
            final_score: float = 1000 - len(provider) * 0.1
            matches.append((final_score, provider))
            # If we only wanted THE exact match we could return here,
            # but the original logic continues to find other partial matches.
            # To maintain EXACT original behavior, we skip the exact match in the loop below.

        for provider_lower, provider in lower_providers:
            score = 0

            # Skip if we already handled it as exact match
            if provider_lower == query_lower:
                continue

            # Starts with query
            if provider_lower.startswith(query_lower):
                score = 500
            # Contains query
            elif query_lower in provider_lower:
                score = 250
            # Reverse: query contains provider
            elif provider_lower in query_lower:
                score = 100

            if score > 0:
                # Penalize longer names (tie-breaker)
                final_score = score - len(provider) * 0.1
                matches.append((final_score, provider))

        # Sort by score (descending), then provider name (ascending)
        matches.sort(key=lambda x: (-x[0], x[1]))

        return [provider for _, provider in matches]

    _WELL_KNOWN_USERINFO_ENDPOINTS: dict[str, str] = {
        "github": "https://api.github.com/user",
        "slack": "https://slack.com/api/auth.test",
        "google": "https://www.googleapis.com/oauth2/v3/userinfo",
        "gmail": "https://www.googleapis.com/oauth2/v3/userinfo",
        "google workspace": "https://www.googleapis.com/oauth2/v3/userinfo",
        "google drive": "https://www.googleapis.com/oauth2/v3/userinfo",
        "google docs": "https://www.googleapis.com/oauth2/v3/userinfo",
        "google sheets": "https://www.googleapis.com/oauth2/v3/userinfo",
        "google calendar": "https://www.googleapis.com/oauth2/v3/userinfo",
        "google cloud": "https://www.googleapis.com/oauth2/v3/userinfo",
        "microsoft": "https://graph.microsoft.com/v1.0/me",
        "microsoft 365": "https://graph.microsoft.com/v1.0/me",
        "microsoft teams": "https://graph.microsoft.com/v1.0/me",
        "microsoft outlook": "https://graph.microsoft.com/v1.0/me",
        "microsoft excel": "https://graph.microsoft.com/v1.0/me",
        "microsoft word": "https://graph.microsoft.com/v1.0/me",
        "microsoft sharepoint": "https://graph.microsoft.com/v1.0/me",
        "microsoft onedrive": "https://graph.microsoft.com/v1.0/me",
        "azure": "https://management.azure.com/tenants?api-version=2020-01-01",
        "stripe": "https://api.stripe.com/v1/account",
        "linear": "https://api.linear.app/graphql",
        "notion": "https://api.notion.com/v1/users/me",
        "jira": "https://api.atlassian.com/me",
        "hubspot": "https://api.hubapi.com/account-info/v3/details",
        "salesforce": "https://login.salesforce.com/services/oauth2/userinfo",
        "gitlab": "https://gitlab.com/api/v4/user",
        "bitbucket": "https://api.bitbucket.org/2.0/user",
        "sentry": "https://sentry.io/api/0/users/me/",
        "datadog": "https://api.datadoghq.com/api/v1/validate",
        "discord": "https://discord.com/api/users/@me",
        "twilio": "https://api.twilio.com/2010-04-01/Accounts.json",
        "intercom": "https://api.intercom.io/me",
        "trello": "https://api.trello.com/1/members/me",
        "airtable": "https://api.airtable.com/v0/meta/whoami",
        "asana": "https://app.asana.com/api/1.0/users/me",
        "clickup": "https://api.clickup.com/api/v2/user",
        "monday": "https://api.monday.com/v2",
        "pipedrive": "https://api.pipedrive.com/v1/users/me",
        "zendesk": "https://api.zendesk.com/api/v2/users/me.json",
        "plaid": "https://production.plaid.com/institutions/get",
        "mercury": "https://api.mercury.com/api/v1/accounts",
        "brex": "https://platform.brexapis.com/v2/users/me",
        "ramp": "https://api.ramp.com/developer/v1/users",
        "wise": "https://api.transferwise.com/v1/me",
        "revolut": "https://b2b.revolut.com/api/1.0/accounts",
        "square": "https://connect.squareup.com/v2/locations",
        "xero": "https://api.xero.com/api.xro/2.0/Organisation",
        "coinbase": "https://api.coinbase.com/v2/user",
        "robinhood": "https://api.robinhood.com/user/",
        "supabase": "https://api.supabase.com/v1/projects",
        "cloudflare": "https://api.cloudflare.com/client/v4/user/tokens/verify",
        "vercel": "https://api.vercel.com/v2/user",
        "quickbooks": "https://quickbooks.api.intuit.com/v3/company",
        "shopify": "https://admin.shopify.com/api/version/shop.json",
        "paypal": "https://api-m.paypal.com/v1/identity/oauth2/userinfo",
    }

    @classmethod
    def _normalize_slug(cls, provider: str) -> str:
        """Returns uppercase POSIX-compatible environment variable slug."""
        return provider.upper().replace(" ", "_").replace("-", "_").replace(".", "_")

    @classmethod
    def _get_userinfo_endpoint(cls, provider: str, custom_endpoint: str | None = None) -> str:
        """Resolves userinfo endpoint via custom DB registry, well-known mapping, or fallback."""
        if custom_endpoint:
            return custom_endpoint
        key = provider.lower().strip()
        if key in cls._WELL_KNOWN_USERINFO_ENDPOINTS:
            return cls._WELL_KNOWN_USERINFO_ENDPOINTS[key]
        clean_name = key.replace(" ", "").replace("-", "").replace(".", "")
        return f"https://api.{clean_name}.com/v1/userinfo"

    @classmethod
    def generate_oauth_url(cls, provider: str, tenant_id: str) -> str:
        """
        Generates an OAuth authorization URL using authlib per-provider configuration.
        Reads CLIENT_ID, CLIENT_SECRET, REDIRECT_URI from env per provider slug.
        """
        slug = cls._normalize_slug(provider)
        client_id = os.environ.get(f"{slug}_CLIENT_ID")
        redirect_uri = os.environ.get(f"{slug}_REDIRECT_URI")

        if not client_id or not redirect_uri:
            if _omniboard_mock_oauth_enabled():
                return f"https://oauth.localdev.test/{provider}/authorize?state={tenant_id}"
            raise ValueError(
                f"[OmniBoard] Missing OAuth client config for {provider}. "
                f"Set {slug}_CLIENT_ID and {slug}_REDIRECT_URI. "
                "Set OMNIBOARD_MOCK_OAUTH=true to use mock endpoints in "
                "non-production environments."
            )

        auth_endpoint = os.environ.get(f"{slug}_AUTH_ENDPOINT")
        if not auth_endpoint:
            if _omniboard_mock_oauth_enabled():
                auth_endpoint = "https://oauth.localdev.test/authorize"
            else:
                raise ValueError(
                    f"[OmniBoard] Missing env var {slug}_AUTH_ENDPOINT. "
                    "Set OMNIBOARD_MOCK_OAUTH=true to use mock endpoints in "
                    "non-production environments."
                )

        client = AsyncOAuth2Client(client_id, redirect_uri=redirect_uri)
        uri, _state = client.create_authorization_url(
            auth_endpoint,
            state=tenant_id,
        )
        return uri

    @classmethod
    async def validate_api_key(cls, provider: str, api_key: str) -> bool:
        """
        Validates an API Key by calling the provider's userinfo_endpoint.
        Returns True only if the key is valid (HTTP 200).
        """
        if not api_key or len(api_key) < 10:
            return False

        db = get_database_provider()
        res = await db.select(
            table="provider_registry",
            select_fields="userinfo_endpoint",
            filters={"name": provider},
        )

        custom_endpoint = (
            res[0].get("userinfo_endpoint") if res and res[0].get("userinfo_endpoint") else None
        )
        endpoint = cls._get_userinfo_endpoint(provider, custom_endpoint)

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    endpoint, headers={"Authorization": f"Bearer {api_key}"}
                )
                return response.status_code == 200
            except Exception as e:
                logger.exception(f"API key validation failed: {e}")
                return False

    @classmethod
    async def initiate_device_code_flow(cls, provider: str) -> dict[str, str]:
        """
        Initiates Device Code flow via POST to provider's device_authorization_endpoint.
        """
        endpoint: str | None = None
        try:
            db = get_database_provider()
            res = await db.select(
                table="provider_registry",
                select_fields="device_authorization_endpoint",
                filters={"name": provider},
            )
            if res and res[0].get("device_authorization_endpoint"):
                endpoint = res[0]["device_authorization_endpoint"]
        except Exception:
            endpoint = None

        if not endpoint:
            if _omniboard_mock_oauth_enabled():
                endpoint = "https://oauth.localdev.test/device"
            else:
                raise ValueError(
                    f"[OmniBoard] No device_authorization_endpoint registered for "
                    f"{provider}. Set OMNIBOARD_MOCK_OAUTH=true to use mock endpoints "
                    "in non-production environments."
                )

        slug = cls._normalize_slug(provider)
        client_id = os.environ.get(f"{slug}_CLIENT_ID")
        if not client_id:
            if _omniboard_mock_oauth_enabled():
                return {
                    "device_code": "localdev-device-code",
                    "user_code": "LOCALDEV",
                    "verification_uri": "https://oauth.localdev.test/verify",
                }
            raise ValueError(
                f"[OmniBoard] Missing env var {slug}_CLIENT_ID for device code flow. "
                "Set OMNIBOARD_MOCK_OAUTH=true to use mock endpoints in "
                "non-production environments."
            )

        async with httpx.AsyncClient() as client:
            response = await client.post(endpoint, data={"client_id": client_id})
            response.raise_for_status()
            data = response.json()
            return {
                "user_code": data.get("user_code", ""),
                "verification_uri": data.get("verification_uri", ""),
                "device_code": data.get("device_code", ""),
                "expires_in": str(data.get("expires_in", "1800")),
            }

    @classmethod
    async def store_credentials_in_vault(
        cls, tenant_id: str, provider: str, credentials: dict[str, Any]
    ) -> str:
        """
        Stores credentials in Upstash Redis.
        """
        token_ref = f"omni:vault:creds:{provider}:{tenant_id}"
        logger.info(f"Storing credentials for {provider} in {token_ref}")

        redis_client = get_omniboard_redis()
        try:
            await redis_client.setex(token_ref, 3600, json.dumps(credentials))
        finally:
            await redis_client.aclose()  # type: ignore[attr-defined]

        return token_ref

    @classmethod
    async def verify_connection(cls, provider: str, token_ref: str) -> dict[str, Any]:
        """
        Performs connectivity check via least-privilege API call.
        """
        logger.info(f"Verifying connection to {provider} using {token_ref}")

        redis_client = get_omniboard_redis()
        try:
            creds_json = await redis_client.get(token_ref)
            if not creds_json:
                raise ValueError(f"No credentials found at {token_ref}")
            creds = json.loads(creds_json)
        finally:
            await redis_client.aclose()  # type: ignore[attr-defined]

        access_token = creds.get("access_token")

        db = get_database_provider()
        res = await db.select(
            table="provider_registry", select_fields="userinfo_endpoint", filters={"name": provider}
        )
        custom_endpoint = (
            res[0].get("userinfo_endpoint") if res and res[0].get("userinfo_endpoint") else None
        )
        endpoint = cls._get_userinfo_endpoint(provider, custom_endpoint)

        async with httpx.AsyncClient() as client:
            import time

            start = time.time()
            try:
                response = await client.get(
                    endpoint, headers={"Authorization": f"Bearer {access_token}"}
                )
                latency_ms = int((time.time() - start) * 1000)
                ping_ok = response.status_code == 200
            except Exception as e:
                logger.exception(f"Ping failed: {e}")
                ping_ok = False
                latency_ms = 0

            return {"ping_ok": ping_ok, "latency_ms": latency_ms}

    @classmethod
    async def register_with_omniport(cls, tenant_id: str, provider: str, _token_ref: str) -> str:
        """
        Registers connection in OmniPort via Supabase.
        """
        db = get_database_provider()
        connection_id = str(uuid.uuid4())
        await db.insert(
            table="connections",
            record={
                "id": connection_id,
                "user_id": tenant_id,
                "provider": provider,
                "created_at": "now()",
            },
        )
        logger.info(f"Registered {connection_id} for {provider}")
        return connection_id

    @classmethod
    async def disconnect_provider(cls, connection_id: str, tenant_id: str, provider: str) -> bool:
        """
        Disconnects a provider: sets status='revoked' in DB, deletes Redis token.
        """
        logger.info(f"Disconnecting connection {connection_id}")

        db = get_database_provider()
        await db.update(
            table="connections",
            updates={"status": "revoked"},
            filters={"id": connection_id},
        )

        token_ref = f"omni:vault:creds:{provider}:{tenant_id}"
        redis_client = get_omniboard_redis()
        try:
            await redis_client.delete(token_ref)
        finally:
            await redis_client.aclose()  # type: ignore[attr-defined]

        return True

    @classmethod
    async def rotate_credentials(
        cls, connection_id: str, tenant_id: str, provider: str, refresh_token: str
    ) -> str:
        """
        Rotates credentials via OAuth refresh flow.

        POSTs to token_endpoint, stores new token in Redis, updates DB expiry.
        """
        db = get_database_provider()
        res = await db.select(
            table="provider_registry",
            select_fields="token_endpoint",
            filters={"name": provider},
        )

        if not res or not res[0].get("token_endpoint"):
            token_endpoint = f"https://api.{provider.lower()}.com/oauth/token"
        else:
            token_endpoint = res[0]["token_endpoint"]

        slug = provider.upper()
        client_id = os.environ.get(f"{slug}_CLIENT_ID")
        client_secret = os.environ.get(f"{slug}_CLIENT_SECRET")

        if not client_id or not client_secret:
            raise ValueError(f"Missing OAuth credentials for {provider}")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_endpoint,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
            )
            response.raise_for_status()
            new_token_data = response.json()

        token_ref = f"omni:vault:creds:{provider}:{tenant_id}"
        redis_client = get_omniboard_redis()
        try:
            await redis_client.setex(token_ref, 3600, json.dumps(new_token_data))
        finally:
            await redis_client.aclose()  # type: ignore[attr-defined]

        await db.update(
            table="connections",
            updates={"updated_at": "now()"},
            filters={"id": connection_id},
        )

        logger.info(f"Rotated credentials for {connection_id}")
        return token_ref
