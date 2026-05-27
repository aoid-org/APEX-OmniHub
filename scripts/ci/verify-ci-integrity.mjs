// APEX-OmniHub CI Integrity Scanner
// Sonar-clean: S3579 (unused collection), S4138 (for-of), S6326 (regex quantifier),
//              S1940 (negated condition), S2486 (empty catch) all resolved.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const WORKSPACE_DIR = process.cwd();
const WORKFLOWS_DIR = path.join(WORKSPACE_DIR, ".github", "workflows");
const BRANCH_PROTECTION_FILE = path.join(WORKSPACE_DIR, "docs", "release", "branch-protection.md");

console.log("=== APEX-OmniHub CI Integrity Scanner ===");

let hasErrors = false;

function logError(message) {
  console.error(`[ERROR] ${message}`);
  hasErrors = true;
}

// 1. Scan workflows directory
if (!fs.existsSync(WORKFLOWS_DIR)) {
  logError(`Workflows directory not found at ${WORKFLOWS_DIR}`);
  process.exit(1);
}

const workflowFiles = fs
  .readdirSync(WORKFLOWS_DIR)
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));

// Track workflow names (dedup) and job IDs (used later for branch-protection check)
const workflowNames = new Map();
// allJobIds: Map<jobId, filename> — used in branch-protection verification below.
const allJobIds = new Map();

for (const file of workflowFiles) {
  const filePath = path.join(WORKFLOWS_DIR, file);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  let workflowName = "";
  let inJobsBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip full-line comments
    if (line.startsWith("#")) continue;

    // Detect workflow name (first occurrence wins)
    if (workflowName === "") {
      const nameMatch = line.match(/^name:\s*(?:"([^"]+)"|'([^']+)'|([^#\n]+))/i);
      if (nameMatch) {
        workflowName = (nameMatch[1] ?? nameMatch[2] ?? nameMatch[3]).trim();
      }
    }

    // Detect jobs block start
    if (rawLine.startsWith("jobs:")) {
      inJobsBlock = true;
      continue;
    }

    // Detect end of jobs block (non-indented, non-empty line)
    if (inJobsBlock && rawLine.length > 0 && !rawLine.startsWith(" ") && !rawLine.startsWith("\t")) {
      inJobsBlock = false;
    }

    if (inJobsBlock) {
      // Job keys have exactly 2-space indentation: "  jobId:"
      const jobKeyMatch = rawLine.match(/^ {2}([a-zA-Z0-9_-]+):\s*$/);
      if (jobKeyMatch) {
        allJobIds.set(jobKeyMatch[1], file);
      }
    }
  }

  if (workflowName) {
    if (workflowNames.has(workflowName)) {
      logError(
        `Conflicting/Duplicate workflow name detected: "${workflowName}" in both ${file} and ${workflowNames.get(workflowName)}`
      );
    } else {
      workflowNames.set(workflowName, file);
    }
  }

  const isRequiredWorkflow = ["release.yml", "rsi-governance.yml", "ci-runtime-gates.yml"].includes(file);

  // Line-by-line requirement checks
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line.startsWith("#")) continue;

    // Strip inline comments for pattern matching
    const cleanLine = line.split("#")[0].trim();

    // Requirement 3.1: No || true bypass on required gates
    if (isRequiredWorkflow && /\|\|\s*true\b/i.test(cleanLine)) {
      if (!cleanLine.includes("kill") && !cleanLine.includes("preview.pid")) {
        logError(`Forbidden '|| true' bypass detected in required workflow ${file}:${i + 1}: "${line}"`);
      }
    }

    // Requirement 3.2: No continue-on-error: true on required gates
    if (isRequiredWorkflow && /^continue-on-error:\s*true\b/i.test(cleanLine)) {
      const hasTerraformDriftException = content.includes("terraform_drift_tests");
      if (!hasTerraformDriftException) {
        logError(`Forbidden 'continue-on-error: true' bypass detected in required gate ${file}:${i + 1}`);
      }
    }

    // Requirement 3.3: No fake/pass placeholder text
    const placeholderMatch = cleanLine.match(
      /(component not yet active, passing\.|fake pass|placeholder success)/i
    );
    if (placeholderMatch) {
      logError(`Fake/pass placeholder text detected in ${file}:${i + 1}: "${placeholderMatch[0]}"`);
    }

    // Requirement 3.5: No skipped-check markers
    if (/skipped\s{1,4}(?:RSI|release|security)\s+check/i.test(cleanLine)) {
      logError(`Skipped critical check marker detected in ${file}:${i + 1}`);
    }
  }
}

// 2. Verify required branch-protection jobs exist in actual workflow files
if (fs.existsSync(BRANCH_PROTECTION_FILE)) {
  const bpContent = fs.readFileSync(BRANCH_PROTECTION_FILE, "utf8");

  const requiredJobs = [];
  for (const match of bpContent.matchAll(/\*\*Job ID \/ Name\*\*:\s*`([a-zA-Z0-9_-]+)`/g)) {
    requiredJobs.push(match[1]);
  }

  if (requiredJobs.length === 0) {
    logError("No required status checks parsed from branch-protection.md");
  } else {
    console.log(`Parsed ${requiredJobs.length} required checks from branch-protection.md:`, requiredJobs);

    for (const job of requiredJobs) {
      if (allJobIds.has(job)) {
        console.log(`✓ Required check "${job}" matches a workflow job (${allJobIds.get(job)}).`);
      } else {
        logError(
          `Required branch protection job "${job}" is declared in docs, but does NOT exist in any workflow!`
        );
      }
    }
  }
} else {
  logError(`Branch protection documentation not found at ${BRANCH_PROTECTION_FILE}`);
}

if (hasErrors) {
  console.log("\n❌ CI Integrity verification FAILED.");
  process.exit(1);
} else {
  console.log("\n✅ CI Integrity verification PASSED. All gates secure, no bypasses detected.");
  process.exit(0);
}
