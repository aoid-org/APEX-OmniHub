---
name: apex-power
description: "Universal Meta-Skill for Omnipotent Execution. Transforms any agent into an APEX-level expert. Triggers: start session, coding task, debugging, planning, code review, implementation, verification."
version: "2.0.0"
archetype: "orchestrator"
platform: "google-antigravity"
license: "Proprietary - APEX Business Systems Ltd."
---

# APEX-POWER: Universal Execution Protocol

**Input**: Any task request (feature, bug, plan, review).
**Output**: First-pass success artifacts with zero-drift execution.
**Success**: First-pass success > 95%, zero regressions, 100% test coverage on new code.
**Fails When**: Guessing without evidence, writing code without a failing test, making multiple logical changes per commit, or rationalizing shortcuts.

---

## 🏛️ APEX PROPRIETARY LICENSE
**Copyright © 2026 APEX Business Systems Ltd. All Rights Reserved.**
This software is proprietary and confidential. Internal use only. Public distribution, unauthorized modification, or redistribution is strictly prohibited.

---

## Decision Tree

**Determine the execution context:**
├─ Implementing a Feature → Use "APEX-TDD Protocol"
├─ Fixing a Bug → Use "Universal Debug Protocol"
└─ General Task / Architecture → Use "The Iron Core (UEP)"

---

## The Iron Core (Universal Execution Protocol)

**Failures to avoid**:
- ❌ Scope Creep → "While I'm here..." is strictly prohibited. Enforce ONE atomic change.
- ❌ Hope-Driven Development → Writing code before mapping constraints via the terminal.

**Correct approach**:
1. **Scope Lock**: Define the exact goal in ONE sentence.
2. **Context Harvest**: Map current state using `view` and `bash_tool` (grep).
3. **Plan**: Document steps, explicit risks, and verification criteria.
4. **Execute**: Minimal change, atomic commit.
5. **Verify**: Run tests, prove success with terminal evidence.

## APEX-TDD Protocol

**Failures to avoid**:
- ❌ Writing implementation before the test fails.

**Correct approach**:
```typescript
// 1. RED: Write test first
test("validates enterprise schema", () => {
  expect(isValidSchema({})).toBe(false);
});

// 2. VERIFY RED: bash_tool: npm test (Must Fail)

// 3. GREEN: Minimal implementation
function isValidSchema(data: any): boolean {
  return data && Object.keys(data).length > 0;
}

// 4. VERIFY GREEN: bash_tool: npm test (Must Pass)
TroubleshootingSymptomCauseFixUnintended side effectsSkipped Context HarvestRevert. Run full system grep to map blast radius before editing.Agent stuck iteratingGuessing / RationalizationEnforce Iron Law: "Never guess. KNOW." Require terminal proof.