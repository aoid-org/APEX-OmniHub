// APEX-OmniHub Production Release Verification Suite
// Sonar-clean: S5443, S1126, S2486, S4036 addressed.
import { spawnSync, spawn } from "node:child_process";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";

console.log("=== APEX-OmniHub Production Release Verification Suite ===");

const verifyScripts = [
  { name: "verify:ci-integrity",      desc: "CI configuration & integrity scan" },
  { name: "verify:types",             desc: "TypeScript referenced project typecheck" },
  { name: "verify:lint",              desc: "Strict ESLint & Ruff checks" },
  { name: "verify:test",              desc: "Vitest & Pytest verification" },
  { name: "verify:build",             desc: "Vite production compilation" },
  { name: "verify:cloudflare-pages-contract", desc: "Cloudflare Pages repository contract" },
  { name: "verify:security",          desc: "Secrets & npm audit checks" },
  { name: "verify:assets",            desc: "Production assets resolution checks" },
  { name: "verify:supabase-security", desc: "Supabase table RLS & functions audit" },
  { name: "verify:edge-functions",    desc: "Gate 29: frontend-referenced edge functions exist (+deployed when token present)" },
  { name: "verify:claim-hygiene",     desc: "Launch badge & public copy alignment" },
  { name: "verify:armageddon-attestation", desc: "Armageddon certificate signature & plaque drift check" },
  { name: "verify:supply-chain",      desc: "Dependency provenance & lockfile checks" },
  { name: "verify:cloudflare-pages-contract", desc: "Cloudflare Pages build/output contract" },
];

// Allowlist of PATH entries that are safe for subprocess execution.
// Uses an allowlist (not a blocklist) to avoid S5443 false positives on
// writable-directory detection — we never create files here, only filter PATH.
const WIN_PATH_ALLOWLIST = [
  "/bun/bin",
  "/program files/",
  "/windows/system32",
  "/windows/",
  "/python",
  "/appdata/",
];
const UNIX_PATH_ALLOWLIST = [
  "/.bun/bin",
  "/.pyenv/",
  "/.local/share/mise/",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/opt/",
];

function isSafePathEntry(p) {
  if (!p || !path.isAbsolute(p)) return false;
  const normalized = p.toLowerCase().replaceAll("\\", "/");
  const allowlist = process.platform === "win32" ? WIN_PATH_ALLOWLIST : UNIX_PATH_ALLOWLIST;
  return allowlist.some((safe) => normalized.includes(safe));
}

function sanitizePath() {
  const currentPath = process.env.PATH ?? "";
  const separator = process.platform === "win32" ? ";" : ":";
  return currentPath.split(separator).filter(isSafePathEntry).join(separator);
}

function findSystemPkgManager(isWin) {
  const candidates = isWin
    ? ["C:/Program Files/bun/bun.exe", "C:/Program Files/nodejs/node.exe"]
    : ["/usr/local/bin/bun", "/usr/bin/bun", "/bin/bun"];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function findAbsolutePkgManager() {
  const isWin = process.platform === "win32";
  const binaryName = isWin ? "bun.exe" : "bun";

  // 1. Respect npm_execpath set by the calling package manager
  if (process.env.npm_execpath && fs.existsSync(process.env.npm_execpath)) {
    return process.env.npm_execpath;
  }

  // 2. User-local bun installation
  const homeDir = process.env.USERPROFILE ?? process.env.HOME ?? "";
  if (homeDir) {
    const localBun = path.join(homeDir, ".bun", "bin", binaryName);
    if (fs.existsSync(localBun)) return localBun;
  }

  // 3. Well-known system locations
  const systemPath = findSystemPkgManager(isWin);
  if (systemPath) return systemPath;

  // 4. Ultimate fallback
  return isWin ? "bun.cmd" : "bun";
}

// Every verify gate is now fully implemented with real checks, so none may fail silently.
// A non-empty allowlist here would re-introduce the fake-pass mechanism this suite exists
// to prevent (Prompts 1, 9, 18). Keep it empty: every gate is required and fail-closed.
const DOWNSTREAM_GATES = new Set([]);

let failed = false;
const pkgManager = findAbsolutePkgManager();
const safeEnv = { ...process.env, PATH: sanitizePath() };
console.log(`[INFO] Operating under package manager: ${pkgManager}`);

for (const script of verifyScripts) {
  console.log(`\nRunning ${script.name} [${script.desc}]...`);
  let serverProcess = null;

  if (script.name === "verify:assets") {
    console.log("[INFO] Starting background Vite preview server for asset checks...");
    // shell: false + absolute binary path prevents S4036 PATH-injection vulnerability.
    serverProcess = spawn(pkgManager, ["run", "preview"], {
      stdio: "ignore",
      env: safeEnv,
      shell: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 3000)); // eslint-disable-line no-await-in-loop
  }

  try {
    const result = spawnSync(pkgManager, ["run", script.name], {
      stdio: "inherit",
      env: safeEnv,
      shell: false,
    });
    if (result.status !== 0) {
      throw new Error(`Command failed with status ${result.status}`);
    }
    console.log(`✓ ${script.name} PASSED.`);
  } catch (err) {
    // Consume the error — message is always logged so the catch is never empty (S2486).
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ ${script.name} FAILED: ${message}`);

    if (DOWNSTREAM_GATES.has(script.name)) {
      console.log(`[INFO] Honest failure allowed on downstream unimplemented gate "${script.name}".`);
    } else {
      console.log(`[CRITICAL] Required gate "${script.name}" failed.`);
      failed = true;
    }
  } finally {
    if (serverProcess) {
      console.log("[INFO] Stopping background Vite preview server...");
      serverProcess.kill("SIGTERM");
    }
  }

  if (failed) break;
}

if (failed) {
  console.log("\n❌ Release verification FAILED on one or more gates.");
  process.exit(1);
} else {
  console.log("\n✓ All release verification gates PASSED. Release evidence may be regenerated.");
  process.exit(0);
}
