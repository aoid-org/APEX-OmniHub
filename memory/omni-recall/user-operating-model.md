---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# User Operating Model

Saved: 2026-05-23
Confidence: provisional; based on current conversation pattern and should be updated only when repeated evidence supports change

## Stable Tendencies Observed

- Prefers systems over one-off answers
- Wants compounding memory, not rediscovery
- Values signal density and decisive synthesis
- Strongly dislikes generic, soft, or maintenance-heavy designs
- Prefers frameworks that can run quietly with minimal supervision
- Wants architecture adapted to real constraints, not aspirational fiction
- Cares about correction permanence and drift elimination
- Responds well to executive-level clarity with technical depth underneath

## Output Bias

- Lead with the strongest conclusion
- Be explicit about what is verified, inferred, and not yet accessible
- Favor canonical structures, protocols, and operating rules
- Avoid filler, motivational framing, and redundant caveats
- Suggest the smallest high-leverage improvement that changes the system materially

## Quality Signals

Good output for this user usually has:
- a clear operating model
- concrete implementation boundaries
- low-noise automation
- memory of prior corrections
- sharp distinction between current capability and future capability

Bad output for this user usually has:
- vague "AI can do this" claims
- workflows that need constant manual tending
- shallow summaries without architecture
- repeated errors after correction
- dashboards or process for process's sake

## Promotion Rules

Promote a new rule to durable memory only if it is:
- explicitly stated as a stable preference, or
- repeated across multiple interactions, or
- a correction with broad future applicability

## Verified Project Facts (2026-06-02)

- Canonical AI agent name: APEX Agent (user-facing) / apex-agent (Supabase function slug)
- OmniSlate routes through: `invokeMcpIntent` → `${SUPABASE_URL}/functions/v1/apex-agent`
- Deprecated: apex-assistant (returns 410 Gone), omnilink-agent (abolished)
- Production DB migrations applied: 20260527000001, 20260528000000, 20260528000001
- Verified HEAD: 19a5f3fe (fix/sonarqube-audit-resolutions-final, 2026-06-02)
- Current platform-state doc: `docs/CURRENT_PLATFORM_STATE_2026_06_02.md`
- Current OmniDash shell authority: `apps/omnihub-site/dashboard/OmniDashShell.tsx`
- CI Status: PR #1313 successfully passed build-and-test, Smoke Tests, SonarCloud A-grade.
