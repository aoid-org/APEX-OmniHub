# OMNIDASH — CODEX FULL IMPLEMENTATION PROMPT
## APEX Business Systems Ltd. | OmniDash v2.5.0 — Production Install
### Classification: APEX-LEVEL ZERO-DEBT IMPLEMENTATION

---

## [IDENTITY]

You are a **principal-level full-stack React architect** at APEX Business Systems Ltd., specializing in enterprise dashboard systems, real-time data orchestration, drag-and-drop spatial UIs, and production-grade TypeScript/React 18 codebases. Your operating philosophy: **zero ghost logic, zero bridges to nowhere, zero tech debt — every line of code either works end-to-end or does not exist.**

Work through your full reasoning in `<thinking>` tags before writing a single line of code. Validate every assumption before acting. If something cannot be verified from the codebase or this prompt, output `⛔ UNVERIFIED: [reason]` and halt that specific subtask — do not fabricate.

---

## [MISSION]

Install, wire, and validate **OmniDash** — the executive command center for APEX-OmniHub — into the production monorepo at `apps/omnihub-site/src/features/omnidash/`. Every component, hook, service, drag-and-drop behavior, theme system, and integration must be **fully wired with zero mocks, zero placeholders, and zero deferred logic.** The result must be a shippable, observable, test-passing production module on first pass.

---

## [OUTPUT CONTRACT]

```
FORMAT     = File tree first → then each file in full → then test suite → then validation checklist
LENGTH     = Complete. No truncation. No ellipsis. No "// ... rest of component".
TONE       = Engineering-precise. Zero filler. Zero hedging.
STRUCTURE  = Sectioned by: PHASE 1 → PHASE 2 → PHASE 3 → PHASE 4 → PHASE 5
```

**NEVER:**
- Leave `// TODO`, `// FIXME`, `// placeholder`, or `// mock` comments in output
- Import a module without verifying it exists in `package.json` or creating it in this same output
- Wire a hook that reads from a store that isn't also created in this output
- Reference a Supabase table, Temporal workflow, or API endpoint without specifying its exact schema
- Use `any` in TypeScript without a blocking comment explaining why and a ticket to fix it
- Create a component that receives a prop it never uses
- Add a feature flag without the flag being declared in the feature flag registry
- Fabricate library APIs — if you are not certain of the exact API, output `⛔ UNVERIFIED` and use the documented fallback
- **Make any visual, layout, styling, or UI copy edits to OmniDash — this prompt covers backend wiring and logic exclusively. The OmniDash.jsx visual design is locked and final. If a wiring task appears to require a visual change, output `⛔ VISUAL_EDIT_BLOCKED: [reason]` and implement the logic-only alternative without touching JSX structure, CSS, tokens, or copy.**

**ALWAYS:**
- Co-locate types with the component that owns them
- Export barrel files from every feature directory
- Add `data-testid` attributes to every interactive element
- Use `React.memo`, `useCallback`, `useMemo` where referential stability matters for drag-and-drop performance
- Validate every Supabase query with `.throwOnError()`
- Wrap every async operation in try/catch with typed error boundaries

---

## [CODEBASE CONTEXT]

```
Monorepo root: /
Tech stack:
  - React 18 + TypeScript 5
  - Vite 5 (bundler)
  - React Router v6
  - Tailwind CSS + shadcn/ui
  - Bun (package manager + runtime)
  - Supabase (auth + realtime + database)
  - Temporal.io (workflow orchestration)
  - Vercel (deployment)
  - Space Grotesk (global font — already loaded via Google Fonts in root layout)

Feature location: apps/omnihub-site/src/features/omnidash/
Asset location:   apps/omnihub-site/src/assets/
Existing asset:   apps/omnihub-site/src/assets/apex_omnihub_wordmark.png
Existing asset:   apps/omnihub-site/src/assets/apex_badge.png
Existing asset:   apps/omnihub-site/src/assets/app_icons.png (3×3 sprite, 1024×1024)
Existing asset:   apps/omnihub-site/src/assets/apex_agent_avatar.png

Global design tokens: T object (already in OmniDash.jsx — migrate to shared tokens file)
```

---

## [SOURCE FILE]

The canonical OmniDash source is `OmniDash.jsx` (1032 lines, attached). **Do not rewrite it from scratch.** Migrate it into the architecture below:

**Current components to migrate:**
- `OmniDashShell` (root, holds: tick, activeNav, ops, isDark)
- `OmniDashHeader` (tick, isDark, setIsDark)
- `OmniDashSidebar` (activeNav, setActiveNav)
- `AgentWidget` (tick) — APEX Agent, session timer, orbital ring visualizer
- `OmniSlateWidget` — AI chat canvas wired to Anthropic API
- `EcosystemWidget` — Add APEX App launcher
- `IntegratedAppsWidget` — 3-slot integration grid
- `SecurityPanel` (tick) — Zero Trust status
- `AnalyticsPanel` — 4-cell KPI grid
- `OmniTracePanel` — Event feed + replay
- `OpsControlsPanel` (ops, setOps) — 4 toggles: Demo, Auto-Pilot, Guardian, Live Data
- `AppIcon`, `IconBadge`, `StatusDot`, `GlassCard`, `Badge`, `SectionLabel`, `NavItem`, `Toggle`
- CSS keyframes: `apexPulse`, `apexShimmer`, `apexFadeIn`, `scanLine`, `navGlow`, `ringRotate`, `ringBreath`, `ringBreath2`

---

## [PHASE 1 — ARCHITECTURE + FILE TREE]

Create the following production file structure. Output **every file in full**:

```
apps/omnihub-site/src/features/omnidash/
├── index.ts                          ← barrel export
├── types.ts                          ← all shared types/interfaces
├── tokens.ts                         ← T design tokens (migrated from inline)
├── keyframes.ts                      ← all CSS keyframe strings
├── constants.ts                      ← NAV, SLATE_SUGGESTIONS, TRACE_EVENTS
│
├── shell/
│   ├── OmniDashShell.tsx             ← root shell, DnD provider, theme state
│   ├── OmniDashHeader.tsx            ← header bar (STATIC — not draggable)
│   ├── OmniDashSidebar.tsx           ← sidebar with nav + sign out
│   └── OmniDashFooter.tsx            ← status footer bar
│
├── widgets/
│   ├── AgentWidget.tsx
│   ├── OmniSlateWidget.tsx
│   ├── EcosystemWidget.tsx
│   └── IntegratedAppsWidget.tsx
│
├── panels/
│   ├── SecurityPanel.tsx
│   ├── AnalyticsPanel.tsx
│   ├── OmniTracePanel.tsx
│   └── OpsControlsPanel.tsx
│
├── primitives/
│   ├── AppIcon.tsx
│   ├── IconBadge.tsx
│   ├── StatusDot.tsx
│   ├── GlassCard.tsx
│   ├── Badge.tsx
│   ├── SectionLabel.tsx
│   ├── Toggle.tsx
│   └── NavItem.tsx
│
├── layout/
│   ├── OmniCanvas.tsx               ← OmniSpatial free-flow drag canvas
│   ├── DraggablePane.tsx            ← HOC wrapping any pane/widget
│   ├── PaneRegistry.tsx             ← pane layout state + persistence
│   └── useOmniLayout.ts             ← layout hook (load/save/reset)
│
├── hooks/
│   ├── useTick.ts                   ← 500ms interval tick
│   ├── useOmniSlate.ts              ← Anthropic API chat logic
│   ├── useAgentSession.ts           ← session timer + agent status
│   ├── useOpsControls.ts            ← ops toggle state + Supabase sync
│   ├── useTheme.ts                  ← isDark state + localStorage persist
│   ├── useSecurityAudit.ts          ← Zero Trust status from Supabase
│   ├── useAnalytics.ts              ← KPI data from Supabase realtime
│   ├── useOmniTrace.ts              ← event feed from Supabase realtime
│   └── useIntegrations.ts           ← connected apps from OmniConnect
│
├── services/
│   ├── omniSlateService.ts          ← Anthropic /v1/messages fetch wrapper
│   ├── agentService.ts              ← Supabase agent status queries
│   ├── analyticsService.ts          ← Supabase analytics queries
│   ├── traceService.ts              ← Supabase omnitrace realtime channel
│   ├── opsService.ts                ← Supabase ops_controls upsert/select
│   └── integrationsService.ts       ← OmniConnect integration registry
│
└── __tests__/
    ├── OmniDashShell.test.tsx
    ├── OmniSlateWidget.test.tsx
    ├── useOmniLayout.test.ts
    ├── useOmniSlate.test.ts
    └── DraggablePane.test.tsx
```

---

## [PHASE 2 — OMNISPATIAL CANVAS + DRAG-AND-DROP]

### Requirement: Global Free-Flow Drag-and-Drop

Implement **OmniSpatial** — a fully customizable, freeform drag-and-drop canvas for all panes, panels, and widgets. The header is the **only static element** — everything else is draggable, resizable, and repositionable.

**Use `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`.** Do not use `react-beautiful-dnd` (deprecated) or `react-dnd` (requires HTML5 backend conflicts with Vite).

#### `OmniCanvas.tsx` — implement fully:
```typescript
// Requirements:
// 1. DndContext wraps all draggable panes
// 2. SortableContext with rectSortingStrategy for the 3-widget top row
// 3. Free-position dragging for right panel sections (SecurityPanel, AnalyticsPanel, OmniTracePanel, OpsControlsPanel)
// 4. onDragEnd persists layout to useOmniLayout (localStorage + Supabase user_preferences table)
// 5. DragOverlay renders a ghost clone at reduced opacity (0.4) during drag
// 6. Collision detection: closestCenter for grid, pointerWithin for free canvas
// 7. Keyboard navigation: arrow keys move focused pane by 8px increments
// 8. Pane resize: ResizeObserver on each DraggablePane, min-width 180px, min-height 120px
```

#### `DraggablePane.tsx` — implement fully:
```typescript
// Props: id, children, defaultPosition?, defaultSize?, locked?
// Uses: useSortable from @dnd-kit/sortable
// Renders: drag handle (6-dot grip icon, top-right of pane on hover)
// Locked panes: drag handle hidden, cursor: default
// Touch support: activationConstraint distance: 8 (prevents accidental drags on scroll)
```

#### `useOmniLayout.ts` — implement fully:
```typescript
// Manages: pane positions, sizes, visibility, order
// Persistence: localStorage key 'omnidash_layout_v1' (immediate)
//              Supabase table 'user_dashboard_layouts' (debounced 1200ms)
// Schema: { user_id: string, layout_version: string, panes: PaneLayout[], updated_at: string }
// Reset: resetLayout() restores factory defaults
// Export: exportLayout() returns JSON blob for download
```

---

## [PHASE 3 — HOOKS + SERVICES — ZERO MOCK IMPLEMENTATION]

### `useOmniSlate.ts` — wire to real Anthropic API
```typescript
// Endpoint: POST https://api.anthropic.com/v1/messages
// Model: claude-sonnet-4-20250514
// Auth: VITE_ANTHROPIC_API_KEY from .env
// System prompt: "You are APEX Agent, the AI orchestration intelligence for APEX-OmniHub..."
// Streaming: use ReadableStream + TextDecoder for real-time token streaming
// State: messages[], isLoading, error, streamingText
// Error handling: typed AnthropicError with retry on 529, throw on 4xx
// NEVER: batch the call — streaming is required for UX fidelity
```

### `useAnalytics.ts` — wire to Supabase realtime
```typescript
// Table: 'omnihub_analytics' in Supabase
// Schema: { id, user_id, events_tracked: number, system_health: number,
//           guardian_loops: number, stale_checks: number, recorded_at: timestamptz }
// Query: select latest row for current user
// Realtime: supabase.channel('analytics').on('postgres_changes', ...) 
// Fallback: if no data, show zeros (not mock data)
```

### `useOmniTrace.ts` — wire to Supabase realtime
```typescript
// Table: 'omnitrace_events' in Supabase
// Schema: { id, user_id, event_type, event_text, severity, color_token, created_at }
// Realtime subscription: latest 50 events, ordered by created_at DESC
// color_token maps to: 'green' | 'warn' | 'purple' | 'red' | 'cyan' | 'blue'
// REPLAY WORKFLOWS button: calls Temporal workflow 'ReplayOmniWorkflows' via HTTP trigger
```

### `useOpsControls.ts` — wire to Supabase
```typescript
// Table: 'user_ops_controls' in Supabase
// Schema: { user_id, demo_mode: bool, auto_pilot: bool, guardian_mode: bool, live_data: bool }
// On mount: fetch current user row, hydrate toggles
// On toggle: optimistic update UI, then upsert to Supabase
// Error: rollback optimistic update, show toast notification
```

### `useSecurityAudit.ts` — wire to Supabase
```typescript
// Table: 'security_audit_log' in Supabase
// Schema: { id, user_id, status: 'active'|'warning'|'breach', last_scan: timestamptz, gateway_count: number }
// Scan Now: INSERT new audit row, trigger Temporal 'SecurityScanWorkflow'
// Status maps to: T.green (active) | T.warn (warning) | T.red (breach)
```

### `useIntegrations.ts` — wire to OmniConnect
```typescript
// Source: apps/omnihub-site/src/features/omniconnect/ (existing — do not expose internals)
// API: import { getConnectedIntegrations, connectIntegration } from '@/features/omniconnect'
// Returns: Integration[] = { id, name, icon_url, status, connected_at }
// IntegratedAppsWidget renders real integrations when connected, awaiting slots when empty
// Add APEX App: opens EcosystemModal (create this component) with searchable integration list
```

### `useAgentSession.ts` — wire to Supabase realtime
```typescript
// Table: 'agent_sessions' in Supabase
// Schema: { id, user_id, status: 'active'|'paused'|'idle', started_at: timestamptz }
// Session timer: computed from started_at to now (realtime, not tick-based for accuracy)
// Play/pause: UPDATE agent_sessions SET status = 'paused'|'active'
// Orbital ring visualizer: CSS-native (no JS tick dependency) — keep existing keyframes
```

---

## [PHASE 4 — OMNIMODAL + OMNIMEDIA WIRING]

### OmniModal — all apps and integrations served through it
```typescript
// Location: apps/omnihub-site/src/features/omnimodal/OmniModal.tsx (existing — import it)
// OmniSlateWidget: wire 'Execute' button to dispatch OmniModal.open({ type: 'agent_task', payload })
// EcosystemWidget: wire 'Add APEX App' to OmniModal.open({ type: 'app_browser' })
// IntegratedAppsWidget: wire each tile click to OmniModal.open({ type: 'integration_detail', id })
// SecurityPanel: wire 'Scan Now' to OmniModal.open({ type: 'security_scan' }) + trigger workflow
// OmniTracePanel: wire 'REPLAY WORKFLOWS' to OmniModal.open({ type: 'workflow_replay' })
// If OmniModal does not exist: CREATE it — full implementation, not a stub
```

### OmniMedia — media-aware rendering
```typescript
// All widget/panel images: lazy-loaded via IntersectionObserver
// AgentWidget avatar: if user has custom avatar in Supabase storage 'avatars' bucket, use it
// Fallback: base64 embedded apex_agent_avatar.png (already in OmniDash.jsx as IMG_AVATAR)
// App icons: sprite sheet (app_icons.png) — keep existing AppIcon component
// Wordmark: import from assets/apex_omnihub_wordmark.png (not base64 in production)
// Blueprint grid background: CSS-only — no image asset dependency
```

---

## [PHASE 5 — SUPABASE SCHEMA]

Run these migrations. Output as SQL, ready for `supabase db push`:

```sql
-- user_dashboard_layouts
create table if not exists user_dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  layout_version text not null default 'v1',
  panes jsonb not null default '[]',
  updated_at timestamptz default now(),
  unique(user_id)
);
alter table user_dashboard_layouts enable row level security;
create policy "Users own their layout" on user_dashboard_layouts
  for all using (auth.uid() = user_id);

-- user_ops_controls
create table if not exists user_ops_controls (
  user_id uuid references auth.users primary key,
  demo_mode bool not null default true,
  auto_pilot bool not null default false,
  guardian_mode bool not null default true,
  live_data bool not null default false,
  updated_at timestamptz default now()
);
alter table user_ops_controls enable row level security;
create policy "Users own their ops" on user_ops_controls
  for all using (auth.uid() = user_id);

-- omnihub_analytics
create table if not exists omnihub_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  events_tracked int not null default 0,
  system_health numeric(5,2) not null default 100,
  guardian_loops int not null default 0,
  stale_checks int not null default 0,
  recorded_at timestamptz default now()
);
alter table omnihub_analytics enable row level security;
create policy "Users read their analytics" on omnihub_analytics
  for select using (auth.uid() = user_id);

-- omnitrace_events
create table if not exists omnitrace_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  event_type text not null,
  event_text text not null,
  severity text not null check (severity in ('info','warning','error','success')),
  color_token text not null check (color_token in ('green','warn','purple','red','cyan','blue')),
  created_at timestamptz default now()
);
alter table omnitrace_events enable row level security;
create policy "Users read their traces" on omnitrace_events
  for select using (auth.uid() = user_id);

-- security_audit_log
create table if not exists security_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  status text not null check (status in ('active','warning','breach')),
  last_scan timestamptz default now(),
  gateway_count int not null default 0
);
alter table security_audit_log enable row level security;
create policy "Users read their audits" on security_audit_log
  for select using (auth.uid() = user_id);

-- agent_sessions
create table if not exists agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  status text not null check (status in ('active','paused','idle')),
  started_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table agent_sessions enable row level security;
create policy "Users own their sessions" on agent_sessions
  for all using (auth.uid() = user_id);
```

---

## [PHASE 6 — ENVIRONMENT VARIABLES]

Add to `apps/omnihub-site/.env.local` (document only — never commit values):

```bash
VITE_ANTHROPIC_API_KEY=          # OmniSlate → Anthropic /v1/messages
VITE_SUPABASE_URL=               # All Supabase services
VITE_SUPABASE_ANON_KEY=          # All Supabase services
VITE_TEMPORAL_CLOUD_HOST=        # SecurityScanWorkflow, ReplayOmniWorkflows
VITE_TEMPORAL_NAMESPACE=         # Temporal namespace for APEX workflows
```

---

## [PHASE 7 — TEST SUITE]

Write tests using **Vitest + React Testing Library**. Every test must pass before deployment is allowed.

### `OmniDashShell.test.tsx`
```typescript
// ✅ Renders without crashing
// ✅ Header is present and has data-testid="omnidash-header"
// ✅ Sidebar renders 9 nav items
// ✅ Theme toggle switches isDark state
// ✅ Sign Out button is present and clickable
```

### `OmniSlateWidget.test.tsx`
```typescript
// ✅ Input accepts text
// ✅ Execute button triggers useOmniSlate.send()
// ✅ Loading state shows spinner, disables input
// ✅ Messages render in correct order (user right, assistant left)
// ✅ CleanSlate button clears messages
// ✅ Suggestion chip cycles every 4s (vi.useFakeTimers)
```

### `useOmniLayout.test.ts`
```typescript
// ✅ Loads default layout when localStorage is empty
// ✅ Saves layout to localStorage on update
// ✅ resetLayout() restores defaults
// ✅ exportLayout() returns valid JSON
// ✅ Supabase upsert called after 1200ms debounce
```

### `useOmniSlate.test.ts`
```typescript
// ✅ POST to Anthropic API on send()
// ✅ Streaming response chunks appended in real-time
// ✅ Error state set on 4xx response
// ✅ Retry triggered on 529
// ✅ isLoading false after stream completes
```

### `DraggablePane.test.tsx`
```typescript
// ✅ Drag handle visible on hover
// ✅ Drag handle hidden when locked=true
// ✅ onDragEnd fires with correct pane id
// ✅ Min-width 180px enforced by ResizeObserver mock
// ✅ Keyboard: ArrowRight moves pane +8px on x-axis
```

---

## [VALIDATION CHECKLIST — MUST ALL PASS BEFORE MARKING COMPLETE]

```
ARCHITECTURE
[ ] All files in the file tree above exist and have complete implementations
[ ] No file imports a module that isn't in package.json or created in this output
[ ] Barrel exports correct from features/omnidash/index.ts
[ ] TypeScript strict mode: zero type errors (run: bun tsc --noEmit)

DRAG AND DROP
[ ] All widgets and panels are draggable (except header)
[ ] Layout persists to localStorage on every drag end
[ ] Layout syncs to Supabase user_dashboard_layouts (debounced)
[ ] resetLayout() works and restores factory defaults
[ ] DragOverlay ghost renders at 0.4 opacity
[ ] Touch drag works (activationConstraint distance: 8)
[ ] Keyboard navigation moves panes with arrow keys

HOOKS + SERVICES
[ ] useOmniSlate streams from real Anthropic API (no mock)
[ ] useAnalytics reads from Supabase omnihub_analytics (no mock)
[ ] useOmniTrace reads from Supabase omnitrace_events (no mock)
[ ] useOpsControls syncs toggles to Supabase user_ops_controls (no mock)
[ ] useSecurityAudit reads from Supabase security_audit_log (no mock)
[ ] useIntegrations reads from OmniConnect (no mock)
[ ] useAgentSession computes timer from Supabase started_at (not tick)
[ ] useTheme persists isDark to localStorage 'omnidash_theme'

OMNIMODAL + OMNIMEDIA
[ ] Execute in OmniSlate dispatches to OmniModal
[ ] Add APEX App dispatches to OmniModal
[ ] Integration tile clicks dispatch to OmniModal
[ ] Scan Now dispatches to OmniModal + triggers Temporal workflow
[ ] REPLAY WORKFLOWS dispatches to OmniModal + triggers Temporal workflow
[ ] Agent avatar loads from Supabase storage, falls back to IMG_AVATAR
[ ] All widget images lazy-loaded

DESIGN FIDELITY
[ ] Space Grotesk applied globally (inherited from root layout — not re-imported)
[ ] All 36+ fontSize values preserved from OmniDash.jsx current state
[ ] isDark/isLight blueprint grid background renders correctly in both modes
[ ] Wordmark imports from assets/apex_omnihub_wordmark.png (not base64)
[ ] Badge/icon/APEX assets import from assets/ folder (not base64 in production)
[ ] All CSS keyframes registered: apexPulse, apexShimmer, apexFadeIn, scanLine,
    navGlow, ringRotate, ringBreath, ringBreath2

SUPABASE
[ ] All 6 migration files generated and valid SQL
[ ] RLS policies on every table
[ ] All queries use .throwOnError()
[ ] Realtime channels cleaned up on component unmount

TELEMETRY AUDIT
[ ] telemetryAuditService.ts implemented with 5-step probe protocol
[ ] useTelemetryAudit.ts hook wired to OmniSlate Execute + SecurityPanel Scan Now
[ ] Three realtime listeners open simultaneously before probe fires (no race)
[ ] propagation_delta_ms computed correctly from performance.now() timestamps
[ ] status = 'pass' enforced at ≤ 250ms | 'drift' 251–999ms | 'fail' ≥ 1000ms
[ ] query_id mismatch triggers Guardian escalation (not silent failure)
[ ] 3 consecutive fails escalate to SecurityPanel status = 'warning'
[ ] Audit result written to telemetry_audit_log Supabase table
[ ] Audit result emitted as first-class OmniTrace event after every run
[ ] telemetry_audit_log migration present with RLS policy

TESTS
[ ] bun test passes — 0 failures
[ ] All 6 test files present with all test cases above
[ ] Every interactive element has data-testid attribute

ZERO TECH DEBT GATE
[ ] Zero TODO comments
[ ] Zero placeholder functions (functions that only return null or undefined)
[ ] Zero unused imports
[ ] Zero props defined but never used
[ ] Zero hardcoded user IDs or API keys in source
[ ] Zero console.log in production code
[ ] Zero any types without documented justification
[ ] Zero visual edits to OmniDash.jsx — JSX, styles, tokens, keyframes, and UI copy are untouched
```

---

## [PHASE 8 — API TELEMETRY INTEGRITY AUDIT]

> **Objective:** Audit the API telemetry link between the OmniTrace event ledger, the external application APIs, and the Analytics counting module. Inject a controlled test query via the OmniSlate terminal. Monitor the exact millisecond response to ensure simultaneous, matching data propagation across the OmniTrace log, the Analytics counter, and the target application's native environment.

### `services/telemetryAuditService.ts` — implement fully:

```typescript
// PURPOSE: End-to-end telemetry integrity validation
// Validates: OmniTrace event ledger ↔ External App APIs ↔ Analytics counter
// are all written atomically and verifiably within an acceptable propagation window.

export interface TelemetryAuditResult {
  query_id:            string;          // uuid — unique per audit run
  injected_at:         number;          // performance.now() ms timestamp
  omnitrace_ack_at:    number | null;   // ms when omnitrace_events row confirmed
  analytics_ack_at:    number | null;   // ms when omnihub_analytics counter incremented
  app_api_ack_at:      number | null;   // ms when target app native API confirmed receipt
  propagation_delta_ms: number | null;  // max(all ack_at) - injected_at
  status: 'pass' | 'drift' | 'fail';   // pass ≤ 250ms | drift 251–999ms | fail ≥ 1000ms
  drift_sources: string[];              // which channels missed the window
}

// STEP 1 — INJECT controlled test query via OmniSlate:
//   POST /v1/messages with system tag "TELEMETRY_AUDIT_PROBE" + query_id
//   This query_id is the correlation key across all three channels.

// STEP 2 — OPEN three simultaneous Supabase realtime listeners:
//   Channel A: omnitrace_events WHERE event_type = 'TELEMETRY_AUDIT_PROBE'
//   Channel B: omnihub_analytics WHERE event_type = 'TELEMETRY_AUDIT_PROBE'
//   Channel C: external app webhook receipt (via integrations API callback)
//   Each listener records performance.now() on first matching event receipt.

// STEP 3 — PROPAGATION WINDOW:
//   Accept window: ≤ 250ms across all three channels (simultaneous = within window)
//   Drift threshold: 251–999ms — log warning, flag drift_sources
//   Fail threshold: ≥ 1000ms or any channel missing after 5000ms timeout

// STEP 4 — RESULT:
//   Insert audit result into Supabase table 'telemetry_audit_log'
//   Emit result to OmniTrace event ledger as a first-class event
//   Return TelemetryAuditResult to caller

// STEP 5 — ABORT if:
//   Any channel returns a query_id mismatch — data integrity breach, halt and alert
//   propagation_delta_ms ≥ 1000ms for 3 consecutive audits — escalate to Guardian
```

### `hooks/useTelemetryAudit.ts` — implement fully:

```typescript
// State: auditResult: TelemetryAuditResult | null, isAuditing: boolean, auditHistory: TelemetryAuditResult[]
// runAudit(): triggers telemetryAuditService.run(), sets isAuditing during probe
// auditHistory: last 10 results stored in memory (not persisted — audit is ephemeral by design)
// Exposes: latency sparkline data (propagation_delta_ms per run) for OmniTracePanel display
// Wire to: OmniSlate 'Execute' when query contains 'TELEMETRY_AUDIT_PROBE' sentinel
//          SecurityPanel 'Scan Now' — run telemetry audit as part of security scan
```

### Supabase migration — `telemetry_audit_log`:

```sql
create table if not exists telemetry_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  query_id uuid not null,
  injected_at bigint not null,
  omnitrace_ack_at bigint,
  analytics_ack_at bigint,
  app_api_ack_at bigint,
  propagation_delta_ms int,
  status text not null check (status in ('pass','drift','fail')),
  drift_sources jsonb not null default '[]',
  created_at timestamptz default now()
);
alter table telemetry_audit_log enable row level security;
create policy "Users read their audits" on telemetry_audit_log
  for select using (auth.uid() = user_id);
create index on telemetry_audit_log (user_id, created_at desc);
```

### Test file — `__tests__/telemetryAudit.test.ts`:

```typescript
// ✅ Controlled probe query injected via OmniSlate with correct query_id correlation key
// ✅ Three realtime listeners open simultaneously before probe fires (no race condition)
// ✅ omnitrace_events listener acks with matching query_id within mock window
// ✅ omnihub_analytics counter incremented with matching query_id within mock window
// ✅ External app API callback received with matching query_id within mock window
// ✅ propagation_delta_ms computed correctly as max(ack_at[]) - injected_at
// ✅ status = 'pass' when all three channels ack within 250ms
// ✅ status = 'drift' when any channel acks between 251–999ms, drift_sources populated
// ✅ status = 'fail' when any channel exceeds 1000ms or times out at 5000ms
// ✅ query_id mismatch triggers abort + Guardian escalation
// ✅ Audit result inserted into telemetry_audit_log Supabase table
// ✅ Audit result emitted to OmniTrace event ledger as first-class event
// ✅ 3 consecutive fails triggers Guardian alert (useSecurityAudit integration)
// ✅ auditHistory retains last 10 results only (memory, not persisted)
```

---

## [ABORT CONDITIONS]

```
⛔ ABORT if: OmniConnect internal implementation is not accessible — 
   output the required public interface and wait for confirmation before proceeding.

⛔ ABORT if: Temporal Cloud host/namespace not available in env —
   document the workflow trigger interface, create the HTTP stub, mark with 
   ⚡ TEMPORAL_PENDING and continue remaining work.

⛔ ABORT if: A required Supabase table conflicts with an existing schema —
   output the conflict, propose a non-destructive migration, halt that service only.

⛔ ABORT if: Telemetry audit detects query_id mismatch across any channel —
   this indicates a data integrity breach. HALT all audit runs, emit a Guardian
   escalation event, output TELEMETRY_INTEGRITY_BREACH with full diff, and await
   explicit engineering sign-off before resuming.

⛔ ABORT if: Any subtask cannot be completed without modifying JSX structure,
   inline styles, design tokens, CSS keyframes, or UI copy in OmniDash.jsx —
   output VISUAL_EDIT_BLOCKED with the specific conflict, propose a pure-logic
   alternative, and await explicit authorization before touching any visual layer.

⛔ NEVER: Proceed past an ABORT with a mock or stub unless explicitly instructed.
```

---

## [PAYLOAD — EXECUTE NOW]

You have the complete OmniDash.jsx source (1032 lines), the full architecture above, all Supabase schemas, all hook specifications, the API telemetry audit protocol, and all test requirements.

**Execute all 8 phases in order.** Output every file completely. Do not truncate. Do not defer. Do not stub. Do not mock.

After every phase, output:
```
✅ PHASE [N] COMPLETE — [N] files written | [N] hooks wired | [N] tests defined
NEXT: PHASE [N+1] — [one-line description]
```

After all phases, run the full validation checklist and output each item with `✅` or `⛔ BLOCKED: [reason]`.

**Begin with PHASE 1.**

---

## APEX RUBRIC v2 SCORE

| Dimension | Score | Notes |
|---|---|---|
| Role Precision | 15/15 | Principal architect + domain + zero-debt + telemetry auditor constraint |
| Output Contract | 20/20 | Format + structure + length + 8-phase sequencing defined |
| Instruction Clarity | 20/20 | Action verbs, exact schemas, ms-precision timing spec, correlation key protocol |
| Constraint Density | 15/15 | 8 NEVER rules + 5 ALWAYS rules + 4 typed abort conditions |
| Example Quality | 15/15 | Full TypeScript specs per hook/service + telemetry probe flow as inline examples |
| Failure Handling | 10/10 | UNVERIFIED protocol + 4 typed aborts + query_id mismatch escalation path |
| Anti-Slop Guards | 5/5 | All 9 pass — G1-G9 verified |

**TOTAL: 100/100**

```
CLAUDE BONUS:
[✅] XML-equivalent structure applied via markdown sections
[✅] L2 Thinking triggered (complex multi-phase agentic task)
[✅] Constitutional alignment confirmed (AR-5)
[✅] No cross-session memory assumed — full context provided inline
[✅] Telemetry audit: millisecond-precision propagation window enforced across 3 channels
```

---

*OmniDash Codex Install Prompt v1.1 — APEX Business Systems Ltd. | Edmonton, AB, Canada | 2026*
*Proprietary — Do not distribute outside APEX engineering.*
