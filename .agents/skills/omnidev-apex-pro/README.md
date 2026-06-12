# omnidev-apex-pro

**APEX-OmniHub Platform Dev / Debug Agent** — v1.0.0

The production engineering skill for APEX-OmniHub. Activates full platform access via
the `apex-omnihub-connector` MCP (26 tools), applies recursive self-repair, enforces
zero-trust security, and compresses session token usage through domain-gated reference
loading and SPR-encoded platform knowledge.

---

## Install

**Claude Code:**
```bash
/plugin marketplace add apexbusiness-systems/apex-skills
```

**skills.sh ecosystem:**
```bash
npx skills add github.com/apexbusiness-systems/apex-skills --skill omnidev-apex-pro
```

**Claude.ai Settings:**
```
Settings → Capabilities → Upload → select dist/omnidev-apex-pro-1.0.0.skill
```

**Prerequisite:** The `apex-omnihub-connector` remote MCP must be connected in Claude.
See the connector skill's README for gateway deployment and URL setup.

---

## Before / After

**Before** (unoptimized OmniHub debug session):

```
User: "SentinelPanel is showing mock data, can you fix it?"

Agent: "Sure! The SentinelPanel component is likely using hardcoded data because...
[600 tokens of architecture explanation]
Let me look at the file...
[reads src/components/dashboard/SentinelPanel.tsx]
I see the issue! It's using mock data. Here's how to fix it...
[700 tokens of exploratory back-and-forth]
Does that look right to you? Also, should I check the other dashboard components?
[400 tokens of open-ended questions]
..."

Estimated session tokens: ~7,600 | Result: fix proposed but not verified
```

**With omnidev-apex-pro:**

```
STEP 0:
  apex_platform_health → healthy
  apex_module_states   → guardian:ACTIVE · planner:ACTIVE · executor:ACTIVE
  apex_mcp_status      → gateway live

GOAL: Wire SentinelPanel to live Supabase data | LAYER: frontend | STAKES: high

Context harvest (P1 domain = frontend + edge):
  apex_gh_file src/components/dashboard/SentinelPanel.tsx → reads source
  apex_gh_file supabase/functions/omnilink-port/index.ts  → reads handleModuleState

Fix: surgical patch to SentinelPanel + omnilink-port — blast_radius=2 files

Health gate:
  apex_platform_health → healthy ✓
  apex_error_log       → 0 new P0/P1 ✓

Postmortem: 3 lines → apex_audit_log

Estimated session tokens: ~1,860 | Result: verified fix with health-gate proof
```

Token reduction vs unoptimized baseline: ~75% (conservative floor: 65%).
See `references/token-compression.md` for full methodology and measurements.

---

## What This Skill Does

- **Mandatory STEP 0**: Runs `apex_platform_health + apex_module_states + apex_mcp_status`
  before any action — establishes authoritative platform state in one batched context block.

- **Domain Router**: Routes every task to the correct MCP tools based on domain
  (db / edge / cf / frontend / ci / security / monitoring), never loading irrelevant context.

- **RSI Engine**: Classifies signals (P0/P1/P2/P3), applies the correct repair protocol
  (CRIT-MODE / SURGICAL / ROOT-CAUSE / QUEUE), runs the repair loop with a 3-attempt ceiling,
  and writes a postmortem to `apex_audit_log` after every fix.

- **Zero-Trust Guard Gates**: Hard stops on RLS gaps, credential exposure, destructive
  migrations, and production writes without a health gate — no rationalization, no exceptions.

- **Token Compression**: SPR-encoded platform knowledge, domain-gated reference loading,
  session state caching, and script-based introspection keep session cost consistently low.

---

## File Structure

```
omnidev-apex-pro/
├─ SKILL.md                         ← Forge-compliant core (173 lines)
├─ README.md                        ← This file
├─ MANIFEST.json                    ← Package metadata
├─ LICENSE.md                       ← Proprietary license
├─ scorecard.json                   ← Measured evidence (forge-generated)
├─ evals/trigger-eval.json          ← 10 positive + 8 negative trigger cases
├─ references/
│   ├─ platform-map.md              ← Full OmniHub topology + canonical paths
│   ├─ rsi-engine.md                ← Complete repair protocol + escalation
│   ├─ zero-trust.md                ← Full security ruleset + failsafes
│   └─ token-compression.md        ← Compression methodology + measurements
└─ scripts/
    └─ omniscan.py                  ← Platform introspection (zero context cost)
```

---

## Supersedes

`omnidev-apex v3.0.0` — this skill replaces it entirely.
Set `status: deprecated` in omnidev-apex's MANIFEST.json after installing this skill.

---

*Proprietary © 2026 APEX Business Systems Ltd. — Edmonton, Alberta, Canada*
*APEX Non-Negotiables: Directable · Auditable · Reversible · Zero-Trust*
