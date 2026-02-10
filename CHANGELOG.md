# Changelog

All notable changes to APEX OmniHub are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-09

### Added — Realtime Brokering & Device Classification Core

- **Nexus (ApexRealtimeGateway)** — WebSocket proxy for OpenAI Realtime API with device auth, idempotency, and orchestrator-routed tool calls (`src/core/gateway/ApexRealtimeGateway.ts`)
- **Spectre (SpectreHandshake)** — Device authentication and TrustTier classification from connection headers (`src/core/security/SpectreHandshake.ts`)
- **AegisKernel** — Stateless authorization kernel; per-tool access control based on TrustTier hierarchy (`src/core/security/AegisKernel.ts`)
- **ChronosLock** — Idempotency state machine (PENDING/COMPLETED) with deterministic duplicate detection and rollback (`src/core/orchestrator/ChronosLock.ts`)
- **Veritas** — Tool output validation engine; validates results against per-tool contracts before commit (`src/core/orchestrator/Veritas.ts`)
- **ApexOrchestrator** — Tool execution coordinator integrating Aegis + Chronos + Veritas (`src/core/orchestrator/ApexOrchestrator.ts`)
- **Universal Tool Manifest** — Filtered per-device tool list in OpenAI function-tool JSON Schema format (`src/api/tools/manifest.ts`)
- **Core Type System** — TrustTier enum, DeviceProfile, ToolFunctionSchema, IdempotencyState, ParsedToolCall, SafeErrorPayload contracts (`src/core/types/index.ts`)
- **WebRTC Bridge Interface** — Extension point for future WebRTC bridging without speculative implementation
- **64 new tests** — Full coverage for Spectre, Aegis, Chronos, Veritas, Orchestrator, Manifest, and Gateway (91.7% statement coverage)

### Security

- Bearer token prefix validation (`apex_sk_`) — fail-closed on invalid auth
- No Math.random in security paths — crypto.randomUUID and SHA-256 hashing only
- No stack traces or secrets leaked to clients — SafeErrorPayload contract enforced
- TrustTier hierarchy: GOD_MODE > OPERATOR > PERIPHERAL > PUBLIC with deterministic tool filtering
- Idempotency enforcement on all tool calls — deterministic keys from deviceId + callId

### Quality Gates

- ESLint: 0 warnings, 0 errors
- TypeScript strict mode: 0 errors
- Vitest: 64/64 tests passing
- No new dependencies added — uses `node:crypto` built-in only

## [Unreleased]

## [v2.0.1-hardening] - 2026-02-08

### Security

- Added `request_signing.py` module to enforce request signature validation on sensitive endpoints.
- Implemented `dispatch` middleware for `api/v1/goals` and other critical paths.
- Fixed `CORSMiddleware` ordering in `main.py` to ensure correct execution order (runs first/outermost).

### Code Quality

- Refactored `omnilink-agent/index.ts` to reduce Cognitive Complexity (SonarQube fix).
  - Extracted `validateAuth`, `updateRunStatus`, and `callOrchestrator` helper functions.
- Removed commented-out code in `test_request_signing.py` (SonarQube fix).
- Enforced `ruff` formatting compliance across `orchestrator` services.

### Testing

- Added unit tests for request signing logic in `tests/test_request_signing.py`.
- Verified all Python tests pass with `pytest`.

## [1.5.1] - 2026-02-07

### Fixed

- **Security (Batch 1)**: Hardened Bash scripts with explicit `return` statements, positional parameter validation, and safer conditional tests (`[[ ]]` vs `[ ]`)
- **Code Quality (Batch 2)**:
  - Applied `readonly` modifiers to 20+ class/interface members across components, libs, and services
  - Replaced `window`/`global` with `globalThis` for cross-environment compatibility
  - Fixed floating Promise patterns with proper `await`
- **Accessibility (Batch 3)**:
  - Improved `offline.html` contrast ratios and keyboard focus indicators
  - Added semantic `<main>` element and ARIA attributes (`role="alert"`, `aria-live="polite"`)
  - Replaced inline event handlers with proper event listeners
- **Complexity (Batch 4)**:
  - Migrated Node.js imports to use `node:` prefix (`node:fs`, `node:path`)
  - Refactored high-complexity functions for maintainability
- **Python (Batch 5)**:
  - Implemented `duration_seconds` calculation in `agent_saga.py` (was TODO)
  - Documented all HTTPException responses in FastAPI endpoints

### Changed

- Enhanced TypeScript strictness with readonly member enforcement
- Improved error handling patterns in OmniConnect services

### Technical Debt

- Resolved all SonarQube code smells from analysis report
- Zero critical or blocking issues remaining

## [1.5.0] - 2026-02-05

### Added

- OmniDash production-ready dashboard
- System integration hardening
- Apple-grade UI polish across all components

### Fixed

- Integration test warnings for React state updates
- Bundle size optimization with lazy loading for 3D components

## [1.4.0] - 2026-02-02

### Added

- OmniTrace replay functionality
- Spiral-AI compliance hardening
- Enterprise-grade audit logging with Supabase

### Changed

- Migrated from Lovable API to direct Supabase audit_logs table

## [1.3.0] - 2026-01-25

### Added

- OMEGA security hardening
- OmniPort dead letter queue
- MAN Mode 2.0 with operator supremacy signals

### Security

- Zero-trust device registry
- Emergency control framework

---

[Unreleased]: https://github.com/apexbusiness-systems/APEX-OmniHub/compare/v1.5.1...HEAD
[1.5.1]: https://github.com/apexbusiness-systems/APEX-OmniHub/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/apexbusiness-systems/APEX-OmniHub/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/apexbusiness-systems/APEX-OmniHub/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/apexbusiness-systems/APEX-OmniHub/releases/tag/v1.3.0
