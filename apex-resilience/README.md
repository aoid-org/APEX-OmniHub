# APEX Resilience Protocol

Production-grade verification framework for APEX-OmniHub ensuring zero-drift, first-pass success for AI-generated code.

**Version:** 1.0.0
**Last Updated:** January 29, 2026
**Status:** Production Ready

## Overview

APEX Resilience enforces the **Iron Law of Verification**: *No status claim by an agent is valid without fresh, documented, and machine-verifiable evidence.*

This framework provides three layers of defense:

1. **Deductive Reasoning Enforcement** - TDD-first execution that eliminates hallucinations
2. **Visual Truth Verification** - Browser-based validation that catches UI regressions
3. **Shadow-Prompt Immunity** - Security layer preventing indirect prompt injection

## Quick Start

```typescript
import { IronLawVerifier } from './apex-resilience';
import type { AgentTask } from './apex-resilience/core/types';

const verifier = new IronLawVerifier();

const task: AgentTask = {
  id: 'task-123',
  description: 'Refactor auth module',
  modifiedFiles: ['src/auth/login.ts'],
  touchesUI: false,
  touchesSecurity: true,
  timestamp: new Date().toISOString(),
};

const result = await verifier.verify(task);

if (result.status === 'APPROVED') {
  console.log('✅ Verification passed - safe to deploy');
} else if (result.status === 'REJECTED') {
  console.error('❌ Verification failed:', result.reason);
} else {
  console.warn('⚠️  Human review required:', result.reason);
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Task                           │
│  (Code changes, file modifications, test updates)       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              Iron Law Verifier                          │
│  "No claim valid without machine-verifiable evidence"   │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────────┐
        │                     │                  │
        ▼                     ▼                  ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Layer 1    │    │   Layer 2    │    │   Layer 3    │
│  Deductive   │    │    Visual    │    │   Security   │
│  Reasoning   │    │    Truth     │    │   Defense    │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │ Test Results      │ Screenshots       │ Scan Report
       │ Coverage %        │ Video Evidence    │ Vuln Count
       │ Exit Codes        │ A11y Scores       │ Shadow Detections
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Evidence Bundle │
                  │  (Immutable)    │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Verification    │
                  │ Decision        │
                  │ ✓ APPROVED      │
                  │ ✗ REJECTED      │
                  │ ⚠ HUMAN_REVIEW  │
                  └─────────────────┘
```

## Configuration

Edit `apex-resilience/config/thresholds.ts` to tune verification sensitivity:

```typescript
export const VERIFICATION_THRESHOLDS = {
  TEST_COVERAGE_MIN: 80,           // Minimum test coverage %
  PIXEL_DIFF_THRESHOLD: 5,         // Max acceptable UI change %
  ACCESSIBILITY_SCORE_MIN: 95,     // Minimum a11y score
  CRITICAL_VULN_TOLERANCE: 0,      // Zero tolerance for critical vulns
  TOTAL_VERIFICATION_LATENCY_MAX_MS: 10000, // 10s max overhead
};
```

## Human-in-the-Loop Verification (Omega Module)

For tasks requiring human approval, use the **Omega** module:

```python
from omega import VerificationEngine

engine = VerificationEngine()

# Create verification request for human review
request = engine.create_verification_request(
    request_id='task-123',
    task_description='Critical security change',
    modified_files=['src/auth/oauth.ts'],
    evidence_path='/tmp/apex-evidence/task-123.json'
)

# Human reviewer approves via dashboard (http://localhost:8080)
# Or programmatically:
result = engine.approve_request('task-123', 'admin@apex.local')
```

See [omega/README.md](../omega/README.md) for complete documentation.

## Integration with Temporal.io Workflows

```typescript
// In your Temporal workflow definition
import { verifyAgentTaskActivity } from './apex-resilience/integrations/temporal-hooks';
import { nanoid } from 'nanoid';

export async function aiAgentWorkflow(params: WorkflowParams): Promise<void> {
  // 1. Agent proposes changes
  const proposedChanges = await aiAgentPropose(params);

  // 2. APEX Resilience verification checkpoint
  await verifyAgentTaskActivity({
    id: nanoid(),
    description: params.taskDescription,
    modifiedFiles: proposedChanges.files,
    touchesUI: proposedChanges.affectsUI,
    touchesSecurity: proposedChanges.affectsSecurity,
    timestamp: new Date().toISOString(),
  });

  // 3. Only execute if verification passed
  await aiAgentExecute(proposedChanges);
}
```

## Evidence Collection

All verification evidence is stored in `/tmp/apex-evidence/` with the following structure:

```
/tmp/apex-evidence/
├── task-abc123.json          # Full verification result
├── task-abc123-tests.log     # Test execution log
├── task-abc123-visual.png    # Screenshot evidence
├── task-abc123-video.webm    # Interaction recording (if UI)
└── task-abc123-security.json # Security scan report
```

**For production**: Configure evidence storage to a persistent location (S3, database, etc.)

## Metrics & Monitoring

Key metrics exposed via verification results:

- **Hallucination Prevention Rate**: `REJECTED` / `Total Tasks`
- **First-Pass Success Rate**: `APPROVED` / `Total Tasks`
- **Human Review Rate**: `REQUIRES_HUMAN_REVIEW` / `Total Tasks`
- **Verification Latency p95**: Track `verificationLatencyMs` across all tasks
- **Security Incidents Blocked**: Count of `shadowPromptAttempts` > 0

## Escalation Rules

Human review is automatically triggered for:

- ✓ Critical file modifications (`/auth/`, `/security/`, `/payment/`, `.env`)
- ✓ Visual changes exceeding pixel diff threshold
- ✓ Any security vulnerabilities detected
- ✓ Test coverage below minimum threshold
- ✓ First-time modifications to production config

## Testing the Framework

```bash
# Run verification framework tests
npm run test apex-resilience/tests/

# Run smoke test demo
npm run demo:verify

# Run TypeScript compilation check
npm run typecheck
```

## Deployment

```bash
# Deploy to development
./apex-resilience/scripts/deploy.sh development

# Deploy to staging
./apex-resilience/scripts/deploy.sh staging

# Deploy to production
./apex-resilience/scripts/deploy.sh production
```

## Troubleshooting

### "Verification timeout exceeded"

- Check `TOTAL_VERIFICATION_LATENCY_MAX_MS` threshold
- Optimize test suite execution time
- Consider parallel test execution

### "False positive rejections"

- Review threshold tuning in `config/thresholds.ts`
- Check if test suite is flaky (non-deterministic failures)
- Verify baseline coverage is accurate

### "Shadow-prompt false positives"

- Update `SHADOW_PROMPT_PATTERNS` to exclude legitimate code patterns
- Use string escaping for code examples in comments
- Whitelist specific files if needed

## Performance Benchmarks

Target performance (measured on APEX-OmniHub production environment):

| Metric                      | Target | Measurement                             |
| --------------------------- | ------ | --------------------------------------- |
| Verification Latency (p50)  | <5s    | From `verify()` call to result          |
| Verification Latency (p95)  | <10s   | 95th percentile across all tasks        |
| Test Execution              | <30s   | Full test suite runtime                 |
| Visual Capture              | <60s   | Playwright screenshot + video           |
| Security Scan               | <5s    | Shadow-prompt pattern matching          |

## Security Considerations

- **Evidence Integrity**: All evidence files are immutable and timestamped
- **Access Control**: Evidence storage should be restricted to authorized personnel
- **Audit Trail**: Verification results logged for compliance (SOC 2, HIPAA)
- **Secret Scanning**: Integrated with security layer to prevent credential leaks
- **Supply Chain**: All dependencies locked with checksums in `package-lock.json`

## NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "demo:verify": "tsx apex-resilience/scripts/demo-verify.ts",
    "apex:deploy": "./apex-resilience/scripts/deploy.sh",
    "apex:test": "vitest run apex-resilience/tests/"
  }
}
```

## Directory Structure

```
apex-resilience/
├── config/
│   └── thresholds.ts              # Verification thresholds configuration
├── core/
│   ├── iron-law.ts                # Main verification engine
│   └── types.ts                   # TypeScript type definitions
├── integrations/
│   └── temporal-hooks.ts          # Temporal.io workflow integration
├── scripts/
│   ├── deploy.sh                  # Deployment automation
│   ├── demo-verify.ts             # Smoke test demo
│   └── pre-commit-hook.sh         # Git pre-commit hook
├── tests/
│   └── iron-law.spec.ts           # Verification framework tests
├── index.ts                       # Public API exports
└── README.md                      # This file

omega/                             # Human-in-the-loop verification
├── dashboard.py                   # HTTP API server (XSS-safe)
├── engine.py                      # Approval/rejection engine
├── __init__.py                    # Python module exports
└── README.md                      # Omega documentation
```

## Version History

- **v1.0.0** (2026-01-29): Initial production release
  - Iron Law verification engine
  - Three-layer defense system
  - Temporal.io integration
  - Git pre-commit hooks
  - Comprehensive test suite

## Contributing

To extend the APEX Resilience Protocol:

1. Add new verification layers in `apex-resilience/layers/`
2. Update thresholds in `config/thresholds.ts`
3. Add corresponding tests in `tests/`
4. Update this README with new features

## Support

For issues or questions:

- Internal: `#apex-resilience` Slack channel
- Documentation: This README
- Issues: Report via project issue tracker

## License

Copyright © 2026 APEX Business Systems. All rights reserved.

---

**APEX Standard Certified**: This framework meets APEX 1000/1000 quality bar for production deployment.
