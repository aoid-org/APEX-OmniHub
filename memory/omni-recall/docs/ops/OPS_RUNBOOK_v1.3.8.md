---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# APEX OmniHub — Ops Runbook v1.3.8

> **Version:** 1.3.8 | **Date:** 2026-03-02 | **Classification:** INTERNAL

---

## Overview

This runbook covers the three new subsystems introduced in v1.3.8:

| Subsystem     | Module Path                                                               | Purpose                                           |
| ------------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| OmniCognition | `src/core/cognition/`                                                     | Session memory, compression, entity indexing      |
| OmniRoute     | `src/core/gateway/`                                                       | Bifurcated LLM routing (Claude Opus ↔ Gemini Pro) |
| OmniMCP       | `src/core/mcp/`                                                           | Model Context Protocol host framework             |
| OmniVision    | `src/stores/omniVisionStore.ts`, `src/lib/media/VisionCacheController.ts` | Vision pipeline state + frame caching             |

---

## 1. OmniCognition — Session Memory Engine

### Architecture

```
User Action → CognitionManager.recordAction()
                    ↓
              Session Store (≤50 entries)
                    ↓ (auto-compress at threshold)
              compressionEngine.compressEntries()
                    ↓
              Summaries + Entity Index
                    ↓ (explicit promote)
              Brain (append-only long-term memory)
```

### Key Operations

| Operation        | Method                  | Risk | Notes                                              |
| ---------------- | ----------------------- | ---- | -------------------------------------------------- |
| Record action    | `recordAction()`        | None | Appends to session, updates token estimate         |
| Auto-compress    | Automatic at 50 entries | None | Primacy-recency split, middle compressed           |
| Promote to brain | `promoteToBrain()`      | Low  | Append-only, deduplication by content+source       |
| Load state       | `load()`                | Low  | Zod-validated, rejects invalid state with fallback |
| Entity lookup    | `lookupEntity()`        | None | In-memory index, O(1) by entity name               |

### Error Handling

- **Invalid state on load**: Zod rejects, falls back to defaults. Console error logged.
- **Compression failure**: Entries preserved. Summaries may be incomplete.
- **Token budget overflow**: Auto-compression triggered. If still over, oldest entries dropped.

### Diagnostic Commands

```bash
# Run cognition tests
npx vitest run tests/core/cognition

# Verify entity extraction patterns
npx vitest run tests/core/cognition/compressionEngine.spec.ts -t "extractEntities"
```

---

## 2. OmniRoute — Bifurcated LLM Routing

### Architecture

```
Task Description → TaskComplexityScorer.scoreTask()
                         ↓
                   DepthScore + Domain + Target
                         ↓
                   RoutePolicy.evaluatePolicy()
                         ↓ (override if rule matches)
                   ModelRegistry.validateRouteDecision()
                         ↓ (fallback if tokens exceed limit)
                   RouteDecision { target, cost, reasoning }
```

### Routing Rules

| Condition                          | Target        | Reasoning                                            |
| ---------------------------------- | ------------- | ---------------------------------------------------- |
| `depthScore > 0`                   | `CLAUDE_OPUS` | Backend/complex task (migration, refactor, security) |
| `depthScore ≤ 0` + frontend domain | `GEMINI_PRO`  | Frontend/visual task (CSS, SVG, UI)                  |
| Ambiguous (no keywords)            | `CLAUDE_OPUS` | Fail-safe: route to stronger model                   |
| Security keywords detected         | `CLAUDE_OPUS` | Policy override (priority 100)                       |
| SVG + visualization domain         | `GEMINI_PRO`  | Policy override (priority 80)                        |
| Token overflow                     | `CLAUDE_OPUS` | Fallback: highest output capacity                    |

### Model Registry

| Model ID      | Provider  | Max Input | Max Output | Cost (per 1M)    |
| ------------- | --------- | --------- | ---------- | ---------------- |
| `CLAUDE_OPUS` | Anthropic | 200K      | 128K       | $15 in / $75 out |
| `GEMINI_PRO`  | Google    | 2M        | 65K        | $2 in / $8 out   |

### Determinism Guarantee

Same input → same `RouteDecision.target`, every time. Verified by 100-run determinism test.

### Diagnostic Commands

```bash
# Run routing determinism test
npx vitest run tests/core/gateway/OmniRoute.spec.ts -t "DETERMINISM"

# Run full routing pipeline tests
npx vitest run tests/core/gateway/OmniRoute.spec.ts
```

---

## 3. OmniMCP — Model Context Protocol Host

### Architecture

```
Agent Request → MCPHostManager.invokeTool()
                      ↓
               MCPToolDiscovery.getTool()
                      ↓ (risk check)
               ApprovalCallback? (mcp_tool_approve modal)
                      ↓ (if approved)
               MCPTransport.send() (JSON-RPC 2.0)
                      ↓
               External MCP Server
```

### Server Registry

| Server ID          | Name                  | Transport | Capabilities     |
| ------------------ | --------------------- | --------- | ---------------- |
| `firecrawl`        | Firecrawl Web Scraper | stdio     | tools            |
| `google-workspace` | Google Workspace      | stdio     | tools, resources |
| `github`           | GitHub                | stdio     | tools, resources |
| `supabase`         | Supabase              | stdio     | tools, resources |

### Environment Variables Required

```env
VITE_FIRECRAWL_API_KEY=     # Firecrawl API key
VITE_GOOGLE_API_KEY=        # Google Workspace API key
VITE_GITHUB_TOKEN=          # GitHub personal access token
VITE_SUPABASE_URL=          # Supabase project URL
VITE_SUPABASE_SERVICE_KEY=  # Supabase service role key
```

### Risk Levels & Approval Gating

| Risk Level    | Requires Approval | Example Operations     |
| ------------- | ----------------- | ---------------------- |
| `read`        | No                | Search, list, query    |
| `write`       | Yes               | Create, update, insert |
| `destructive` | Yes               | Delete, drop, truncate |

**Fail-closed**: If no approval callback is registered, ALL write/destructive operations are denied.

### Connection Lifecycle

```
initialize(config) → Registry loaded, transports created
connectServer(id) → Transport.connect() → tools/list → Discovery cache populated
invokeTool(inv) → Risk check → Approval gate → JSON-RPC → ToolResult
disconnectServer(id) → Transport.disconnect() → Discovery cache cleared
```

### Error Handling

| Scenario                | Behavior                                                                   |
| ----------------------- | -------------------------------------------------------------------------- |
| Unknown server ID       | `validateServer()` returns error string                                    |
| Disabled server         | Connection rejected at boundary                                            |
| Connection failure      | Status set to `error`, error message stored                                |
| Unknown tool            | `invokeTool()` returns `{ success: false, error: "Unknown tool" }`         |
| Approval denied         | `invokeTool()` returns `{ success: false, error: "User denied" }`          |
| Transport not connected | `invokeTool()` returns `{ success: false, error: "Server not connected" }` |

### Diagnostic Commands

```bash
# Run MCP tests
npx vitest run tests/core/mcp

# Check approval gating
npx vitest run tests/core/mcp -t "fail-closed"
```

---

## 4. OmniVision — Vision Pipeline Foundation

### Architecture

```
Image Input → VisionCacheController.cacheVisionFrame()
                      ↓
               SHA-256 → visionContextId (deterministic)
                      ↓
               Browser Cache API (LRU, 100 entries)
                      ↓
               omniVisionStore.submitFrame()
                      ↓ (processing)
               Pipeline → PII Detection → Redaction
                      ↓
               omniVisionStore.recordResult()
```

### Store State Machine

```
idle → capturing → processing → redacting → complete
  ↑                                            ↓
  └────────────── clearActiveFrame() ──────────┘

Any state → error (on validation failure)
```

### Redaction Levels

| Level      | Behavior                                                  |
| ---------- | --------------------------------------------------------- |
| `none`     | No redaction applied                                      |
| `standard` | Faces, license plates redacted                            |
| `strict`   | All PII regions redacted (faces, text, plates, documents) |

### Cache Operations

| Operation   | Function             | Notes                               |
| ----------- | -------------------- | ----------------------------------- |
| Cache frame | `cacheVisionFrame()` | Idempotent: same bytes → same entry |
| Retrieve    | `getCachedFrame()`   | Returns blob URL, null if miss      |
| Check       | `isCached()`         | O(1) Map lookup                     |
| Purge one   | `purgeFrame()`       | Removes from index + Cache API      |
| Purge all   | `purgeAllFrames()`   | Full wipe (privacy request)         |

### Ingress Integration

`VisionSourceSchema` is now part of the `RawInputSchema` discriminated union:

```typescript
// Accepts vision frames through standard OmniPort ingress
const input = validateRawInput({
  type: "vision",
  visionContextId: "vcid-abc123...",
  mimeType: "image/png",
  width: 1920,
  height: 1080,
  sizeBytes: 2048000,
});
```

---

## 5. Verification Playbook

### Full Gate Check

```bash
# 1. TypeScript strict
npx tsc --noEmit

# 2. All core tests (203 tests)
npx vitest run tests/core

# 3. Full regression suite (1101 tests)
npx vitest run

# 4. Build verification
npm run build
```

### Per-Subsystem Tests

```bash
# OmniCognition (58 tests)
npx vitest run tests/core/cognition

# OmniRoute (35 tests)
npx vitest run tests/core/gateway/OmniRoute.spec.ts

# OmniMCP (52 tests)
npx vitest run tests/core/mcp

# All core modules (203 tests)
npx vitest run tests/core
```

### Troubleshooting

| Symptom                          | Likely Cause           | Resolution                                               |
| -------------------------------- | ---------------------- | -------------------------------------------------------- |
| `tsc` error in `mcp.config.ts`   | Missing Zod dependency | `npm install zod`                                        |
| MCP transport connection failure | Missing env vars       | Set `VITE_*` keys in `.env`                              |
| Vision cache miss                | Cache API unavailable  | Works in HTTPS only; localhost exempt                    |
| Compression ratio < 1            | Uniform test data      | Expected for synthetic data; real data compresses better |
| Routing non-determinism          | This is a bug          | Report immediately — violates core invariant             |

---

## 6. File Manifest (v1.3.8 Changes)

### New Files (16)

| File                                       | Lines | Purpose                  |
| ------------------------------------------ | ----- | ------------------------ |
| `src/core/cognition/CognitionManager.ts`   | 379   | Session memory singleton |
| `src/core/cognition/compressionEngine.ts`  | 266   | Compression utilities    |
| `src/core/cognition/index.ts`              | 28    | Barrel export            |
| `src/core/gateway/OmniRoute.ts`            | 164   | Routing pipeline         |
| `src/core/gateway/TaskComplexityScorer.ts` | 222   | Task scoring             |
| `src/core/gateway/ModelRegistry.ts`        | 173   | Model capabilities       |
| `src/core/gateway/RoutePolicy.ts`          | 177   | Policy overrides         |
| `src/core/gateway/index.ts`                | 42    | Barrel export            |
| `src/core/mcp/mcp.config.ts`               | 145   | MCP server config        |
| `src/core/mcp/MCPTransport.ts`             | 248   | Transport layer          |
| `src/core/mcp/MCPServerRegistry.ts`        | 173   | Server registry          |
| `src/core/mcp/MCPToolDiscovery.ts`         | 154   | Tool discovery           |
| `src/core/mcp/MCPHostManager.ts`           | 366   | Host controller          |
| `src/core/mcp/index.ts`                    | 58    | Barrel export            |
| `src/stores/omniVisionStore.ts`            | 197   | Vision state store       |
| `src/lib/media/VisionCacheController.ts`   | 249   | Vision frame cache       |

### Modified Files (2)

| File                               | Change                              |
| ---------------------------------- | ----------------------------------- |
| `src/stores/omniModalStore.ts`     | +3 ModalType variants               |
| `src/omniconnect/types/ingress.ts` | +VisionSourceSchema +isVisionSource |

### New Test Files (4)

| File                                             | Tests |
| ------------------------------------------------ | ----- |
| `tests/core/cognition/CognitionManager.spec.ts`  | 31    |
| `tests/core/cognition/compressionEngine.spec.ts` | 27    |
| `tests/core/gateway/OmniRoute.spec.ts`           | 35    |
| `tests/core/mcp/MCPHostManager.spec.ts`          | 52    |

---

**Document Owner:** APEX Business Systems Ltd.
**Last Updated:** 2026-03-02
**Classification:** INTERNAL — Engineering Operations
