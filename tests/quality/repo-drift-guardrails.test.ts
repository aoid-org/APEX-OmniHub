import { describe, expect, it } from 'vitest';
import { firstExecutableCallIndex, runRepoDriftChecks } from '../../scripts/ci/check_repo_drift.mjs';

describe('repo-wide anti-drift guardrails', () => {
  it('keeps canonical runtime, source-tree, security, hygiene, and docs evidence invariants intact', () => {
    expect(runRepoDriftChecks()).toEqual([]);
  });

  it('detects executable replay checks independently of import names or comments', () => {
    const source = `
      import { validateHMAC } from './hmac';
      // validateHMAC(...) in a comment must not count as executable verification.
      if (replayStore.isDuplicate(key)) return replay();
      if (!(await validateHMAC(canonical, signature, secret))) return deny();
    `;

    expect(firstExecutableCallIndex(source, 'replayStore.isDuplicate'))
      .toBeLessThan(firstExecutableCallIndex(source, 'validateHMAC'));
  });
});
