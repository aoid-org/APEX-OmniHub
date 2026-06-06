# BYOM Architecture Record: Connect AI & Sovereign Intelligence

**Date:** 2026-06-06
**Context:** Integration of Bring Your Own Model (BYOM) capabilities into OmniHub via the `Connect AI` flow.

## Architectural Precepts

1. **API Key = Identity:**
   The user's provider API key acts as their login credential, workspace identity, and model routing anchor. No additional APEX credentials are required to leverage the OmniDash environment for BYOM users.

2. **Zero-Compute Guarantees:**
   By routing inference requests to the `byom-proxy` edge function, the OmniHub orchestrator eliminates backend model compute spend for these users. The payload is streamed directly from the configured provider (e.g., Anthropic, OpenAI) to the OmniSlate dashboard.

3. **Secure Vault (byom-cockpit):**
   The API keys are not stored in plaintext. They are encrypted at rest using AES-256-GCM encryption and decrypted strictly during edge inference using the tenant's context. 

4. **Dynamic Prompt Routing:**
   The frontend `mcp-client.ts` layer checks local storage for the `omni_ai_provider` configuration. When active, requests are routed directly to the BYOM endpoints via Supabase authentication, bypassing the standard APEX endpoints.

5. **FlightControl and Data Governance:**
   Even when using third-party models, requests are passed through APEX's `FlightControl` logic (when applicable) to ensure prompt-injection defense and PII redaction, maintaining the enterprise trust perimeter.
