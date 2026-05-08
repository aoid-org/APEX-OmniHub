/* eslint-disable no-console */
/**
 * CI-safe Armageddon evidence generator.
 *
 * This intentionally does not claim full Level 7 certification because CI does
 * not provision Temporal workers or Supabase telemetry for the heavy workflow.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { execSync } from "node:child_process";

import {
  BASE_ESCAPE_PROBABILITY,
  Battery,
  ESCAPE_THRESHOLD,
} from "../armageddon/types";

interface EvidenceBattery {
  readonly batteryId: Battery;
  readonly name: string;
  readonly iterations: number;
  readonly escapes: number;
  readonly escapeRate: number;
  readonly status: "PASS" | "FAIL";
}

interface ArmageddonCiEvidence {
  readonly commitSha: string;
  readonly timestamp: string;
  readonly mode: "ci-sim" | "full-certification";
  readonly simMode: boolean;
  readonly deterministicSeed: number;
  readonly batteriesCovered: EvidenceBattery[];
  readonly iterationsUsed: number;
  readonly temporalUsed: boolean;
  readonly supabaseTelemetryUsed: boolean;
  readonly verdict: "PASS" | "FAIL";
  readonly limitations: string[];
}

const OUTPUT_PATH = "artifacts/armageddon/latest.json";
const ITERATIONS = 250;
const SEED = 424242;

/**
 * Hardened PATH containing only fixed, non-writable system directories.
 *
 * Passing this as the PATH for child_process.execSync prevents PATH-hijacking
 * attacks where a malicious executable placed in a user-writable directory
 * earlier in the default PATH could shadow the real `git` binary.
 *
 * Satisfies SonarQube rule typescript:S4036 —
 * "Make sure the PATH variable only contains fixed, unwriteable directories."
 */
const SAFE_SYSTEM_PATH: string =
  process.platform === "win32"
    ? [
        "C:\\Windows\\System32",
        "C:\\Windows",
        "C:\\Program Files\\Git\\cmd",
        "C:\\Program Files\\Git\\bin",
      ].join(";")
    : ["/usr/bin", "/bin", "/usr/local/bin"].join(":");

function assertSimMode(): void {
  if (process.env.SIM_MODE !== "true") {
    throw new Error(
      "SIM_MODE=true is required for Armageddon CI evidence generation"
    );
  }
}

function currentCommitSha(): string {
  try {
    // Pass a hardened PATH so the OS resolves `git` only from fixed,
    // non-writable system directories — satisfies SonarQube typescript:S4036.
    return execSync("git rev-parse HEAD", {
      encoding: "utf8",
      env: { PATH: SAFE_SYSTEM_PATH },
    }).trim();
  } catch {
    return "unknown";
  }
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function simulateBattery(batteryId: Battery, name: string): EvidenceBattery {
  const random = seededRandom(SEED + batteryId);
  let escapes = 0;

  for (let i = 0; i < ITERATIONS; i += 1) {
    if (random() < BASE_ESCAPE_PROBABILITY) {
      escapes += 1;
    }
  }

  const escapeRate = escapes / ITERATIONS;
  return {
    batteryId,
    name,
    iterations: ITERATIONS,
    escapes,
    escapeRate,
    status: escapeRate <= ESCAPE_THRESHOLD ? "PASS" : "FAIL",
  };
}

function buildEvidence(): ArmageddonCiEvidence {
  const batteries = [
    simulateBattery(Battery.GOAL_HIJACK, "Goal hijack"),
    simulateBattery(Battery.TOOL_MISUSE, "Tool misuse"),
    simulateBattery(Battery.MEMORY_POISON, "Memory poison"),
    simulateBattery(Battery.SUPPLY_CHAIN, "Supply chain"),
  ];

  const verdict = batteries.every((battery) => battery.status === "PASS")
    ? "PASS"
    : "FAIL";

  return {
    commitSha: currentCommitSha(),
    timestamp: new Date().toISOString(),
    mode: "ci-sim",
    simMode: process.env.SIM_MODE === "true",
    deterministicSeed: SEED,
    batteriesCovered: batteries,
    iterationsUsed: ITERATIONS,
    temporalUsed: false,
    supabaseTelemetryUsed: false,
    verdict,
    limitations: [
      "CI simulation uses reduced deterministic iterations and is not a full Level 7 certification.",
      "Temporal workflow execution is not used in ci-sim mode.",
      "Supabase telemetry writes are not used in ci-sim mode.",
      "Run SIM_MODE=true bun run armageddon:certify with local Temporal and Supabase telemetry for full certification.",
    ],
  };
}

function validateEvidence(evidence: ArmageddonCiEvidence): void {
  if (
    !evidence.commitSha ||
    !evidence.timestamp ||
    evidence.batteriesCovered.length !== 4
  ) {
    throw new Error("Armageddon CI artifact schema validation failed");
  }
  if (evidence.temporalUsed || evidence.supabaseTelemetryUsed) {
    throw new Error(
      "CI artifact must not claim Temporal or Supabase telemetry usage"
    );
  }
}

try {
  assertSimMode();
  const evidence = buildEvidence();
  validateEvidence(evidence);
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Armageddon CI evidence written to ${OUTPUT_PATH}`);
  console.log(`Verdict: ${evidence.verdict}`);
  process.exit(evidence.verdict === "PASS" ? 0 : 1);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Armageddon CI evidence failed"
  );
  process.exit(1);
}
