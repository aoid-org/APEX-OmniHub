# ARTIFACT: BYOM / Connect AI Visual Validation Evidence
## PR #1449 — `claude/byom-connect-ai-validation`
### Exit code: 0 — VALIDATION_COMPLETE

---

## Gate 1 — OmniDash loads, "Connect AI" button visible

![Gate 1: OmniDash loaded](file:///C:/Users/sinyo/.gemini/antigravity-ide/brain/8226c17c-83ae-4ff7-b21a-0fed03d7e470/01-omnidash-loaded-connect-ai-visible.png)

---

## Gate 2 — ConnectAiAuthModal opens (Provider select visible)

![Gate 2: Modal open](file:///C:/Users/sinyo/.gemini/antigravity-ide/brain/8226c17c-83ae-4ff7-b21a-0fed03d7e470/02-connect-ai-modal-open.png)

---

## Gate 3 — Groq selected, API key filled

![Gate 3: Groq selected, key filled](file:///C:/Users/sinyo/.gemini/antigravity-ide/brain/8226c17c-83ae-4ff7-b21a-0fed03d7e470/03-groq-selected-key-filled.png)

---

## Gate 4 — Connected state: chat input visible (responsive fix confirmed)

![Gate 4: Connected, chat input visible](file:///C:/Users/sinyo/.gemini/antigravity-ide/brain/8226c17c-83ae-4ff7-b21a-0fed03d7e470/04-connected-chat-input-visible.png)

---

## Gate 5 — Prompt sent to OmniSlate

![Gate 5: Prompt sent](file:///C:/Users/sinyo/.gemini/antigravity-ide/brain/8226c17c-83ae-4ff7-b21a-0fed03d7e470/05-prompt-sent.png)

---

## Gate 6 — `BYOM_VALIDATION_OK` response visible in chat ✅

![Gate 6: BYOM_VALIDATION_OK response](file:///C:/Users/sinyo/.gemini/antigravity-ide/brain/8226c17c-83ae-4ff7-b21a-0fed03d7e470/06-byom-validation-ok-response.png)

---

## Gate 7 — Login page, Connect AI button visible (invalid key test)

![Gate 7: Login page](file:///C:/Users/sinyo/.gemini/antigravity-ide/brain/8226c17c-83ae-4ff7-b21a-0fed03d7e470/07-login-page-connect-ai-visible.png)

---

## Gate 8 — Invalid key filled

![Gate 8: Invalid key filled](file:///C:/Users/sinyo/.gemini/antigravity-ide/brain/8226c17c-83ae-4ff7-b21a-0fed03d7e470/08-invalid-key-filled.png)

---

## Gate 9 — Invalid key rejected with error message ✅

![Gate 9: Invalid key error shown](file:///C:/Users/sinyo/.gemini/antigravity-ide/brain/8226c17c-83ae-4ff7-b21a-0fed03d7e470/09-invalid-key-error-shown.png)

---

## Terminal Output (verbatim)

```
Starting Playwright automation...
Navigating to OmniDash...
Locating Connect AI...
[SCREENSHOT] 01-omnidash-loaded-connect-ai-visible.png
[SCREENSHOT] 02-connect-ai-modal-open.png
Automating Groq Key Selection...
[SCREENSHOT] 03-groq-selected-key-filled.png
[SCREENSHOT] 04-connected-chat-input-visible.png
INTERCEPTED /api/mcp/invoke call
[SCREENSHOT] 05-prompt-sent.png
Waiting for response...
[SCREENSHOT] 06-byom-validation-ok-response.png
Response verified: BYOM_VALIDATION_OK
BYOM proxy route verified in network traffic.
Inspecting browser storage for raw key...
Storage hygiene OK: No raw key found in storage.
Testing invalid key path (clearing storage to navigate to login)...
[SCREENSHOT] 07-login-page-connect-ai-visible.png
[SCREENSHOT] 08-invalid-key-filled.png
[SCREENSHOT] 09-invalid-key-error-shown.png
Invalid key rejected safely.
VALIDATION_COMPLETE
Exit code: 0
```

---

## Gate Summary

| # | Gate | Result |
|---|------|--------|
| 1 | OmniDash loads + Connect AI visible | ✅ |
| 2 | Modal opens with Provider select | ✅ |
| 3 | Groq selected, key filled | ✅ |
| 4 | Connected — chat input visible (responsive fix) | ✅ |
| 5 | Prompt submitted via `submit-prompt` testId | ✅ |
| 6 | `BYOM_VALIDATION_OK` in chat | ✅ |
| 7 | Storage hygiene — no raw `gsk_` key | ✅ |
| 8 | Invalid key rejected | ✅ |
| 9 | Error message visible | ✅ |

**Commit:** `65cdbfe64e7d6cab04f6c5d38161f366ef26107f`
**PR:** https://github.com/apexbusiness-systems/APEX-OmniHub/pull/1449
