"""Rubric checks and scoring for apex-skill-forge.

Stdlib only — no imports from forge.py (avoids circular dependency).
Constants are intentionally duplicated from forge.py; they must stay in sync.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

# Constants (must match forge.py)
DESC_BUDGET = 500
SKILL_LINE_BUDGET = 200
BODY_TOKEN_TARGET = 2500
REF_TOC_THRESHOLD = 100
MIN_TRIGGER_POS = 8
MIN_TRIGGER_NEG = 8
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MULTIPLIER_RE = re.compile(r"\b(?!0x)\d+(?:\.\d+)?x\b", re.IGNORECASE)
HYPE_LEXICON = [
    "omnipotent", "omniscient", "god-mode", "god mode", "godlike",
    "world's best", "worlds best", "world-class", "revolutionary",
    "quantum leap", "ultimate", "magic", "magical", "singularity",
    "first-pass perfection", "zero-failure", "infallible",
]


def _est_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _parse_fm(skill_md: str) -> tuple[dict, str]:
    """Minimal frontmatter parser — returns (fields_dict, body_text)."""
    fm: dict = {}
    body = skill_md
    if skill_md.startswith("---"):
        end = skill_md.find("\n---", 3)
        if end != -1:
            block = skill_md[3:end].strip()
            body = skill_md[end + 4:].strip()
            for line in block.splitlines():
                if ":" in line:
                    k, _, v = line.partition(":")
                    fm[k.strip()] = v.strip().strip('"')
    return fm, body


def rubric_checks(skill_dir: Path) -> list[tuple[str, bool]]:
    """20 binary rubric checks. Each check must be machine-verifiable."""
    sp = skill_dir / "SKILL.md"
    text = sp.read_text(encoding="utf-8") if sp.exists() else ""
    fm, body = _parse_fm(text) if text else ({}, "")
    desc = fm.get("description", "")
    name = fm.get("name", "")
    readme_p = skill_dir / "README.md"
    rtext = readme_p.read_text(encoding="utf-8") if readme_p.exists() else ""
    lic_p = skill_dir / "LICENSE.md"
    ltext = lic_p.read_text(encoding="utf-8") if lic_p.exists() else ""

    def manifest_ok() -> bool:
        p = skill_dir / "MANIFEST.json"
        if not p.exists():
            return False
        try:
            m = json.loads(p.read_text(encoding="utf-8"))
            return bool(m.get("name") == name and m.get("version") and m.get("license"))
        except json.JSONDecodeError:
            return False

    def refs_toc_ok() -> bool:
        rd = skill_dir / "references"
        if not rd.is_dir():
            return True
        for ref in rd.glob("*.md"):
            lines = ref.read_text(encoding="utf-8").splitlines()
            if len(lines) > REF_TOC_THRESHOLD and not any(
                ln.strip().lower().startswith("## contents") for ln in lines[:12]
            ):
                return False
        return True

    def scripts_compile_ok() -> bool:
        sd = skill_dir / "scripts"
        if not sd.is_dir():
            return True
        try:
            for py in sd.glob("*.py"):
                compile(py.read_text(encoding="utf-8"), str(py), "exec")
            return True
        except SyntaxError:
            return False

    def triggers_ok() -> bool:
        ep = skill_dir / "evals" / "trigger-eval.json"
        if not ep.exists():
            return False
        try:
            items = json.loads(ep.read_text(encoding="utf-8"))
            pos = sum(1 for i in items if i.get("should_trigger") is True)
            neg = sum(1 for i in items if i.get("should_trigger") is False)
            return pos >= MIN_TRIGGER_POS and neg >= MIN_TRIGGER_NEG
        except (json.JSONDecodeError, TypeError):
            return False

    def scorecard_ok() -> bool:
        p = skill_dir / "scorecard.json"
        if not p.exists():
            return False
        try:
            c = json.loads(p.read_text(encoding="utf-8"))
            return c.get("lint", {}).get("fails") == 0
        except json.JSONDecodeError:
            return False

    def no_multipliers() -> bool:
        return not (MULTIPLIER_RE.findall(text) or MULTIPLIER_RE.findall(rtext))

    install_block = (
        "## Install" in rtext
        and "```" in rtext.split("## Install", 1)[-1][:600]
    )
    return [
        ("SKILL.md present, frontmatter parses", bool(text) and bool(fm)),
        ("frontmatter is exactly name/description/license",
         set(fm) == {"name", "description", "license"}),
        ("name lowercase-hyphenated ≤64, matches directory",
         bool(NAME_RE.match(name)) and len(name) <= 64 and skill_dir.name == name),
        (f"description ≤{DESC_BUDGET} chars", 0 < len(desc) <= DESC_BUDGET),
        ("description has 'Use when' trigger clause", "use when" in desc.lower()),
        ("description has exclusion clause", "not" in desc.lower()),
        (f"SKILL.md ≤{SKILL_LINE_BUDGET} lines",
         0 < len(text.splitlines()) <= SKILL_LINE_BUDGET),
        (f"body ≤{BODY_TOKEN_TARGET} est. tokens",
         _est_tokens(body) <= BODY_TOKEN_TARGET),
        ("zero hype-lexicon hits in SKILL.md",
         not any(w in text.lower() for w in HYPE_LEXICON)),
        ("zero multiplier claims in SKILL.md + README", no_multipliers()),
        ("LICENSE.md present, names APEX Business Systems",
         "APEX Business Systems" in ltext),
        ("MANIFEST.json valid: name match, version, license", manifest_ok()),
        ("references >100 lines carry '## Contents'", refs_toc_ok()),
        ("all scripts/*.py compile", scripts_compile_ok()),
        ("templates/ has SKILL, README, MANIFEST templates",
         all((skill_dir / "templates" / f).exists()
             for f in ("SKILL.template.md", "README.template.md",
                       "MANIFEST.template.json"))),
        (f"trigger eval ≥{MIN_TRIGGER_POS}+/{MIN_TRIGGER_NEG}- and valid",
         triggers_ok()),
        ("scorecard.json present with lint.fails == 0", scorecard_ok()),
        ("README '## Install' with command block", install_block),
        ("README '## Before / After' section",
         bool(re.search(r"^##\s*Before\s*/\s*After", rtext,
                        re.IGNORECASE | re.MULTILINE))),
        ("README carries APEX attribution footer", "APEX" in rtext),
    ]


def run_rubric(skill_dir: Path) -> int:
    """20 binary checks × 5 points. Every check is machine-verifiable."""
    checks = rubric_checks(skill_dir)
    score = sum(5 for _, ok in checks if ok)
    print(f"RUBRIC {skill_dir.name}: {score}/100")
    for label, ok in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
    return 0 if score == 100 else 1
