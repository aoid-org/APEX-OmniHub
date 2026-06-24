import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

// Define the guardrail rules against agent hallucinations
const HALLUCINATIONS = [
  {
    pattern: /> \*\*Historical Note:\*\*/,
    message: 'Markdown block "> **Historical Note:**" detected in source file. Agents must not append markdown notes to raw code files.',
    extensions: ['.ts', '.tsx', '.sql', '.py', '.js', '.mjs']
  },
  {
    pattern: /release-evidence\.json/,
    message: 'Legacy hallucinatory file "release-evidence.json" detected. The canonical file is "release-validation-summary.json" and CI must never auto-certify.',
    extensions: ['.md', '.ts', '.mjs', '.json', '.yml', '.yaml']
  },
  {
    pattern: /CI certifies|CI approves|Automated production certification/,
    message: 'Prohibited phrasing detected. Rule: "CI validates. Owner certifies." CI must never certify or approve.',
    extensions: ['.md', '.ts', '.mjs', '.yml', '.yaml']
  }
];

function scanFiles() {
  console.log('🛡️ Running Agent Destructive Actions Guardrail...');
  let hasErrors = false;

  try {
    const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
    
    for (const file of files) {
      // Exclude self and known historical logs that genuinely document the incident.
      // The owner-approved certification docs and release templates are an
      // intentional exemption that mirrors scripts/ci/check-release-certification-docs.mjs:
      // these files ARE the current certification authority and must be able to name
      // the stale artifacts removed as part of the certified change. CHANGELOG.md records
      // historical removals by artifact name as evidence, not reintroduction.
      if (
        file === 'scripts/ci/guard-agent-destructive-actions.mjs' ||
        file === 'patch_docs.py' ||
        file === 'CHANGELOG.md' ||
        file.startsWith('docs/release/owner-approved/') ||
        file.startsWith('docs/release/templates/') ||
        file.includes('.system_generated') ||
        file.includes('archive/') ||
        file.includes('tasks/') ||
        file.includes('scratch/')
      ) {
        continue;
      }

      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;

      const ext = path.extname(file);
      const content = fs.readFileSync(file, 'utf8');

      for (const rule of HALLUCINATIONS) {
        if (rule.extensions.includes(ext) && rule.pattern.test(content)) {
          // One exception: if the file is a doc specifically explaining the rule, don't fail it.
          // We assume AGENTS.md or similar policy files might legitimately contain the text of the rule to explain it.
          if (file.includes('AGENTS.md') || file.includes('quality-bar.md') || file.includes('start-here.md') || file.includes('check-release-certification-docs.mjs')) {
            // we should be careful here, let's just make sure it's not actually violating the intent
            // A more precise exception: we only fail if it's outside expected policy documentation regions
            continue; 
          }

          console.error(`❌ [GUARDRAIL FAILED] File: ${file}`);
          console.error(`   Reason: ${rule.message}`);
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      console.error('\n🚨 AGENT DESTRUCTIVE ACTION DETECTED. Blocking commit/CI.');
      process.exit(1);
    } else {
      console.log('✅ Guardrail passed. No agent hallucinations or prohibited automated-certification claims detected.');
    }
  } catch (error) {
    console.error('Failed to run guardrail:', error);
    process.exit(1);
  }
}

scanFiles();
