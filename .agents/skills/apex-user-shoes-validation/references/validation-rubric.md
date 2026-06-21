# User-Shoes Validation Rubric

## Decision scale

### GO
Use GO only when all are true:
- the surface's product purpose is clear;
- the primary user path works or is honestly gated;
- every visible action works, is locally handled, or shows clear prerequisite copy;
- no raw backend IDs or fake placeholders appear;
- visual quality is preserved or improved;
- tests and browser evidence support the claim;
- no secrets or unsafe data are exposed.

### NO-GO
Use NO-GO if any are true:
- the entry point does nothing visible;
- the modal/surface serves no relevant user purpose;
- the user is routed to the wrong product flow;
- unsupported actions fire broken backend calls;
- generic 500 or `Failed to fetch` appears without actionable context;
- raw IDs leak into labels;
- settings or controls are blank or misleading;
- visual quality degrades;
- tests fail;
- required screenshots/evidence are missing.

### BLOCKED
Use BLOCKED only when validation cannot be completed because of an external condition, such as auth wall, deployment not complete, missing preview env, or unavailable test account. State the exact blocker and the next action.

## User-shoes questions

For each surface, answer:
1. What is this for?
2. What can I do here?
3. What happens when I click the primary action?
4. Did it work?
5. If it cannot work, did the product clearly explain why?
6. Does this feel like the same product as the rest of the build?
7. Would this survive a customer demo?

## Hard caps

Use these caps even if code tests pass:
- entry point no-op: max 60
- wrong product routing: max 65
- unsupported action fires generic backend failure: max 70
- generic `Failed to fetch`: max 75
- raw backend IDs visible: max 80
- blank settings/control rows: max 75
- visual degradation: max 70
- missing screenshots for visual change: max 85
- secrets exposed: max 40

## Visual preservation gate

For each visual change, require:
- before screenshot;
- after screenshot;
- explanation of preserved user value;
- explanation of preserved visual unity;
- pass/fail decision.

Reject changes that reduce module identity, remove meaningful context, flatten premium surfaces, or make the surface feel generic.
