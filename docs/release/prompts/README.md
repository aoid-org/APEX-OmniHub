# Release Prompt Execution Protocol (18 Prompts)

This folder tracks execution evidence for the production GO hardening sequence.

## Sequence
- PROMPT_01 through PROMPT_18 must execute strictly in order.
- Each prompt must maintain complete-file discipline and fail-closed validation.
- Each prompt must write `docs/release/prompts/PROMPT_NN_MANIFEST.md`.

## Required Exit Packet
Every prompt must end with:

```md
# PROMPT N EXIT PACKET
STATUS: PROMPT_GO | PROMPT_NO_GO
Changed files:
- <path> <sha256>
Validation:
- <command> => PASS|FAIL
Evidence docs updated:
- docs/release/prompts/PROMPT_N_MANIFEST.md
Next prompt allowed: YES|NO
If NO: smallest next fix is <one sentence>
```

## Fail-Closed Rule
No prompt may report `PROMPT_GO` if validations are bypassed, placeholder gates are used, or failures are hidden.
