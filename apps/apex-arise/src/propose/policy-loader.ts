import { readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../paths.js";
import type { ProposePolicy } from "./types.js";

const POLICY_PATH = path.join(REPO_ROOT, "policy", "arise-policy.yaml");

/**
 * Minimal text-based extraction, not a full YAML parser, to avoid adding a
 * new dependency to apps/apex-arise/package.json for a single known-shape
 * config file. Only supports the scalar and dash-list shapes this policy
 * file actually uses.
 */
function extractListBlock(source: string, key: string): string[] {
  const lines = source.split("\n");
  const startIndex = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (startIndex === -1) return [];

  const items: string[] = [];
  for (const line of lines.slice(startIndex + 1)) {
    const match = /^\s*-\s*(\S+)/.exec(line);
    if (!match) break;
    items.push(match[1]!);
  }
  return items;
}

function extractNumberField(source: string, blockKey: string, fieldKey: string): number | null {
  const lines = source.split("\n");
  const startIndex = lines.findIndex((line) => line.startsWith(`${blockKey}:`));
  if (startIndex === -1) return null;

  for (const line of lines.slice(startIndex + 1)) {
    if (/^\S/.test(line)) break; // next top-level key ends the block
    const match = new RegExp(`^\\s*${fieldKey}:\\s*(\\d+)`).exec(line);
    if (match) return Number(match[1]);
  }
  return null;
}

export class PolicyLoadError extends Error {}

export function loadProposePolicy(): ProposePolicy {
  let source: string;
  try {
    source = readFileSync(POLICY_PATH, "utf-8");
  } catch (err) {
    throw new PolicyLoadError(`failed to read ${POLICY_PATH}: ${err instanceof Error ? err.message : String(err)}`);
  }

  const hardBlockedAlways = extractListBlock(source, "hard_blocked_always");
  const maxLinesChanged = extractNumberField(source, "tier_1_propose", "max_lines_changed");
  const maxFilesChanged = extractNumberField(source, "tier_1_propose", "max_files_changed");

  if (maxLinesChanged === null || maxFilesChanged === null) {
    throw new PolicyLoadError("tier_1_propose.max_lines_changed / max_files_changed missing from policy/arise-policy.yaml");
  }
  if (hardBlockedAlways.length === 0) {
    throw new PolicyLoadError("hard_blocked_always is empty or missing from policy/arise-policy.yaml");
  }

  return {
    tier1: { maxLinesChanged, maxFilesChanged },
    hardBlockedAlways,
  };
}
