import os
import subprocess

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

IGNORED_FILES = {
    'package-lock.json',
    'bun.lock',
    'bun.lockb',
    'check-release-certification-docs.mjs',
    'PRODUCTION_CERTIFICATION_STATUS_2026_06_21_RETIRED.md',
    'MANUAL_PRODUCTION_CERTIFICATION_TEMPLATE.md',
    'write-release-validation-summary.test.mjs'
}

def _apply_active_doc_replacements(content: str, filepath: str) -> str:
    """Applies necessary string replacements for active documentation."""
    replacements = {
        'PRODUCTION_CERTIFICATION_STATUS.md': 'release-validation-summary.json',
        'NOT_CERTIFIED_NO_RELEASE_CUT': 'NOT_VALIDATED_NO_RELEASE_CUT',
        'release-evidence.json': 'release-validation-summary.json',
        'final_verdict': 'validation_result',
        'Clean-Room Final Certification': 'Release Validation',
        'canonical source for current certification state': 'canonical source for current validation state',
        'write-release-evidence': 'write-release-validation-summary',
        'CERTIFICATION_PENDING': 'VALIDATION_PENDING',
        'CERTIFIED': 'VALIDATED'
    }
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    policy_statement = "> CI validates release readiness. Production certification is manual and owner-approved only."
    if policy_statement not in content and 'memory/omni-recall/' in filepath:
        content = content.replace('# ', f"{policy_statement}\n\n# ", 1)
        if not content.startswith('> CI validates'):
            content = f"{policy_statement}\n\n" + content
            
    return content

def _apply_historical_note(content: str) -> str:
    """Prepends historical notes to legacy documents."""
    note = "> **Historical Note:** This document contains legacy certification terminology. It has been superseded by the manual owner-approval process. CI now produces factual validation summaries only. CI validates. Owner certifies.\n\n"
    if "Historical Note:" in content:
        return content
        
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            parts[2] = '\n' + note + parts[2].lstrip()
            return '---'.join(parts)
            
    return note + content

def process_file(filepath):
    if not os.path.isfile(filepath):
        return
        
    with open(filepath, encoding='utf-8', errors='ignore') as f:
        content = f.read()

    has_banned = any(b in content for b in BANNED_PHRASES) or 'CERTIFIED' in content
    if not has_banned:
        return

    normalized_path = filepath.replace('\\', '/')
    is_active = (
        any(normalized_path.endswith(doc) for doc in ACTIVE_DOCS) or 
        'package.json' in normalized_path or 
        'scripts/ci/' in normalized_path
    )

    if is_active:
        print(f"Aligning active doc: {filepath}")
        content = _apply_active_doc_replacements(content, filepath)
    else:
        print(f"Adding historical note to: {filepath}")
        content = _apply_historical_note(content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def scan_all():
    try:
        git_cmd = 'git'
        if os.name == 'nt':
            git_cmd = 'git.exe'
            
        files = subprocess.check_output([git_cmd, 'ls-files'], text=True).splitlines()
        for file in files:
            if file in IGNORED_FILES:
                continue
            process_file(file)
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    scan_all()
    print("Done")
