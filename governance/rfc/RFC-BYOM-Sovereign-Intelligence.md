# RFC: BYOM Sovereign Intelligence Identity & Routing

## 1. Context
APEX-OmniHub has adopted a Sovereign Intelligence model for AI features (Connect AI / BYOM).
The previous architectural model relied on standard OAuth flows and central APEX routing for inference. The new paradigm shifts inference routing to the user's provided credentials, acting as the ultimate sovereign identifier for the workspace.

## 2. Architecture Impact
- **Identity Layer:** API Key = Login Credential = Workspace Identity = Model Routing Anchor.
- **Routing:** All prompts originating from a BYOM-enabled workspace bypass the central APEX inference endpoints and route through a stateless proxy (`byom-proxy`) directly to the user's chosen provider.
- **Security:** Credentials are AES-256-GCM encrypted in the Supabase Vault (`byom-cockpit`). The proxy decrypts credentials on-the-fly and streams completions, applying PII FlightC filtering in transit.
- **Economics:** Zero compute cost on the APEX platform for BYOM workspaces. Users bring their own compute budgets.

## 3. Implementation Details
- Modified `ConnectAiAuthModal` to collect provider keys and authenticate directly via `byom-login`.
- Modified `mcp-client.ts` to intercept intent invocations when `omni_ai_provider` is set, routing to the BYOM proxy instead of `/api/mcp/invoke`.
- Enforced strict rate limiting and deterministic fingerprinting to correlate users without storing plaintext credentials.

## 4. Verification & SonarQube Compliance
All changes have been validated against SonarQube strict policies. Refactoring included cognitive complexity reduction in proxy Edge Functions and frontend adapters, alongside strict typings and access controls.

## 5. Rollback Plan
If issues arise, `VITE_CONNECT_AI_ENABLED` can be set to `false` in CI workflows, which hides the BYOM UI and falls back to legacy APEX routing.

**Status:** Approved & Implemented.
