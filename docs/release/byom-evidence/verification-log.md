# ARTIFACT: Verification Evidence
## PR #1449 — BYOM Validation + Contrast Fix

---

### Git Metadata

```
$ git rev-parse HEAD
65cdbfe64e7d6cab04f6c5d38161f366ef26107f

$ git status -sb
## claude/byom-connect-ai-validation...origin/claude/byom-connect-ai-validation
?? chatInput_hidden.png
?? supabase/.branches/
?? temp_byom_validation.mjs

$ git log --oneline -4
65cdbfe6 fix(byom): restore theme CSS variable contract + add dark-mode error contrast token
906d35fa fix(omnidash): preserve OmniSlate controls across responsive layouts (#1451)
d2316f51 fix(omnidash): preserve omnislate controls across responsive layouts
e2f3bafc fix(byom): satisfy CI governance gates with additive-allow annotations + RFC/ops-doc evidence
```

**Remote push:** `d2316f51..65cdbfe6 → origin/claude/byom-connect-ai-validation` ✅

---

### Playwright E2E Validation

```
$ node temp_byom_validation.mjs
Starting Playwright automation...
Navigating to OmniDash...
Locating Connect AI...

=======================================================
Automating Groq Key Selection...
=======================================================

Waiting for user to submit and for connection to succeed...
Verifying connected state...
INTERCEPTED /api/mcp/invoke call
Waiting for response...
Response verified: BYOM_VALIDATION_OK
BYOM proxy route verified in network traffic.
Inspecting browser storage for raw key...
Storage hygiene OK: No raw key found in storage.
Testing invalid key path (clearing storage to navigate to login)...
Opening Connect AI modal on login page...
Automatically selecting Groq for invalid key test...
Invalid key rejected safely.
VALIDATION_COMPLETE
Exit code: 0
```

---

### TypeScript Strict Mode

```
$ npm run typecheck
> tsc -b --noEmit

Exit code: 0  ✅  (no errors, no warnings)
```

---

### ESLint

```
$ npm run lint
> eslint .

Exit code: 0  ✅  (no errors, no warnings)
```

---

### Files Changed

| File | Change |
|------|--------|
| `apps/omnihub-site/dashboard/OmniDashShell.tsx` | `data-testid` selectors + `minWidth:0` responsive fix |
| `apps/omnihub-site/dashboard/components/DashboardOverview/components/OmniSlatePane.tsx` | `flex:1, minHeight:0` prevents viewport collapse |
| `apps/omnihub-site/src/components/byom/ConnectAiAuthModal.tsx` | Restored CSS variable token mapping (eliminated hardcoded hex contrast regression) |
| `apps/omnihub-site/src/styles/theme.css` | Added `--color-error: #f87171` override in `[data-theme="dark"]` block (WCAG AA on dark surfaces) |

---

### Validation Gates

| Gate | Status |
|------|--------|
| Playwright BYOM E2E (valid key) | ✅ PASS — `BYOM_VALIDATION_OK` response verified |
| Playwright BYOM E2E (invalid key) | ✅ PASS — invalid key rejected safely |
| Storage hygiene (no raw key in localStorage/sessionStorage) | ✅ PASS |
| `/api/mcp/invoke` route intercepted | ✅ PASS |
| TypeScript strict `tsc -b --noEmit` | ✅ exit 0 |
| ESLint | ✅ exit 0 |
| Git push to PR #1449 branch | ✅ `65cdbfe6` live on remote |

---

### SonarCloud / CI

UNVERIFIED in this session (no API access). CI will gate on push to PR #1449.
Manual step: Confirm CI green at https://github.com/apexbusiness-systems/APEX-OmniHub/pull/1449
