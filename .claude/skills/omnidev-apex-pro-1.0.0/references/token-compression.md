## Contents

1. Compression Architecture
2. Baseline Measurement Methodology
3. SPR Format Specification
4. Reference-on-Demand Protocol
5. Batch Call Patterns
6. Session Cache Rules
7. Measured Compression Factors
8. Anti-Patterns to Avoid

---

## 1. Compression Architecture

Token compression in this skill operates across five structural layers:

```
Layer 1 — Description tier (always loaded)
  Cost: description_chars ÷ 4 per session per conversation
  Optimization: description ≤454 chars (below 500 budget)

Layer 2 — SKILL.md body (on trigger)
  Cost: body_chars ÷ 4 per triggered task
  Optimization: 173 lines; body kept under 2,500 est. tokens

Layer 3 — References (on demand, domain-gated)
  Cost: only files relevant to active domain enter context
  Optimization: ##Contents headers enable section-level jump

Layer 4 — MCP responses (session-cached)
  Cost: MCP tool response tokens recur per re-call
  Optimization: STEP 0 batched once; platform-state cached for session

Layer 5 — Script execution (zero context cost)
  Cost: 0 tokens — omniscan.py runs outside context window
  Optimization: any repeated analytical logic moves to scripts/
```

---

## 2. Baseline Measurement Methodology

Baseline established from APEX-OmniHub debug session transcripts (reference period: May–June 2026).

Typical unoptimized OmniHub debug session:
```
Component                        Tokens (est.)
─────────────────────────────────────────────
Platform architecture explanation   1,200
Exploratory file reads (3–5 files)  2,400
Multiple diagnostic back-and-forth  1,800
Repeated health-check questions       600
Ad-hoc root-cause narration         1,600
Total unoptimized session est.      7,600
```

With omnidev-apex-pro applied:
```
Component                        Tokens (est.)
─────────────────────────────────────────────
STEP 0 batch (3 MCP calls, 1 block)   320
Domain-gated reference section load    480
Targeted apex_gh_file read (1 file)   400
Surgical fix block                     480
Health gate verification               120
Postmortem (3 lines)                    60
Total optimized session est.         1,860
```

Reduction: (7,600 - 1,860) / 7,600 ≈ 75.5% (est.)
Conservative baseline used in scorecard: 65% (accounts for variance in session complexity)
Method: chars÷4 estimate · recorded in scorecard.json §tokens

---

## 3. SPR Format Specification

Sparse Priming Representation (SPR) encodes platform knowledge in a format that
activates the model's existing training rather than explaining concepts from scratch.

SPR principles:
```
1. Declarative facts over explanations — state what is, not why
2. Canonical paths over descriptions — "src/components/skills/SkillForgeWidget.tsx"
3. Relationship notation — "A → B" over "A connects to B through the following mechanism"
4. Table format for multi-attribute facts — one row per entity
5. Code blocks for commands, paths, patterns — reduces ambiguity tokens
```

SPR in practice (platform-map.md follows SPR format throughout):
```
NOT: "The OmniLink port edge function is responsible for managing the state of
      various modules within the OmniDash SPA dashboard component by receiving
      state updates and routing them to the appropriate handlers..."
IS:  omnilink-port | supabase/functions/omnilink-port/index.ts | wires module state to OmniDash
```

Token savings from SPR vs prose: approximately 3:1 for structural knowledge.

---

## 4. Reference-on-Demand Protocol

References are only loaded when their domain is active. Domain gate:

```
DOMAIN ACTIVE?          LOAD REFERENCE
─────────────────────────────────────────────────────────
Database operation      → references/platform-map.md §DB only
Security concern        → references/zero-trust.md (full)
RSI event (P0/P1/P2)   → references/rsi-engine.md §[priority section]
Unknown platform area   → references/platform-map.md §Navigation
Token optimization need → references/token-compression.md §[section]
Full platform audit     → references/platform-map.md (full)
```

Do NOT load all four reference files at session start.
Load the ##Contents header first, then jump to the needed section.
Exception: `references/zero-trust.md` is always available for the hard-stop checks.

---

## 5. Batch Call Patterns

MCP tools can be batched logically to reduce round-trip overhead:

**STEP 0 batch (always):**
```
apex_platform_health + apex_module_states + apex_mcp_status
→ Execute as a single mental context block
→ Do not re-execute within the same task unless health event occurs
```

**Debug context batch:**
```
apex_error_log [severity:error, limit:20]
+ apex_gh_file [failing component path]
→ Load both before proposing any fix
→ Context cost: 2 calls × ~200 tokens avg = 400 tokens total
```

**Deploy batch:**
```
apex_cf_deployment + apex_gh_workflows [limit:3]
→ Both needed for deploy assessment; load together
```

**Audit batch:**
```
apex_audit_log [limit:50] + apex_db_rls_check
→ Standard audit context; load together
```

Anti-pattern: calling apex_platform_health, then apex_module_states, then apex_mcp_status
separately across three reasoning steps — loads the same total tokens but fragments context.

---

## 6. Session Cache Rules

Platform state is expensive to re-establish. Cache rules:

```
CACHE (do not re-call within session):
├─ apex_platform_health result — valid for session unless health event occurs
├─ apex_module_states result  — valid until explicit state change reported
├─ apex_db_schema [table]     — valid for session unless migration runs
└─ apex_gh_dir [path]         — valid for session unless commit detected

REFRESH (always re-call):
├─ apex_error_log — errors are time-sensitive; always get fresh data
├─ apex_audit_log — new entries expected after every fix
└─ apex_gh_workflows — CI state changes continuously

NEVER cache:
├─ apex_db_rls_check — security check; always authoritative call
└─ apex_platform_health when: error spike, health event, post-fix verification
```

---

## 7. Measured Compression Factors

These factors feed into the scorecard.json §token_compression field:

| Factor | Mechanism | Est. Savings |
|--------|-----------|-------------|
| SPR platform map vs prose | 3:1 knowledge density ratio | ~35% of knowledge tokens |
| Reference-on-demand gating | Domain filter eliminates 3 of 4 refs per session | ~25% of reference tokens |
| STEP 0 batching | 3 calls in 1 context block vs 3 separate queries | ~10% of diagnostic tokens |
| Session state caching | No repeated platform-health calls | ~8% of session tokens |
| Script introspection | omniscan.py: 0 context cost | ~5% of analytical tokens |
| Surgical repair protocol | Eliminates exploratory back-and-forth | ~15% of debug tokens |

Combined conservative estimate: 65% reduction vs unoptimized baseline.
Method: estimate-only (chars÷4); measured in scorecard.json §tokens.

---

## 8. Anti-Patterns to Avoid

These patterns inflate token cost without adding value:

```
1. Loading all references at session start
   → Loads 800+ tokens you won't need; use domain gating

2. Recursive apex_gh_dir scan of entire src/
   → Can return hundreds of paths; use targeted apex_gh_file instead

3. Re-running STEP 0 health checks every 5 turns
   → Repeats 300 tokens of platform state you already have; cache it

4. Explaining APEX platform architecture from first principles
   → references/platform-map.md exists for this; load the relevant section

5. Narrating fix options before reading source
   → Always apex_gh_file first; never propose a fix on description alone

6. Loading full rsi-engine.md for a P3 warning
   → Section-level load only; P3 section is 10 lines not 200

7. Writing fix code in-context when a script exists
   → scripts/omniscan.py covers introspection; don't reimplement it inline
```
