---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# OmniHub Protocol Conformance Matrix

**Document version:** 2026.05.09.1
**Repository version:** 1.6.0
**Last updated:** 2026-05-09
**Scope:** `src/omnihub-gateway/`, `src/core/mcp/`, `src/core/gateway/`, and their focused tests.

## Internal Engineering Delta Report

| Area | Observed drift before hardening | Files implicated | Current status |
| --- | --- | --- | --- |
| MCP protocol version exposure | Public `initialize` response always returned `2025-03-26`. | `src/omnihub-gateway/JsonRpcHandler.ts` | Gateway now negotiates supported client versions and defaults to `2025-11-25`. |
| MCP list response shapes | Public handler returned wrapped list results, while MCP host discovery expected bare arrays from `tools/list`, `resources/list`, and `prompts/list`. | `src/omnihub-gateway/JsonRpcHandler.ts`, `src/core/mcp/MCPSessionManager.ts` | Public handler and host discovery now share canonical wrap/unwrap helpers. |
| MCP tool invocation shape | Public `tools/call` used standard `{ name, arguments }`, while internal dispatch sent method names as `tools/<toolName>`. | `src/core/mcp/MCPDispatcher.ts` | Internal dispatcher now sends `tools/call` with `{ name, arguments }`. |
| MCP transport headers | HTTP transports did not attach the negotiated protocol-version header. | `src/core/mcp/MCPTransport.ts` | MCP HTTP requests now include `MCP-Protocol-Version`. |
| A2A method surface | Gateway exposed legacy `tasks/send`, `tasks/get`, `tasks/cancel`, and `tasks/sendSubscribe` only. | `src/omnihub-gateway/JsonRpcHandler.ts` | Canonical methods are registered; legacy names remain isolated aliases. |
| Trace correlation | MCP/A2A responses and MCP audit records did not consistently carry request/correlation/workflow/task/artifact context. | `src/omnihub-gateway/JsonRpcHandler.ts`, `src/core/mcp/MCPDispatcher.ts` | Shared trace metadata is emitted in protocol metadata and audit entries. |
| Governance gating | Tool names indicating destructive intent could be under-classified if declared as read-only. | `src/core/mcp/MCPDispatcher.ts` | Dispatcher now upgrades effective risk from tool name before approval gating. |
| Deterministic routing explainability | Route decisions had free-form reasoning but no concise replay-oriented signal list. | `src/core/gateway/OmniRoute.ts` | Route decisions now include deterministic `routeExplanation` signals. |

## Canonical Internal Contract Layer

The smallest shared layer is `src/core/gateway/ProtocolContracts.ts`.

It centralizes:

- supported MCP protocol versions and negotiation;
- MCP initialize response construction;
- standards-aligned MCP list wrapping and compatibility unwrapping;
- common trace metadata across request, correlation, workflow, task, approval, and artifact identifiers.

This layer intentionally does not own transport, policy, registry, execution, or persistence. Those responsibilities remain in the existing gateway, MCP host, Temporal bridge, and routing modules.

## MCP Conformance Matrix

| Capability | Implemented behavior | Remaining gap |
| --- | --- | --- |
| `initialize` | Negotiates supported versions and returns server capabilities, server info, and instructions. | Full lifecycle state enforcement for `notifications/initialized` remains transport/session-level future work. |
| `tools/list` | Returns `{ tools, nextCursor? }` from existing `MCPHostManager` discovery cache with bounded pagination. | None for cache-backed list exposure; cache population still depends on configured MCP server connections. |
| `resources/list` | Returns `{ resources, nextCursor? }` from existing `MCPHostManager` resource cache with bounded pagination. | None for cache-backed list exposure; cache population still depends on configured MCP server connections. |
| `prompts/list` | Returns `{ prompts, nextCursor? }` from existing `MCPHostManager` prompt cache with bounded pagination. | None for cache-backed list exposure; cache population still depends on configured MCP server connections. |
| `resources/read` | Returns `contents` array with URI, MIME type, and text. | Resource content storage remains outside this gateway handler. |
| `tools/call` | Executes through the existing Temporal bridge and returns MCP content, `isError`, and trace metadata. | Structured output schemas are not advertised until backing tool registry metadata exists. |
| HTTP protocol header | MCP transports attach `MCP-Protocol-Version`. | Per-session negotiated header variation is not persisted yet; current header uses the gateway-supported default. |
| Host discovery | Parses standards-wrapped list envelopes and legacy bare arrays; public gateway lists now expose cached discovery data. | Pagination iteration for upstream server discovery is parser-ready but does not yet fetch subsequent upstream pages. |

## A2A Conformance Matrix

| Method | Implemented behavior | Compatibility |
| --- | --- | --- |
| `SendMessage` | Dispatches through the existing Temporal A2A task workflow and returns task state with trace metadata. | Legacy `tasks/send` aliases the same handler. |
| `SendStreamingMessage` | Dispatches task and annotates SSE channel metadata. | Legacy `tasks/sendSubscribe` aliases the same handler. |
| `GetTask` | Queries the Temporal workflow state. | Legacy `tasks/get` aliases the same handler. |
| `ListTasks` | Returns an empty pagination-ready result envelope. | No legacy alias existed. |
| `CancelTask` | Signals the Temporal workflow cancellation path. | Legacy `tasks/cancel` aliases the same handler. |
| `SubscribeToTask` | Reuses the streaming dispatch path for current SSE-compatible behavior. | Dedicated resubscribe-from-existing-task semantics remain a gap. |
| `GetExtendedAgentCard` | Returns a gateway-owned extended card describing current capabilities. | No external registry dependency added. |

## Governance, Audit, Traceability, and Routing Changes

- MCP dispatcher now fails closed when tool names indicate destructive/write behavior even if a discovered tool under-declares its risk tier.
- MCP audit entries carry optional trace fields without breaking existing callback consumers.
- MCP and A2A protocol responses include correlated metadata where workflow execution is involved.
- Route decisions include `routeExplanation` entries for deterministic audit replay.
- Policy override summaries include the matched rule description to make override behavior auditable.

## Validation Evidence

Focused validation added or updated:

- MCP initialize negotiation, registry-backed list envelope, and bounded pagination tests.
- MCP host discovery parsing for wrapped list envelopes and `inputSchema`-derived parameters.
- MCP tool invocation path test coverage for approval gating and audit emission.
- A2A canonical method registration and legacy alias behavior tests.
- Deterministic routing explanation assertion.

## Gap Decision — 2026-05-09

Gateway-facing MCP registry data was implemented before lifecycle `notifications/initialized` enforcement. This order was selected because it reuses the existing `MCPHostManager` discovery/session caches, removes empty public list responses, and avoids introducing new session state into the stateless JSON-RPC gateway. Lifecycle enforcement remains the next MCP hardening target because it requires coordinated per-session transport state rather than only cache projection.
