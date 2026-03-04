import fs from "node:fs";
import path from "node:path";

const changelogPath = process.argv[2] ?? "CHANGELOG.md";
const md = fs.readFileSync(changelogPath, "utf8");

// capture backticked tokens
const tokens = [...md.matchAll(/`([^`]+)`/g)].map(m => m[1]);

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
  console.error("\nCHANGELOG references missing repo paths:\n");
  for (const m of missing) console.error(" - " + m);
  console.error("\nFix: add the files or remove the references.\n");
  process.exit(1);
}

console.log("OK: CHANGELOG path references exist.");
