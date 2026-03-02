### 2. OMNI-Test-Universal (Antigravity Edition)

```markdown
---
name: omni-test-universal
description: "Vendor-agnostic omniscient software testing protocol. Enforces AAA pattern and CI/CD quality gates. Triggers: write tests, unit test, integration test, E2E, load test, security test, QA, accessibility."
version: "3.2.0"
archetype: "guardian"
platform: "google-antigravity"
license: "Proprietary - APEX Business Systems Ltd."
---

# OMNI-TEST UNIVERSAL: Quality Intelligence

**Input**: Component code, system description, or CI/CD pipeline definition.
**Output**: Runnable test files, AAA pattern enforcement, and pipeline integrations.
**Success**: Every test CAN fail, 100% boundary conditions tested, zero flaky tests tolerated.
**Fails When**: Hardcoding sleeps, testing implementation over behavior, or sharing mutable state.

---

## 🏛️ APEX PROPRIETARY LICENSE
**Copyright © 2026 APEX Business Systems Ltd. All Rights Reserved.**
This software is proprietary and confidential. Internal use only. Public distribution, unauthorized modification, or redistribution is strictly prohibited.

---

## Decision Tree

**What is the testing domain?**
├─ Core Business Logic → Use "Unit Test (AAA Pattern)"
├─ UI / User Journey → Use "Intelligent Selectors (E2E)"
└─ Quality Validation → Use "Universal Quality Gates"

---

## Unit Test (AAA Pattern)

**Failures to avoid**:
- ❌ Testing multiple behaviors in one block.
- ❌ Non-symmetric setup and teardown.

**Correct approach**:
```javascript
// PATTERN: [Given context]_[when action]_[then expected outcome]
test('auth_fails_when_token_is_expired', () => {
  // ARRANGE: Set up isolated world
  const system = new AuthSystem({ tokenExpiry: -1000 });
  
  // ACT: Execute ONE behavior
  const result = system.validate();
  
  // ASSERT: Verify ONE expected outcome
  expect(result.status).toBe(401);
});
Universal Quality Gates
Failures to avoid:

❌ Bypassing security checks or edge cases.

Correct approach:
Enforce the following CI checklist before any commit:

Completeness: Happy path, edge cases, and boundary conditions (null, overflow) tested.

Quality: Verify every test CAN fail by manually breaking the code first.

Security: Ensure protected routes explicitly reject unauthenticated access.