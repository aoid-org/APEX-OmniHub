# APEX OmniHub — Audit & Deprecation Log

> **Generated:** 2026-03-21
> **Protocol Target:** MCP (Model Context Protocol) + A2A (Agent-to-Agent) over JSON-RPC 2.0
> **Transport Mandate:** HTTP + Server-Sent Events (SSE). Polling prohibited.
> **Pattern:** Strangler Fig — non-destructive migration

---

## 1. Legacy Proprietary Connectors Identified

### 1.1 OmniConnect Connector Layer (`src/omniconnect/`)

| Legacy Component | Path | Current Protocol | MCP/A2A Replacement |
|---|---|---|---|
| `BaseConnector` | `src/omniconnect/connectors/base.ts` | Custom OAuth2 + REST | **MCP Server** — Each provider becomes an MCP server exposing tools via JSON-RPC 2.0 |
| `MetaBusinessConnector` | `src/omniconnect/connectors/meta-business.ts` | Custom REST + OAuth2 | **MCP Server: `meta-business`** — Expose `fetchDelta`, `normalizeToCanonical` as MCP tools |
| `ConnectorRegistry` | `src/omniconnect/core/registry.ts` | In-memory registry | **MCPServerRegistry** — Already exists at `src/core/mcp/MCPServerRegistry.ts`. Migrate registrations |
| `OmniPort (Ingress)` | `src/omniconnect/ingress/` | Custom multimodal normalizer | **MCP Resource** — Expose as MCP resource endpoint with SSE streaming |
| `OmniLink (Delivery)` | `src/omniconnect/delivery/` | Custom delivery pipeline | **A2A Task** — Convert to A2A task artifact delivery with streaming updates |
| `PolicyEngine` | `src/omniconnect/policy/` | Custom validation | **Triforce Guardian Middleware** — Migrate to gateway-level schema validation interceptor |
| `SemanticTranslator` | `src/omniconnect/translation/` | Custom translation | **A2A Semantic Router** — Integrate into gateway semantic routing layer |
| `EntitlementsService` | `src/omniconnect/entitlements/` | Custom entitlements | **AegisKernel + RBAC** — Merge into Triforce Guardian dynamic RBAC |
| `EncryptedTokenStorage` | `src/omniconnect/storage/` | Custom encrypted store | **Supabase Vault** — Migrate to Supabase-backed encrypted token cache |
| `AuthSessionStorage` | `src/omniconnect/storage/` | Custom session store | **MCP Auth** — Standardize via MCP authentication flow |

### 1.2 API Edge Routes (`api/`)

| Legacy Component | Path | Current Protocol | MCP/A2A Replacement |
|---|---|---|---|
| `omnibridge/ingest` | `api/omnibridge/ingest.ts` | Custom HMAC webhook | **OmniHub Gateway JSON-RPC Handler** — Ingest via JSON-RPC 2.0 with UUIDv5 idempotency |
| `omnibridge/token` | `api/omnibridge/token.ts` | Custom token endpoint | **MCP Auth Flow** — Standard MCP authentication handshake |
| `omniconnect/exchange` | `api/omniconnect/exchange.ts` | Custom OAuth exchange | **MCP Server Auth** — Per-server OAuth via MCP config |
| `rate-limiter` | `api/middleware/rate-limiter.ts` | Vercel KV polling | **Triforce Guardian** — Rate limiting as gateway middleware with SSE backpressure |

### 1.3 Supabase Edge Functions (`supabase/functions/`)

| Legacy Component | Current Protocol | MCP/A2A Replacement |
|---|---|---|
| `omnilink-agent` | Custom OAuth exchange | **MCP Server** — Agent auth via MCP server handshake |
| `omnilink-port` | Custom multimodal normalization | **MCP Resource** — Multimodal input as MCP resource stream |
| `omnilink-eval` | Custom integration eval | **A2A Task** — Evaluation as A2A workflow task |
| `omni-runs` | Custom workflow tracking | **A2A Task Streaming** — Workflow status via A2A task artifacts + SSE |
| `apex-voice` | Custom voice processing | **MCP Server: `apex-voice`** — Voice tools via JSON-RPC 2.0 |
| `apex-assistant` | Custom AI assistant | **A2A Agent** — Full A2A agent with Agent Card + task protocol |
| `trigger-workflow` | Custom workflow dispatch | **A2A Task** — Temporal workflow dispatch via A2A task creation |
| `byom-cockpit` / `byom-proxy` | Custom model proxy | **TokenEconomicsRouter** — Asymmetric model routing via gateway |
| `generate-business-skills` | Custom skill generation | **MCP Tool** — Expose as discoverable MCP tool |
| `create-checkout` / `stripe-webhook` | Custom Stripe integration | **MCP Server: `stripe`** — Payment tools via MCP |
| `alchemy-webhook` / `verify-nft` | Custom Web3 hooks | **MCP Server: `web3`** — Blockchain tools via MCP |

### 1.4 Gateway Layer (`src/core/gateway/`)

| Legacy Component | Path | Status |
|---|---|---|
| `ApexRealtimeGateway` | `src/core/gateway/ApexRealtimeGateway.ts` | **RETAIN** — WebSocket proxy for OpenAI Realtime remains; add MCP bridge adapter |
| `OmniRoute` | `src/core/gateway/OmniRoute.ts` | **SUPERSEDED** — Replace with `TokenEconomicsRouter` in omnihub-gateway |
| `TaskComplexityScorer` | `src/core/gateway/TaskComplexityScorer.ts` | **ABSORBED** — Logic folded into `TokenEconomicsRouter` |
| `ModelRegistry` | `src/core/gateway/ModelRegistry.ts` | **ABSORBED** — Model capabilities folded into `TokenEconomicsRouter` |
| `RoutePolicy` | `src/core/gateway/RoutePolicy.ts` | **ABSORBED** — Policies folded into Triforce Guardian |

### 1.5 Existing MCP Layer (`src/core/mcp/`)

| Component | Path | Status |
|---|---|---|
| `MCPConfig` | `src/core/mcp/mcp.config.ts` | **RETAIN** — Extend with A2A agent card fields |
| `MCPTransport` | `src/core/mcp/MCPTransport.ts` | **RETAIN** — Add dedicated SSE transport class |
| `MCPServerRegistry` | `src/core/mcp/MCPServerRegistry.ts` | **RETAIN** — Extend to register A2A agents |
| `MCPToolDiscovery` | `src/core/mcp/MCPToolDiscovery.ts` | **RETAIN** — Extend for A2A capability discovery |
| `MCPHostManager` | `src/core/mcp/MCPHostManager.ts` | **RETAIN** — Wire into OmniHub Gateway as upstream host |

---

## 2. Migration Priority

| Priority | Component | Effort | Risk |
|---|---|---|---|
| P0 | OmniHub Gateway scaffold (JSON-RPC + SSE) | Medium | Low — new isolated module |
| P0 | IdempotencyManager (UUIDv5 + Supabase cache) | Low | Low — replaces in-memory ChronosLock |
| P0 | TokenEconomicsRouter | Medium | Low — supersedes OmniRoute |
| P1 | A2A Agent Card + Semantic Router | Medium | Medium — new protocol |
| P1 | Triforce Guardian middleware | Medium | Medium — security-critical |
| P2 | MAN Mode (HITL gating) | Low | Low — stub only |
| P2 | Legacy connector strangling | High | Medium — requires per-provider migration |

---

## 3. Non-Destructive Migration Rules

1. **No existing imports are broken** — All new code lives in `/src/omnihub-gateway/`
2. **Existing services remain functional** — Legacy connectors continue operating during migration
3. **Feature flags control traffic** — When ready, traffic shifts from legacy to gateway via config
4. **Rollback is instant** — Gateway can be bypassed by reverting config without code changes

---

*APEX Business Systems Ltd. — Intelligence Designed.*
