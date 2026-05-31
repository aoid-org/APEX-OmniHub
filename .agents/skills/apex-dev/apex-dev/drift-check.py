#!/usr/bin/env python3
"""
drift-check.py - APEX Anti-Drift Verification Script

Detects common drift patterns in LLM-generated code:
- Repeated identical changes
- Expanding scope without user confirmation
- Loop patterns (same error 3+ times)
- File churn without progress

Exit codes:
  0 = No drift detected
  1 = Input error
  2 = Drift detected

License: Proprietary - APEX Business Systems Ltd. Edmonton, AB, Canada.
"""

import sys
import argparse
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Optional
from collections import Counter

def hash_content(content: str) -> str:
    """Generate short hash of content for comparison."""
    return hashlib.sha256(content.encode()).hexdigest()[:12]


def check_repeated_changes(history: list[dict]) -> Optional[str]:
    """Detect if same change was made multiple times."""
    change_hashes = [h.get('change_hash') for h in history if h.get('change_hash')]
    
    counts = Counter(change_hashes)
    repeated = [(h, c) for h, c in counts.items() if c >= 3]
    
    if repeated:
        return f"Same change made {repeated[0][1]}x (hash: {repeated[0][0]})"
    return None


def check_scope_expansion(history: list[dict]) -> Optional[str]:
    """Detect if task scope expanded without confirmation."""
    if len(history) < 2:
        return None
    
    initial_files = set(history[0].get('files_touched', []))
    final_files = set(history[-1].get('files_touched', []))
    
    new_files = final_files - initial_files
    if len(new_files) > 5:
        return f"Scope expanded: {len(new_files)} new files added ({', '.join(list(new_files)[:3])}...)"
    
    return None


def check_error_loops(history: list[dict]) -> Optional[str]:
    """Detect if same error appeared 3+ times."""
    errors = [h.get('error') for h in history if h.get('error')]
    
    error_hashes = [hash_content(e) for e in errors]
    counts = Counter(error_hashes)
    
    repeated = [(h, c) for h, c in counts.items() if c >= 3]
    
    if repeated:
        # Find the actual error message
        for h in history:
            if h.get('error') and hash_content(h['error'])[:12] == repeated[0][0]:
                error_preview = h['error'][:100]
                return f"Same error 3x: '{error_preview}...'"
    
    return None


def check_file_churn(history: list[dict]) -> Optional[str]:
    """Detect files touched 5+ times without apparent progress."""
    file_touches = []
    for h in history:
        file_touches.extend(h.get('files_touched', []))
    
    counts = Counter(file_touches)
    churned = [(f, c) for f, c in counts.items() if c >= 5]
    
    if churned:
        return f"File churn: {churned[0][0]} touched {churned[0][1]}x"
    
    return None


def main():
    parser = argparse.ArgumentParser(
        description='APEX Anti-Drift Verification',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python drift-check.py --history session.json
  python drift-check.py --history session.json --strict
        '''
    )
    parser.add_argument(
        '--history', 
        type=Path, 
        required=True,
        help='Path to session history JSON file'
    )
    parser.add_argument(
        '--strict',
        action='store_true',
        help='Treat warnings as errors'
    )
    
    args = parser.parse_args()
    
    # Validate input
    if not args.history.exists():
        print(f"❌ Not found: {args.history}", file=sys.stderr)
        sys.exit(1)
    
    try:
        with open(args.history) as f:
            history = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)
    
    if not isinstance(history, list):
        print("❌ History must be a JSON array", file=sys.stderr)
        sys.exit(1)
    
    print("═══════════════════════════════════════════════════════════")
    print("  APEX Anti-Drift Check")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("═══════════════════════════════════════════════════════════")
    print(f"  History entries: {len(history)}")
    print()
    
    # Run checks
    checks = [
        ("Repeated changes", check_repeated_changes),
        ("Scope expansion", check_scope_expansion),
        ("Error loops", check_error_loops),
        ("File churn", check_file_churn),
    ]
    
    issues = []
    
    for name, check_fn in checks:
        result = check_fn(history)
        if result:
            print(f"  ⚠️  {name}: {result}")
            issues.append((name, result))
        else:
            print(f"  ✓  {name}: OK")
    
    print()
    print("═══════════════════════════════════════════════════════════")
    
    if issues:
        print(f"  ⚠️  {len(issues)} drift pattern(s) detected")
        if args.strict:
            print("  ❌ FAIL (strict mode)")
            sys.exit(2)
        else:
            print("  ⚠️  WARNING (use --strict to fail)")
            sys.exit(0)
    else:
        print("  ✅ No drift detected")
        sys.exit(0)


if __name__ == "__main__":
    main()
