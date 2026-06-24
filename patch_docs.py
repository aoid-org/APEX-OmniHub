import os
import re

ACTIVE_DOCS = [
    'README.md',
    'CHANGELOG.md',
    'memory/omni-recall/docs/README.md',
    'memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md',
    'memory/omni-recall/state/checkpoints/current-status.md',
    'memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_14.md',
    'memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_20.md',
    'memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_21.md',
    'memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_22.md',
    'memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_23.md',
    'memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_24.md',
    'memory/omni-recall/docs/ops/OPS_RUNBOOK.md',
    'memory/omni-recall/docs/ops/OPEN_PR_GOVERNANCE_2026-05-13.md',
    'memory/omni-recall/docs/project-status/CI_STATUS_POLICY.md',
    'memory/omni-recall/docs/release/branch-protection.md',
    'memory/omni-recall/docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md',
    'memory/omni-recall/docs/release/claim-approved-production-release.md',
    'memory/omni-recall/docs/architecture/DOC_RECONCILIATION_MATRIX.md',
    'memory/omni-recall/docs/infrastructure/DEMO_MODE.md',
    'memory/omni-recall/start-here.md',
    'memory/omni-recall/release-remediation-claim-ci-followup-2026-06-16.md'
]

BANNED_PHRASES = [
  'PRODUCTION_CERTIFICATION_STATUS.md',
  'NOT_CERTIFIED_NO_RELEASE_CUT',
  'release-evidence.json',
  'final_verdict',
  'Clean-Room Final Certification',
  'canonical source for current certification state',
  'write-release-evidence'
]

def process_file(filepath):
    if not os.path.isfile(filepath): return
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    has_banned = any(b in content for b in BANNED_PHRASES) or 'CERTIFIED' in content
    if not has_banned: return

    is_active = any(filepath.replace('\\', '/').endswith(doc) for doc in ACTIVE_DOCS) or 'package.json' in filepath or 'scripts/ci/' in filepath

    if is_active:
        print(f"Aligning active doc: {filepath}")
        content = content.replace('PRODUCTION_CERTIFICATION_STATUS.md', 'release-validation-summary.json')
        content = content.replace('NOT_CERTIFIED_NO_RELEASE_CUT', 'NOT_VALIDATED_NO_RELEASE_CUT')
        content = content.replace('release-evidence.json', 'release-validation-summary.json')
        content = content.replace('final_verdict', 'validation_result')
        content = content.replace('Clean-Room Final Certification', 'Release Validation')
        content = content.replace('canonical source for current certification state', 'canonical source for current validation state')
        content = content.replace('write-release-evidence', 'write-release-validation-summary')
        content = content.replace('CERTIFICATION_PENDING', 'VALIDATION_PENDING')
        content = content.replace('CERTIFIED', 'VALIDATED')
        
        # Add policy statement if not there
        policy_statement = "> CI validates release readiness. Production certification is manual and owner-approved only."
        if policy_statement not in content and 'memory/omni-recall/' in filepath:
            content = content.replace('# ', f"{policy_statement}\n\n# ", 1)
            if not content.startswith('> CI validates'):
                content = f"{policy_statement}\n\n" + content
    else:
        print(f"Adding historical note to: {filepath}")
        note = "> **Historical Note:** This document contains legacy certification terminology. It has been superseded by the manual owner-approval process. CI now produces factual validation summaries only. CI validates. Owner certifies.\n\n"
        if "Historical Note:" not in content:
            if content.startswith('---'):
                parts = content.split('---', 2)
                if len(parts) >= 3:
                    parts[2] = '\n' + note + parts[2].lstrip()
                    content = '---'.join(parts)
            else:
                content = note + content

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

import subprocess

def scan_all():
    try:
        files = subprocess.check_output(['git', 'ls-files'], text=True).splitlines()
        for file in files:
            if file in ['package-lock.json', 'bun.lock', 'bun.lockb', 'check-release-certification-docs.mjs']: continue
            if file == 'PRODUCTION_CERTIFICATION_STATUS_2026_06_21_RETIRED.md': continue
            if file == 'MANUAL_PRODUCTION_CERTIFICATION_TEMPLATE.md': continue
            if file == 'write-release-validation-summary.test.mjs': continue
            process_file(file)
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    scan_all()
    print("Done")
