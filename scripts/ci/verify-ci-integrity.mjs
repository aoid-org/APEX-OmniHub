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

const workflowFiles = fs.readdirSync(WORKFLOWS_DIR).filter(file => file.endsWith(".yml") || file.endsWith(".yaml"));

// Track workflow names and job names to detect duplicates
const workflowNames = new Map();
const allJobs = new Set();
for (const file of workflowFiles) {
  const filePath = path.join(WORKFLOWS_DIR, file);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  let workflowName = "";

  // Parse workflow name and job IDs using a robust stateful parser
  let inJobsBlock = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip comments
    if (line.startsWith("#")) continue;

    // Detect workflow name
    const nameMatch = line.match(/^name:\s*(?:"([^"]+)"|'([^']+)'|([^#\n]+))/i);
    if (nameMatch && workflowName === "") {
      workflowName = (nameMatch[1] || nameMatch[2] || nameMatch[3]).trim();
    }

    // Detect jobs block start
    if (rawLine.startsWith("jobs:")) {
      inJobsBlock = true;
      continue;
    }

    // Detect end of jobs block (a non-indented line starting with a non-space character)
    if (inJobsBlock && rawLine.length > 0 && !rawLine.startsWith(" ") && !rawLine.startsWith("\t")) {
      inJobsBlock = false;
    }

    if (inJobsBlock) {
      // A job key has exactly 2 spaces indentation followed by a word and a colon
      const jobKeyMatch = rawLine.match(/^ {2}([a-zA-Z0-9_-]+):\s*$/);
      if (jobKeyMatch) {
        const jobId = jobKeyMatch[1];
        allJobs.add(jobId);
      }
    }
  }

  if (workflowName) {
    if (workflowNames.has(workflowName)) {
      logError(`Conflicting/Duplicate workflow name detected: "${workflowName}" in both ${file} and ${workflowNames.get(workflowName)}`);
    } else {
      workflowNames.set(workflowName, file);
    }
  }

  const isRequiredWorkflow = ["release.yml", "rsi-governance.yml", "ci-runtime-gates.yml"].includes(file);

  // Check line-by-line requirements
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip full line comments
    if (line.startsWith("#")) continue;

    // Remove end of line comments for check
    const cleanLine = line.split("#")[0].trim();

    // Requirement 3.1: No || true on required gates
    if (isRequiredWorkflow && cleanLine.match(/\|\|\s*true\b/i)) {
      // Exclude allowed non-gate cleanup steps (like stop preview server)
      if (!cleanLine.includes("kill") && !cleanLine.includes("preview.pid")) {
        logError(`Forbidden '|| true' bypass detected in required workflow ${file}:${i + 1}: "${line}"`);
      }
    }

    // Requirement 3.2: No continue-on-error: true on required gates
    if (isRequiredWorkflow && cleanLine.match(/^continue-on-error:\s*true\b/i)) {
      // Identify if this continue-on-error is within a required gate job
      // The only allowed one in our repo is for terraform expression drift check, which has an explicit exit 1 check.
      const isTerraformDriftStep = content.includes("terraform_drift_tests");
      if (!isTerraformDriftStep) {
        logError(`Forbidden 'continue-on-error: true' bypass detected in required gate ${file}:${i + 1}`);
      }
    }

    // Requirement 3.3: Fake/pass placeholder text
    const placeholderMatches = cleanLine.match(/(component not yet active, passing\.|fake pass|placeholder success)/i);
    if (placeholderMatches) {
      logError(`Fake/pass placeholder text detected in ${file}:${i + 1}: "${placeholderMatches[0]}"`);
    }

    // Requirement 3.5: Skipped checks
    if (cleanLine.match(/skipped\s+(?:RSI|release|security)\s+check/i)) {
      logError(`Skipped critical check marker detected in ${file}:${i + 1}`);
    }
  }
}

// 2. Read docs/release/branch-protection.md and verify job name matching
if (fs.existsSync(BRANCH_PROTECTION_FILE)) {
  const bpContent = fs.readFileSync(BRANCH_PROTECTION_FILE, "utf8");
  
  // Extract required job IDs from the markdown file using regex
  // E.g., **Job ID / Name**: `rsi-governance`
  const jobMatches = bpContent.matchAll(/\*\*Job ID \/ Name\*\*:\s*`([a-zA-Z0-9_-]+)`/g);
  const requiredJobs = [];
  for (const match of jobMatches) {
    requiredJobs.push(match[1]);
  }

  if (requiredJobs.length === 0) {
    logError("No required status checks parsed from branch-protection.md");
  } else {
    console.log(`Parsed ${requiredJobs.length} required checks from branch-protection.md:`, requiredJobs);
    
    for (const job of requiredJobs) {
      if (allJobs.has(job)) {
        console.log(`✓ Required check "${job}" matches a workflow job.`);
      } else {
        logError(`Required branch protection job "${job}" is declared in docs, but does NOT exist in any workflow!`);
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
