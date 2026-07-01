/**
 * tests/paths.test.ts
 *
 * Validates the static path constants exported from src/paths.ts.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";

describe("paths", () => {
  it("exports REPO_ROOT as an absolute path", async () => {
    const { REPO_ROOT } = await import("../src/paths.js");
    expect(path.isAbsolute(REPO_ROOT)).toBe(true);
  });

  it("REPO_ROOT does not contain 'apex-arise' (it is the monorepo root, not the package root)", async () => {
    const { REPO_ROOT } = await import("../src/paths.js");
    expect(REPO_ROOT).not.toContain("apex-arise");
  });

  it("exports ARISE_ROOT as an absolute path containing 'apex-arise'", async () => {
    const { ARISE_ROOT } = await import("../src/paths.js");
    expect(path.isAbsolute(ARISE_ROOT)).toBe(true);
    expect(ARISE_ROOT).toContain("apex-arise");
  });

  it("REPO_ROOT and ARISE_ROOT are different directories", async () => {
    const { REPO_ROOT, ARISE_ROOT } = await import("../src/paths.js");
    expect(REPO_ROOT).not.toBe(ARISE_ROOT);
  });

  it("ARISE_ROOT is a subdirectory of REPO_ROOT", async () => {
    const { REPO_ROOT, ARISE_ROOT } = await import("../src/paths.js");
    // ARISE_ROOT must start with REPO_ROOT
    expect(ARISE_ROOT.startsWith(REPO_ROOT)).toBe(true);
  });

  it("exports SCAN_TARGETS as a non-empty string array", async () => {
    const { SCAN_TARGETS } = await import("../src/paths.js");
    expect(Array.isArray(SCAN_TARGETS)).toBe(true);
    expect(SCAN_TARGETS.length).toBeGreaterThan(0);
    for (const target of SCAN_TARGETS) {
      expect(typeof target).toBe("string");
      expect(target.length).toBeGreaterThan(0);
    }
  });

  it("SCAN_TARGETS includes the canonical 'src' directory", async () => {
    const { SCAN_TARGETS } = await import("../src/paths.js");
    expect(SCAN_TARGETS).toContain("src");
  });

  it("SCAN_TARGETS contains exactly 6 entries (Phase 0 scan scope is locked)", async () => {
    const { SCAN_TARGETS } = await import("../src/paths.js");
    expect(SCAN_TARGETS).toHaveLength(6);
  });

  it("all SCAN_TARGETS are relative paths (no leading slash)", async () => {
    const { SCAN_TARGETS } = await import("../src/paths.js");
    for (const target of SCAN_TARGETS) {
      expect(path.isAbsolute(target)).toBe(false);
    }
  });
});
