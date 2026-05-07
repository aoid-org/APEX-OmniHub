import { describe, expect, it } from 'vitest';
import { runRepoDriftChecks } from '../../scripts/ci/check_repo_drift.mjs';

describe('repo-wide anti-drift guardrails', () => {
  it('keeps canonical runtime, source-tree, security, hygiene, and docs evidence invariants intact', () => {
    expect(runRepoDriftChecks()).toEqual([]);
  });
});
