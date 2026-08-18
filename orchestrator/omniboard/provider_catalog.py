"""
OmniBoard Provider Catalog — Registry and Endpoint Resolution.

Defines the out-of-the-box known SaaS, AI, and Financial providers,
POSIX slug normalization, and well-known verification endpoints.
"""

from __future__ import annotations

KNOWN_PROVIDERS: list[str] = [
    # AI Frontiers & Agents
    "Claude",
    "ChatGPT",
    "Gemini",
    "Grok",
    "Perplexity",
    "Google Antigravity 2.0",
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

WELL_KNOWN_USERINFO_ENDPOINTS: dict[str, str] = {
    "google antigravity 2.0": "https://antigravity.google.dev/api/v2/auth/verify",
    "google antigravity": "https://antigravity.google.dev/api/v2/auth/verify",
    "google-antigravity": "https://antigravity.google.dev/api/v2/auth/verify",
    "antigravity": "https://antigravity.google.dev/api/v2/auth/verify",
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


def normalize_slug(provider: str) -> str:
    """Returns uppercase POSIX-compatible environment variable slug."""
    return provider.upper().replace(" ", "_").replace("-", "_").replace(".", "_")


def get_userinfo_endpoint(provider: str, custom_endpoint: str | None = None) -> str:
    """Resolves userinfo endpoint via custom DB registry, well-known mapping, or fallback."""
    if custom_endpoint:
        return custom_endpoint
    key = provider.lower().strip()
    if key in WELL_KNOWN_USERINFO_ENDPOINTS:
        return WELL_KNOWN_USERINFO_ENDPOINTS[key]
    clean_name = key.replace(" ", "").replace("-", "").replace(".", "")
    return f"https://api.{clean_name}.com/v1/userinfo"
