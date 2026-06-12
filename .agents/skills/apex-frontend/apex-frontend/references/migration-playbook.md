---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Migration Playbook

## Failures (❌)
- Big-bang rewrite.
- No parity rules.

## Correct Pattern (✅)
Inventory → parity map (intent vs expression) → bridge layer → incremental migration → tests.

## Parity rules
Same intent; platform-native expression; shared tokens; verify back/escape, safe areas, text scaling, localization.
