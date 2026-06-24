import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

test('write-release-validation-summary.mjs tests', async (t) => {
  const SCRIPT_PATH = path.resolve('scripts/ci/write-release-validation-summary.mjs');
  const OUT_PATH = path.resolve('test-release-validation-summary.json');
  const PREFLIGHT_PATH = path.resolve('test-shadow-preflight.json');

  const cleanup = () => {
    if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);
    if (fs.existsSync(PREFLIGHT_PATH)) fs.unlinkSync(PREFLIGHT_PATH);
  };

  t.afterEach(() => {
    cleanup();
  });

  await t.test('writes factual fields without final_verdict and missing preflight correctly', () => {
    cleanup();

    execSync(`node "${SCRIPT_PATH}"`, {
      env: {
        ...process.env,
        RELEASE_VALIDATION_SUMMARY_OUTPUT_PATH: OUT_PATH,
        PREFLIGHT_OUTPUT_PATH: PREFLIGHT_PATH,
        GH_SHA: 'abcdef123',
        RELEASE_CUT_RAW: 'true'
      }
    });

    assert.strictEqual(fs.existsSync(OUT_PATH), true, 'summary file is written');

    const content = fs.readFileSync(OUT_PATH, 'utf8');
    const summary = JSON.parse(content);

    // Required factual fields exist
    assert.strictEqual(summary.schema_version, 1);
    assert.strictEqual(summary.commit_sha, 'abcdef123');
    assert.strictEqual(summary.release_cut_detected, true, 'release_cut_detected is boolean');
    assert.strictEqual(summary.shadow_preflight_status, 'blocked');
    assert.strictEqual(summary.shadow_preflight_blockers[0].id, 'VALIDATION_PREFLIGHT_UNAVAILABLE');

    // final_verdict is absent
    assert.strictEqual(summary.final_verdict, undefined);

    // Banned strings absent
    assert.ok(!content.includes('CERTIFIED'));
    assert.ok(!content.includes('NOT_CERTIFIED'));
    assert.ok(!content.includes('CERTIFICATION_PENDING'));
  });
});
