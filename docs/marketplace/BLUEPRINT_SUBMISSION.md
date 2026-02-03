<!-- VALUATION_IMPACT: Guides third-party blueprint submission for marketplace monetization -->
<!-- Generated: 2026-02-03 -->
# Prerequisites
- TypeScript expertise
- Zod schema familiarity (`src/blueprints/schema.ts`)
- Agreement to marketplace SLA

# Submission Process
1. Fork `apex-omnihub`, checkout `main`, and create a feature branch.
2. Add blueprint JSON under `src/blueprints/samples/` with full metadata.
3. Create targeted Vitest coverage in `src/blueprints/__tests__/`.
4. Document behavior in runbooks or this guide.
5. Open PR referencing the compliance checklist.

# Validation Criteria
| Item | Requirement |
| --- | --- |
| Schema | `WorkflowSchema.parse()` succeeds |
| Coverage | Vitest battery includes new blueprint |
| Documentation | Describe triggers, steps, outputs |
| CI | `npm run lint && npm test` passes |

# Review Timeline
- Review begins within 48 hours
- Approval requires two maintainer signatures
- CI green before merge

# Blueprint Template
```json
{
  "name": "example-flow",
  "version": "1.0.0",
  "description": "Describe the business value in under 200 characters.",
  "triggers": [{ "type": "manual" }],
  "steps": [{
    "id": "step-one",
    "name": "Step One",
    "executor": "stepOneActivity",
    "inputs": ["inputA"],
    "outputs": ["outputA"]
  }],
  "outputs": [{ "name": "outputA", "type": "string" }]
}
```

# Approval Requirements
- Two maintainer approvals
- CI green on latest commit

# Verify:
markdownlint docs/marketplace/BLUEPRINT_SUBMISSION.md
