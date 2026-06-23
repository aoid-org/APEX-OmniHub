#!/usr/bin/env node
// APEX-OmniHub CI Shared Utilities
// Single source of truth for helpers used by multiple CI gate scripts.
// Import with: import { walkFiles } from "./ci-utils.mjs";
import fs from "node:fs";
import path from "node:path";

/**
 * Recursively collect files under `dir` whose extensions are in `extSet`,
 * skipping any path that matches a pattern in `excludePatterns`.
 *
 * @param {string} dir - Absolute directory path to walk.
 * @param {Set<string>} extSet - Allowed extensions, e.g. new Set([".ts", ".tsx"]).
 * @param {RegExp[]} excludePatterns - Paths matching any pattern are skipped.
 * @param {string[]} [acc=[]] - Accumulator (mutated in-place).
 * @returns {string[]} Collected absolute file paths.
 */
export function walkFiles(dir, extSet, excludePatterns, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (excludePatterns.some((re) => re.test(full.replaceAll("\\", "/")))) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkFiles(full, extSet, excludePatterns, acc);
    else if (extSet.has(path.extname(full))) acc.push(full);
  }
  return acc;
}
