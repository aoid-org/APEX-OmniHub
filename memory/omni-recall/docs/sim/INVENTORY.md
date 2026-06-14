---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
# APEX Ecosystem Inventory

## Mandatory Simulation Disclaimer

IMPORTANT:
Chaos simulation results validate orchestration resilience and recovery behavior in controlled sandbox environments. These results are NOT representations of public production traffic volume or commercial customer load unless explicitly labeled VERIFIED LIVE EXECUTION.

## Chaotic Client Simulation - System Discovery
**Date:** 2026-01-03
**Repo:** apexbusiness-systems/APEX-OmniHub
**Purpose:** Map all 12 APEX apps and integration points for chaos simulation

---

## 📍 Repository Location
```
Repo: /home/user/APEX-OmniHub
Origin: http://127.0.0.1:21077/git/apexbusiness-systems/APEX-OmniHub
Branch: claude/root-cause-analysis-2Vvua
```

---

## 🏢 APEX Ecosystem Status

### Confirmed Present (8/12 Apps Found)

| # | App Name | Status | Runtime | Integration Points | Location |
|---|----------|--------|---------|-------------------|----------|
| 1 | **OmniLink** | ✅ CORE | Event Fabric | HTTP API, Event Bus, SDK | `src/integrations/omnilink/` |
| 2 | **OmniHub** | ✅ PARTIAL | Dashboard UI | OmniDash routes | `src/pages/OmniDash/` |
| 3 | **TradeLine 24/7** | ✅ FULL | React + Supabase | AI receptionist, call handling | `src/pages/apps/TradeLine247.tsx` |
| 4 | **AutoRepAi** | ✅ FULL | React + Supabase | Auto repair AI | `src/pages/apps/AutoRepAi.tsx` |
| 5 | **FLOWBills** | ✅ FULL | React + Supabase | Billing automation | `src/pages/apps/FLOWBills.tsx` |
| 6 | **Jubee.Love** | ✅ FULL | React + Supabase | AI relationship coach | `src/pages/apps/JubeeLove.tsx` |
| 7 | **KeepSafe** | ✅ FULL | React + Supabase | Safety & compliance | `src/pages/apps/KeepSafe.tsx` |
| 8 | **APEX Assistant** | ✅ BACKEND | Supabase Function | AI assistant endpoint | `supabase/functions/apex-assistant/` |

### Not Found / To Be Stubbed (4/12 Apps)

| # | App Name | Status | Integration Strategy |
|---|----------|--------|---------------------|
| 9 | **aSpiral** | ⚠️ NOT FOUND | Stub contract, mock events |
| 10 | **FlowC** | ⚠️ NOT FOUND | Stub contract (silent FLOWBills integration) |
| 11 | **Bright Beginnings** | ⚠️ NOT FOUND | Stub contract, mock events |
| 12 | **TRU Talk** | ⚠️ NOT FOUND | Stub contract, mock events |

### Additional Apps Found (Bonus)
- **CareConnect** - Not MVP yet (mentioned in docs, not implemented)
- **BuiltCanadian** - Found in `src/pages/apps/BuiltCanadian.tsx`
- **StrideGuide** - Found in `src/pages/apps/StrideGuide.tsx`
- **RobuxMinerPro** - Found in `src/pages/apps/RobuxMinerPro.tsx`

---

## 🔌 Integration Points Discovered

### 1. OmniLink Event Fabric (CORE)
**Location:** `src/integrations/omnilink/`

**Key Files:**
- `index.ts` - Main adapter
- `port.ts` - Port implementation
- `types.ts` - Type definitions

**Integration Capabilities:**
```typescript
interface OmniLinkAdapter {
  request<T>(options: OmniLinkRequestOptions): Promise<T>;
  health(): Promise<OmniLinkHealth>;
}

interface OmniLinkRequestOptions {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;  // ✅ Already supports idempotency!
  dedupeTtlMs?: number;
}
```

**Idempotency Support:** ✅ **NATIVE** - Already has `idempotencyKey` and `dedupeTtlMs`

### 2. Supabase Functions (Backend Integration Points)

| Function | Purpose | Integration Type | Status |
|----------|---------|------------------|--------|
| `apex-agent` | AI Agent (Guardian/Planner/Executor) | HTTP POST | ✅ Production |
| `omnilink-eval` | Agent evaluation system | HTTP POST | ✅ Production |
| `apex-assistant` | General AI assistant | HTTP POST | ✅ Production |
| `apex-voice` | Voice processing | HTTP POST | ✅ Production |
| `execute-automation` | Automation runner | HTTP POST | ✅ Production |
| `lovable-audit` | Audit logging | HTTP POST | ✅ Production |
| `test-integration` | Test endpoint | HTTP POST | ✅ Test |
| `web3-verify` | NFT/Web3 verification | HTTP POST | ✅ Production |
| `alchemy-webhook` | Blockchain events | Webhook | ✅ Production |

**Environment Variables Required:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_ANON_KEY=xxx
```

### 3. Database Schema (Supabase)

**Key Tables Found in Migrations:**
- `agent_runs` - AI agent execution logs
- `agent_checkpoints` - Agent state persistence
- `agent_policies` - Security policies
- `audit_logs` - System audit trail
- `eval_cases` - Evaluation test cases
- `eval_results` - Evaluation outcomes
- `skills` - Agent skills registry
- `web3_verifications` - NFT verification records
- `profiles` - User profiles

**Idempotency Strategy:**
- Can use `agent_runs.id` as correlation ID
- Can create `idempotency_receipts` table for deduplication

### 4. Frontend App Pages

**React Components (src/pages/apps/):**
Each app has a dedicated page component with common patterns:
- State management via React hooks
- Supabase integration via contexts
- OmniLink integration ready

**Common Integration Pattern:**
```typescript
// Each app can emit events through OmniLink
import { useOmniLink } from '@/integrations/omnilink';

const { request, health } = useOmniLink();

await request({
  path: '/events',
  method: 'POST',
  body: { eventType, payload },
  idempotencyKey: `${tenantId}-${eventType}-${timestamp}`,
});
```

---

## 🔄 Event Flow Architecture (Current State)

```
┌─────────────────────────────────────────────────────────────┐
│                    APEX APPS (Frontend)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │TradeLine │  │AutoRepAi │  │FLOWBills │  │KeepSafe  │   │
│  │   24/7   │  │          │  │          │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
└───────┼─────────────┼──────────────┼─────────────┼──────────┘
        │             │              │             │
        └─────────────┴──────────────┴─────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   OmniLink Adapter (SDK)    │
        │  • HTTP request routing     │
        │  • Idempotency keys         │
        │  • Health checks            │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   Supabase Functions        │
        │  • apex-agent           │
        │  • apex-assistant           │
        │  • execute-automation       │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   Supabase Database         │
        │  • agent_runs               │
        │  • audit_logs               │
        │  • eval_results             │
        └─────────────────────────────┘
```

---

## 🎯 Simulation Strategy

### Apps with Full Integration (Use Real)
1. ✅ **TradeLine 24/7** - Call `src/pages/apps/TradeLine247.tsx` logic
2. ✅ **AutoRepAi** - Call `src/pages/apps/AutoRepAi.tsx` logic
3. ✅ **FLOWBills** - Call `src/pages/apps/FLOWBills.tsx` logic
4. ✅ **Jubee.Love** - Call `src/pages/apps/JubeeLove.tsx` logic
5. ✅ **KeepSafe** - Call `src/pages/apps/KeepSafe.tsx` logic
6. ✅ **OmniLink Agent** - Call `supabase/functions/apex-agent/` via HTTP
7. ✅ **APEX Assistant** - Call `supabase/functions/apex-assistant/` via HTTP

### Apps to Stub (Create Contracts)
8. ⚠️ **aSpiral** - Mock event emitter
9. ⚠️ **FlowC** - Mock silent integration with FLOWBills
10. ⚠️ **Bright Beginnings** - Mock event emitter
11. ⚠️ **TRU Talk** - Mock event emitter
12. ⚠️ **OmniHub** - Use existing dashboard routes, mock orchestration

---

## 🛡️ Security & Guard Rails (Existing)

### Guardian Security Layer
**Location:** `supabase/functions/apex-agent/index.ts`

**Features:**
- Prompt injection detection (regex + LLM)
- Policy-based security checks
- PII redaction
- Audit logging

### Already Implemented Safety
- ✅ Environment variable validation
- ✅ CORS headers configured
- ✅ Audit logging infrastructure
- ✅ Health check endpoints

### Required for Simulation
- ⚠️ `SIM_MODE=true` environment flag (TO ADD)
- ⚠️ `SANDBOX_TENANT` isolation (TO ADD)
- ⚠️ Production URL detection (TO ADD)

---

## 📊 Database Tables for Simulation

### Existing (Use)
```sql
-- Correlation & idempotency tracking
agent_runs (
  id UUID PRIMARY KEY,           -- Use as correlationId
  thread_id TEXT,                 -- Session grouping
  user_message TEXT,
  agent_response TEXT,
  skills_used TEXT[],
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  end_time TIMESTAMPTZ
)

-- Audit trail
audit_logs (
  id UUID PRIMARY KEY,
  event_type TEXT,
  severity TEXT,
  action_type TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
)
```

### To Create
```sql
-- Idempotency receipts ✅ IMPLEMENTED
-- See: supabase/migrations/20260215000000_create_idempotency_receipts.sql
-- Schema includes:
--   - UUID primary key, unique idempotency_key
--   - Multi-tenant isolation (tenant_id)
--   - Request/response payload tracking
--   - Attempt counting, TTL expiration
--   - RLS policies for tenant isolation
--   - Automatic cleanup function
-- Documentation: docs/INFRASTRUCTURE_GAPS_AUDIT_REPORT.md

-- Simulation runs (NEW)
CREATE TABLE IF NOT EXISTS sim_runs (
  run_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  seed INTEGER NOT NULL,
  scenario_name TEXT NOT NULL,
  chaos_config JSONB NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  metrics JSONB,
  scorecard JSONB
);

-- Simulation events (NEW)
CREATE TABLE IF NOT EXISTS sim_events (
  event_id UUID PRIMARY KEY,
  run_id UUID REFERENCES sim_runs(run_id),
  correlation_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  app_source TEXT NOT NULL,
  app_target TEXT,
  beat_number INTEGER NOT NULL,
  payload JSONB NOT NULL,
  chaos_injected JSONB,
  latency_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  circuit_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🗂️ File Structure for Simulation

```
APEX-OmniHub/
├── sim/                              # NEW - Simulation framework
│   ├── contracts.ts                  # Event contracts for all 12 apps
│   ├── runner.ts                     # Main chaos simulation runner
│   ├── chaos-engine.ts               # Deterministic chaos injection
│   ├── adapters/                     # App-specific adapters
│   │   ├── tradeline.ts             # TradeLine 24/7 adapter
│   │   ├── autorepai.ts             # AutoRepAi adapter
│   │   ├── flowbills.ts             # FLOWBills adapter
│   │   ├── jubeelove.ts             # Jubee.Love adapter
│   │   ├── keepsafe.ts              # KeepSafe adapter
│   │   ├── aspiral.ts               # aSpiral stub
│   │   ├── flowc.ts                 # FlowC stub
│   │   ├── bright.ts                # Bright Beginnings stub
│   │   ├── trutalk.ts               # TRU Talk stub
│   │   └── omnihub.ts               # OmniHub orchestrator
│   ├── guard-rails.ts                # Safety checks (SIM_MODE, prod detection)
│   ├── idempotency.ts                # Deduplication engine
│   ├── circuit-breaker.ts            # Circuit breaker + queue
│   ├── metrics.ts                    # Metrics collection
│   ├── evidence.ts                   # Evidence bundler
│   └── tests/                        # Simulation tests
│       ├── contracts.test.ts
│       ├── chaos-engine.test.ts
│       ├── idempotency.test.ts
│       └── runner.test.ts
├── docs/sim/                          # NEW - Simulation docs
│   ├── INVENTORY.md                  # This file
│   ├── CHAOTIC_CLIENT_STORY.md       # Full narrative + beat mapping
│   ├── RUNBOOK.md                    # How to run locally/CI
│   ├── ARCHITECTURE.md               # Mermaid diagrams
│   └── RESULTS_REPORT.md             # Test results + scorecard
└── package.json                       # Add sim:* scripts
```

---

## 🔧 Dependencies (Existing - No New Vendors)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",  // ✅ API client
    "react": "^18.x",                  // ✅ Frontend
    "vite": "^6.x",                    // ✅ Build tool
    "vitest": "^3.x",                  // ✅ Testing
    "playwright": "^1.x"               // ✅ E2E tests
  }
}
```

**No additional packages needed** - use existing stack!

---

## 📈 Next Steps

1. ✅ **Inventory Complete**
2. ⏭️ Create event contracts (`sim/contracts.ts`)
3. ⏭️ Build chaos runner (`sim/runner.ts`)
4. ⏭️ Write chaotic client story (`docs/sim/CHAOTIC_CLIENT_STORY.md`)
5. ⏭️ Implement guard rails
6. ⏭️ Add tests + CI integration
7. ⏭️ Write documentation
8. ⏭️ Add package scripts

---

## 🎓 Key Findings

### Strengths
- ✅ **Idempotency already native** in OmniLink adapter
- ✅ **Strong security foundation** (Guardian layer)
- ✅ **Audit infrastructure exists** (audit_logs table)
- ✅ **8 of 12 apps have real implementations**
- ✅ **Supabase functions provide backend integration**

### Risk Mitigation
- 🛡️ All simulation code will be **sandbox-only**
- 🛡️ **Hard block on production URLs** (guard rails)
- 🛡️ **Deterministic chaos** (seeded RNG)
- 🛡️ **Idempotent reruns** (same seed → same output)

---

**Inventory Status:** ✅ **COMPLETE**
**Ready to Build:** Yes
**Confidence Level:** High
