import { describe, expect, it } from "vitest";
import { countChangedLines, makeBranchName } from "../../src/propose/diff-stats.js";

describe("countChangedLines", () => {
  it("counts added and removed lines, excluding file headers", () => {
    const patch = [
      "--- a/foo.ts",
      "+++ b/foo.ts",
      "@@ -1,3 +1,3 @@",
      "-const a = 1;",
      "+const a = 2;",
      " const b = 2;",
      "+const c = 3;",
    ].join("\n");
    expect(countChangedLines(patch)).toBe(3);
  });

  it("returns 0 for a patch with no added/removed lines", () => {
    expect(countChangedLines("--- a/foo.ts\n+++ b/foo.ts\n@@ -1 +1 @@\n unchanged")).toBe(0);
  });

  it("returns 0 for an empty patch", () => {
    expect(countChangedLines("")).toBe(0);
  });
});

describe("makeBranchName", () => {
  it("embeds the date (without dashes) and a random suffix", () => {
    const name = makeBranchName("2026-07-01T10:00:00.000Z", () => 0.123456789);
    expect(name).toMatch(/^arise\/propose-redundancy-20260701-[a-z0-9]+$/);
  });

  it("produces different names for different random values", () => {
    const a = makeBranchName("2026-07-01T10:00:00.000Z", () => 0.1);
    const b = makeBranchName("2026-07-01T10:00:00.000Z", () => 0.9);
    expect(a).not.toBe(b);
  });
});
