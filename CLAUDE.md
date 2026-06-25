---
version: 1.1.0
last_audited: 2026-06-25
status: verified
---

# APEX-OMNIHUB / TRADELINE 24/7 CORE PROTOCOLS
- **Modularity:** Maximum file length is 600 lines. Break large files into single-responsibility modules.
- **Architectural Literacy:** Account for state management, race conditions, and concurrent database locks. Do not assume syntax covers architecture.
- **Execution Loop:** One task per session. Test manually. Push to GitHub immediately on pass. Revert immediately on fail. No hallucination cascading.
- **Goal:** Zero Marginal Cost Distribution. "Intelligence Designed."

## Canonical Skill Routing (Updated 2026-06-25)

**Do NOT invoke `apex-dev`.** It is superseded. Use the following skills instead:

| Task | Skill to invoke |
|---|---|
| General APEX development, features, architecture, OmniHub/OmniDash/OmniLink work | `apex-boost-claude` |
| Debugging, bug fixing, error diagnosis, stack traces, failing tests, pre-release audit | `apex-master-debug-claude` |
| Full platform dev/debug/repair/optimization — live Supabase/Cloudflare/edge access | `omnidev-apex-pro-1.0.0` |

All three skills are in `.claude/skills/`. Invoke via the `Skill` tool with the exact skill name above.
