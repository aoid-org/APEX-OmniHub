---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Chaos Simulation Framework
## Deterministic Chaos Testing for OmniLink-APEX

**Status:** ✅ Production Ready
**Version:** 1.3.1
**Updated:** 2026-02-25
**Purpose:** Test all 12 APEX apps under realistic chaos conditions

---

## 🚀 Quick Start

```bash
# Set required environment variables
export SIM_MODE=true
export SANDBOX_TENANT=my-test

# Run full chaos simulation
npm run sim:chaos

# View results
cat evidence/latest/scorecard.json
```

---

## 📁 Directory Structure

```
sim/
├── cli.ts                    # Main CLI entry point
├── runner.ts                 # Simulation orchestration
├── eval-runner.ts            # OmniEval deterministic evaluation
├── contracts.ts              # Event contracts for all 12 apps
├── guard-rails.ts            # Production protection
├── chaos-engine.ts           # Deterministic chaos injection
├── idempotency.ts            # Deduplication engine
├── circuit-breaker.ts        # Failure isolation
├── metrics.ts                # Performance tracking
├── evidence.ts               # Evidence bundler
├── index.ts                  # Main exports
├── README.md                 # This file
├── fixtures/                 # Eval fixtures
│   └── evals/
│       ├── golden/           # 8 golden test cases
│       └── redteam/          # 8 red-team security cases
├── adapters/                 # App-specific adapters
└── tests/                    # Unit tests
    ├── guard-rails.test.ts
    ├── idempotency.test.ts
    └── chaos-engine.test.ts
```

---

## 🎯 What It Does

This framework simulates a **chaotic, non-technical client** (Sarah Martinez) having a terrible day where everything goes wrong:

- 📞 **13 story beats** across all 12 APEX apps
- 🎲 **Deterministic chaos:** Duplicates, delays, timeouts, failures
- 🛡️ **Autonomous isolation:** Circuit breakers + idempotency
- 📊 **Performance metrics:** Latency, throughput, errors
- 🏆 **Scorecard:** Pass/fail criteria

**Key Feature:** Same seed → identical results (reproducible testing)

---

## 🧪 Test Modes

| Command | Description | Duration | Use Case |
|---------|-------------|----------|----------|
| `npm run sim:chaos` | Full chaos (default) | 30-60s | Integration testing |
| `npm run sim:dry` | Dry run (no API calls) | 5-10s | CI/CD pipelines |
| `npm run sim:quick` | Minimal smoke test | 1-2s | Rapid iteration |
| `npm run sim:burst` | Load testing | 60-120s | Performance testing |
| `npm run eval:ci` | Deterministic eval | < 2s | **CI security gate** |
| `npm run test:sim` | Unit tests | 5s | Development |

---

## 🛡️ Safety Guarantees

**Guard rails BLOCK if:**
- ❌ `SIM_MODE` not set to `true`
- ❌ `SANDBOX_TENANT` not set
- ❌ Production URLs detected
- ❌ Missing sandbox indicators

**Result:** Cannot accidentally run against production.

---

## 📊 Success Criteria

### Overall Pass: Score ≥ 70/100

**App Scores (per app):**
- Success rate ≥ 95% (40 points)
- p95 latency < 500ms (30 points)
- Retry rate < 20% (15 points)
- Events processed > 0 (15 points)

**System Score:**
- p95 latency < 500ms ✅
- Error rate < 10% ✅
- Retry rate < 30% ✅
- Idempotency: `dedupeRate > 0` OR `totalEvents === 0` ✅ (BUG-1 fix: `>= 0` was always true)

---

## 🔧 Programmatic Usage

```typescript
import { runSimulation, DEFAULT_CHAOS_CONFIG } from './sim';

const result = await runSimulation({
  scenario: 'My Test',
  tenantId: 'sandbox-test',
  seed: 42,
  chaos: DEFAULT_CHAOS_CONFIG,
  beats: [...],
  dryRun: true,
});

console.log(`Score: ${result.scorecard.overallScore}/100`);
console.log(`Passed: ${result.passed}`);
```

---

## 📚 Documentation

- [RUNBOOK.md](../docs/sim/RUNBOOK.md) - How to run
- [ARCHITECTURE.md](../docs/sim/ARCHITECTURE.md) - System design
- [CHAOTIC_CLIENT_STORY.md](../docs/sim/CHAOTIC_CLIENT_STORY.md) - Full narrative
- [INVENTORY.md](../docs/sim/INVENTORY.md) - App inventory

---

## 🎓 Key Concepts

### 1. Determinism
Same seed = same chaos decisions = same results (reproducible)

### 2. Idempotency
Duplicate events → cached response (no duplicate side effects).
Score passes when `dedupeRate > 0` (actual dedupe hits) or `totalEvents === 0` (no events processed).

### 3. Circuit Breakers
Failures isolated → fast-fail → queue → recover.
On recovery, all queued events are returned by `flushQueue()` and delivered via `config.onRecover` callback — no events are dropped.

### 4. Chaos Injection
- 15% duplicates
- 10% out-of-order
- 5% timeouts
- 3% network failures
- Partial outages

---

## 🏗️ Architecture Highlights

```
Guard Rails → Chaos Engine → Idempotency → Circuit Breaker → App Adapter
     ↓             ↓              ↓              ↓              ↓
  [SAFE]      [SEEDED RNG]   [DEDUPE]      [ISOLATE]      [EXECUTE]
```

**Evidence Bundle:**
```
evidence/<runId>/
├── scorecard.json    # Final results
├── result.json       # Full output
├── logs.txt          # Execution logs
└── manifest.json     # Metadata
```

---

## 🔬 Development

```bash
# Run tests
npm run test:sim

# Validate environment
npm run sim:validate

# Clean evidence
npm run sim:clean

# Generate HTML report
npm run sim:report
```

---

## 🔬 OmniEval (Deterministic Evaluation)

Security gate with golden + red-team fixtures:

```bash
# Run deterministic evaluation 
npm run eval:ci

# Output: artifacts/evals/report.json
```

**Thresholds:**
- pass_rate >= 95%
- policy_violations == 0  
- tool_misuse_rate == 0

**Fixtures:**
- `fixtures/evals/golden/` — 8 valid interaction tests
- `fixtures/evals/redteam/` — 8 adversarial attack tests

---

## 🎯 Integration with CI/CD

```yaml
# OmniEval Gate (Phase 2.5)
- name: Run OmniEval
  run: npm run eval:ci

- name: Upload Report
  uses: actions/upload-artifact@v4
  with:
    name: omnieval-report
    path: artifacts/evals/report.json

# Chaos Simulation (Optional)
- name: Chaos Simulation
  env:
    SIM_MODE: 'true'
    SANDBOX_TENANT: 'ci-test'
  run: npm run sim:dry

- name: Check Results
  run: |
    SCORE=$(jq -r '.overallScore' evidence/latest/scorecard.json)
    if (( $(echo "$SCORE < 70" | bc -l) )); then
      exit 1
    fi
```

---

## 🚨 Troubleshooting

**Error: Guard Rail Violation**
```bash
export SIM_MODE=true
export SANDBOX_TENANT=test-$(date +%s)
```

**Error: Production URL detected**
```bash
export SUPABASE_URL=http://localhost:54321
```

**Simulation too slow**
```bash
npm run sim:dry  # 10x faster (no real calls)
```

---

## 📈 Performance

| Metric | Target | Typical |
|--------|--------|---------|
| Full simulation | <60s | 30-45s |
| Dry run | <10s | 5-8s |
| Quick test | <2s | 1s |
| Memory usage | <500MB | 200MB |

---

## 📋 Changelog

### v1.3.1 — 2026-02-25
- **BUG-1 fixed** (`metrics.ts`): Idempotency score now requires `dedupeRate > 0 || totalEvents === 0`. Previous `>= 0` check was always `true`.
- **BUG-2 fixed** (`chaos-engine.ts`): `calculateBackoff()` is deprecated; routes to config-aware `calculateRetryDelay()` (500ms base, exponential + full jitter). Use `calculateRetryDelay()` directly.
- **BUG-3 fixed** (`circuit-breaker.ts`): `flushQueue()` now returns `EventEnvelope[]` instead of `void`. Events queued during OPEN state are re-delivered via `config.onRecover` callback on circuit close.
- **BUG-4 fixed** (`contracts.ts`): `validateEvent()` uses strict `=== null || === undefined` for payload check. `false`, `0`, `""`, `[]` are valid payloads.

### v1.0.0 — Initial release

---

**Questions?** See docs/sim/RUNBOOK.md or file an issue.

**Status:** ✅ **COMPLETE & PRODUCTION READY**
