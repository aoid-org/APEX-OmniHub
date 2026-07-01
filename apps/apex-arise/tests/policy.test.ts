/**
 * tests/policy.test.ts
 *
 * Regression guard for the A.R.I.S.E. self-edit hazard: no automated
 * process this repo builds may ever hold write access to its own
 * permission envelope (policy/arise-policy.yaml). This asserts the file
 * declares itself hard-blocked and never re-lists itself as writable.
 *
 * Parsed with plain text/regex, not a YAML library, to avoid adding a new
 * dependency to apps/apex-arise/package.json for a single-file structural
 * check.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "../src/paths.js";

const POLICY_PATH = path.join(REPO_ROOT, "policy", "arise-policy.yaml");
const SELF_PATH = "policy/arise-policy.yaml";

function extractListBlock(source: string, key: string): string[] {
  const lines = source.split("\n");
  const startIndex = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (startIndex === -1) return [];

  const items: string[] = [];
  for (const line of lines.slice(startIndex + 1)) {
    const match = /^\s*-\s*(\S+)/.exec(line);
    if (!match) break;
    items.push(match[1]);
  }
  return items;
}

describe("policy/arise-policy.yaml — self-edit hazard guard", () => {
  const source = readFileSync(POLICY_PATH, "utf-8");
  const writesPermitted = extractListBlock(source, "writes_permitted");
  const hardBlockedAlways = extractListBlock(source, "hard_blocked_always");

  it("declares policy/arise-policy.yaml in hard_blocked_always", () => {
    expect(hardBlockedAlways).toContain(SELF_PATH);
  });

  it("never re-lists policy/arise-policy.yaml in writes_permitted", () => {
    expect(writesPermitted).not.toContain(SELF_PATH);
  });

  it("is on phase 1 with a tier_1_propose block present", () => {
    expect(source).toMatch(/^phase:\s*1\s*$/m);
    expect(source).toMatch(/^tier_1_propose:\s*$/m);
  });
});
