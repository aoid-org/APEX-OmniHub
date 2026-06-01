# Migration Playbook

## Failures (❌)
- Big-bang rewrite.
- No parity rules.

## Correct Pattern (✅)
Inventory → parity map (intent vs expression) → bridge layer → incremental migration → tests.

## Parity rules
Same intent; platform-native expression; shared tokens; verify back/escape, safe areas, text scaling, localization.
