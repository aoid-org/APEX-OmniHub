#!/usr/bin/env python3
"""
APEX-Memory(TM) Session Persistence Generator
(C) 2025 APEX Business Systems Ltd. All Rights Reserved.
Proprietary and Confidential. Unauthorized use prohibited.

Generates structured session memory dumps for cross-session persistence.
Exit codes: 0=success, 1=input error, 2=system error
"""

import sys
import re
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime

APEX_HEADER = "APEX-Memory Persist v2.0.0 | (C) 2025 APEX Business Systems Ltd."


def extract_entities(text: str) -> dict:
    """Extract all named entities from text."""
    entities = {
        "people": list(
            set(re.findall(r"\b(?:Mr\.|Mrs\.|Dr\.|Prof\.)\s+[A-Z][a-z]+", text))
        ),
        "files": list(set(re.findall(r'(?:[A-Za-z]:\\|/|\.\/)[^\s\'"]+\.\w+', text))),
        "urls": list(set(re.findall(r'https?://[^\s\'"]+', text))),
        "apis": list(
            set(re.findall(r"\b(?:GET|POST|PUT|DELETE|PATCH)\s+/[^\s]+", text))
        ),
        "technologies": [],
        "commands": list(
            set(re.findall(r"(?:npm|pip|docker|git|python|node)\s+\S+", text))
        ),
    }

    # Technology detection
    tech_patterns = [
        "Python",
        "JavaScript",
        "TypeScript",
        "React",
        "Vue",
        "Angular",
        "Node.js",
        "Docker",
        "Kubernetes",
        "AWS",
        "Azure",
        "GCP",
        "PostgreSQL",
        "MongoDB",
        "Redis",
        "Supabase",
        "Firebase",
        "Terraform",
        "Jenkins",
        "GitHub Actions",
        "Tailwind",
        "Next.js",
        "FastAPI",
        "Django",
        "Flask",
        "Express",
        "Vite",
        "Webpack",
    ]
    for tech in tech_patterns:
        if tech.lower() in text.lower():
            entities["technologies"].append(tech)

    # Remove empties
    return {k: v for k, v in entities.items() if v}


def extract_decisions(text: str) -> list:
    """Extract decision-like statements."""
    decisions = []
    decision_markers = [
        r"(?:decided|chosen|selected|opted|agreed|confirmed|approved)\s+(?:to\s+)?(.{10,100})",
        r"(?:we(?:'ll| will| should| must))\s+(.{10,100})",
        r"(?:the plan is|going forward|the approach is)\s+(.{10,100})",
    ]
    for pattern in decision_markers:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            clean = m.strip().rstrip(".")
            if clean and clean not in decisions:
                decisions.append(clean)
    return decisions[:10]


def extract_action_items(text: str) -> list:
    """Extract pending action items / TODOs."""
    actions = []
    action_markers = [
        r"(?:TODO|FIXME|HACK|NOTE):\s*(.{10,150})",
        r"(?:need to|needs to|should|must)\s+(.{10,100})",
        r"\[\s*\]\s+(.{5,100})",  # Unchecked checkboxes
    ]
    for pattern in action_markers:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            clean = m.strip().rstrip(".")
            if clean and clean not in actions:
                actions.append(clean)
    return actions[:15]


def generate_narrative(text: str) -> str:
    """Generate a 3-sentence narrative summary using extractive method."""
    sentences = [s.strip() for s in re.split(r"[.!?\n]+", text) if len(s.strip()) > 20]
    if not sentences:
        return "No narrative could be extracted."

    # Score sentences by entity density
    scored = []
    for sent in sentences:
        score = 0
        score += len(re.findall(r"\b[A-Z][a-z]+\b", sent)) * 2  # Proper nouns
        score += len(re.findall(r"`[^`]+`", sent)) * 3  # Code refs
        score += (
            len(
                re.findall(
                    r"\b(?:error|fix|implement|deploy|create|update|resolve)\b",
                    sent,
                    re.I,
                )
            )
            * 2
        )
        scored.append((score, sent))

    scored.sort(reverse=True)
    top = scored[:3]
    top.sort(key=lambda x: text.find(x[1]))  # Restore chronological order

    return ". ".join([t[1] for t in top]) + "."


def generate_memory_dump(text: str, session_id: str = None) -> str:
    """Generate a full APEX-Memory(TM) session dump."""
    if not session_id:
        session_id = hashlib.sha256(text.encode()).hexdigest()[:12]

    entities = extract_entities(text)
    decisions = extract_decisions(text)
    actions = extract_action_items(text)
    narrative = generate_narrative(text)
    context_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    dump = f"""# APEX-MEMORY(TM) SESSION DUMP [{timestamp}]
# (C) 2025 APEX Business Systems Ltd. -- Proprietary Format

**Session ID**: {session_id}
**Generated**: {timestamp}
**Source Tokens**: ~{int(len(text.split()) * 1.3)}

---

## Narrative
{narrative}

---

## Critical Entities
"""

    for category, items in entities.items():
        dump += f"\n### {category.replace('_', ' ').title()}\n"
        for item in items:
            dump += f"- `{item}`\n"

    dump += "\n---\n\n## Decisions Made\n"
    if decisions:
        for i, d in enumerate(decisions, 1):
            dump += f"{i}. {d}\n"
    else:
        dump += "- No explicit decisions detected.\n"

    dump += "\n---\n\n## Pending Actions\n"
    if actions:
        for action in actions:
            dump += f"- [ ] {action}\n"
    else:
        dump += "- No pending actions detected.\n"

    dump += f"""
---

## Integrity
- **Context Hash**: `{context_hash}`
- **Format**: APEX-Memory(TM) Proprietary Session Dump v2.0
- **Restore Command**: Paste this dump into next session with "Restore APEX-Memory context"

---
*APEX-Memory(TM) v2.0.0 -- Patent Pending*
"""

    return dump


def main():
    parser = argparse.ArgumentParser(
        description=f"{APEX_HEADER}\nGenerate structured session memory dumps.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", type=Path, help="Conversation/context file to persist")
    parser.add_argument("--output", "-o", type=Path, help="Output file for memory dump")
    parser.add_argument("--session-id", type=str, help="Custom session ID")
    parser.add_argument("--json", "-j", action="store_true", help="Output as JSON")
    parser.add_argument("--version", "-v", action="version", version=APEX_HEADER)
    args = parser.parse_args()

    if not args.input.exists():
        print(f"[NO] File not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    text = args.input.read_text(encoding="utf-8")
    dump = generate_memory_dump(text, args.session_id)

    if args.json:
        report = {
            "tool": APEX_HEADER,
            "timestamp": datetime.now().isoformat(),
            "entities": extract_entities(text),
            "decisions": extract_decisions(text),
            "actions": extract_action_items(text),
            "narrative": generate_narrative(text),
        }
        print(json.dumps(report, indent=2))
    elif args.output:
        args.output.write_text(dump, encoding="utf-8")
        print(f"[OK] Memory dump -> {args.output}", file=sys.stderr)
    else:
        print(dump)


if __name__ == "__main__":
    main()
