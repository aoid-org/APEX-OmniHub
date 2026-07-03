import fs from "node:fs";
import path from "node:path";

const changelogPath = process.argv[2] ?? "CHANGELOG.md";
const md = fs.readFileSync(changelogPath, "utf8");

// Lines that record an intentional removal reference paths that correctly no
// longer exist — never flag tokens from those lines.
const DELETION_MARKERS = ["permanently deleted", "— removed", "— deprecated and removed"];

// capture backticked tokens, line by line, skipping deletion-record lines
const tokens = md
  .split(/\r?\n/)
  .filter(line => !DELETION_MARKERS.some(marker => line.includes(marker)))
  .flatMap(line => [...line.matchAll(/`([^`]+)`/g)].map(m => m[1]));

// treat only repo-like paths as enforceable
const paths = tokens.filter(p =>
  (p.includes("/") || p.includes("\\")) &&
  !p.includes("http") &&
  !p.includes("<") &&
  !p.includes(">") &&
  !p.includes(" --")
);

const missing = [];
for (const p of paths) {
  const normalized = p.replaceAll("\\", "/");
  const full = path.resolve(process.cwd(), normalized);
  if (!fs.existsSync(full)) missing.push(normalized);
}

if (missing.length) {
  for (const m of missing) {
    console.warn(`::warning file=CHANGELOG.md::Missing path referenced in changelog: ${m}`);
  }
  process.exit(0);
}

console.log("OK: CHANGELOG path references exist.");
