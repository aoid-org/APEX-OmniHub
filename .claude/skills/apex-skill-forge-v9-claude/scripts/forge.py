#!/usr/bin/env python3
"""APEX-SKILL-FORGE v9 — single CLI: init | lint | tokens | triggers | score | pack.

Stdlib only. Token figures are ESTIMATES (chars/4) and are labeled as such.
Exit code 0 = pass, 1 = failures present, 2 = usage/IO error.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------- constants
DESC_BUDGET = 500          # APEX budget (spec hard limit below)
DESC_SPEC_MAX = 1024       # open Agent Skills spec limit
SKILL_LINE_BUDGET = 200
BODY_TOKEN_TARGET = 2500   # estimated tokens, warn above
BODY_TOKEN_MAX = 5000      # estimated tokens, fail above
REF_TOC_THRESHOLD = 100    # reference files longer than this need a ## Contents
MIN_TRIGGER_POS = 8
MIN_TRIGGER_NEG = 8
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MULTIPLIER_RE = re.compile(r"\b(?!0x)\d+(?:\.\d+)?x\b", re.IGNORECASE)  # excludes hex literals
HYPE_LEXICON = [
    "omnipotent", "omniscient", "god-mode", "god mode", "godlike",
    "world's best", "worlds best", "world-class", "revolutionary",
    "quantum leap", "ultimate", "magic", "magical", "singularity",
    "first-pass perfection", "zero-failure", "infallible",
]


def est_tokens(text: str) -> int:
    """Estimate token count. Heuristic: len/4. Labeled as estimate everywhere."""
    return max(1, len(text) // 4)


# ---------------------------------------------------------------- findings
class Findings:
    SEV = {"FAIL": 0, "WARN": 1, "INFO": 2}

    def __init__(self) -> None:
        self.items: list[dict] = []

    def add(self, sev: str, check: str, msg: str) -> None:
        self.items.append({"severity": sev, "check": check, "message": msg})

    @property
    def fails(self) -> int:
        return sum(1 for i in self.items if i["severity"] == "FAIL")

    @property
    def warns(self) -> int:
        return sum(1 for i in self.items if i["severity"] == "WARN")

    def render(self) -> str:
        if not self.items:
            return "  (no findings)"
        order = sorted(self.items, key=lambda i: self.SEV[i["severity"]])
        return "\n".join(f"  [{i['severity']}] {i['check']}: {i['message']}" for i in order)


# ---------------------------------------------------------------- frontmatter
def parse_frontmatter(skill_md: str) -> tuple[dict, str, list[str]]:
    """Return (frontmatter dict, body, errors). Expects single-line `key: value` pairs."""
    errors: list[str] = []
    lines = skill_md.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, skill_md, ["SKILL.md does not start with a `---` frontmatter block"]
    fm: dict[str, str] = {}
    end = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end = idx
            break
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", lines[idx])
        if m:
            fm[m.group(1)] = m.group(2).strip().strip('"').strip("'")
        elif lines[idx].strip():
            errors.append(f"frontmatter line {idx + 1} is not a single-line `key: value` pair")
    if end is None:
        errors.append("frontmatter block is never closed with `---`")
        return fm, "", errors
    body = "\n".join(lines[end + 1:])
    return fm, body, errors


# ---------------------------------------------------------------- lint
def lint_skill(skill_dir: Path, strict: bool = False) -> Findings:
    f = Findings()
    skill_md_path = skill_dir / "SKILL.md"
    if not skill_md_path.exists():
        f.add("FAIL", "structure", f"SKILL.md not found in {skill_dir}")
        return f
    text = skill_md_path.read_text(encoding="utf-8")
    fm, body, fm_errors = parse_frontmatter(text)
    for e in fm_errors:
        f.add("FAIL", "frontmatter", e)

    # F1: exactly the 3-key APEX convention
    expected = {"name", "description", "license"}
    keys = set(fm.keys())
    if keys != expected:
        f.add("FAIL", "frontmatter-keys",
              f"expected exactly {sorted(expected)}, found {sorted(keys)}")

    # F2: name format
    name = fm.get("name", "")
    if name and (not NAME_RE.match(name) or len(name) > 64):
        f.add("FAIL", "name-format", f"'{name}' must be lowercase-hyphenated, ≤64 chars")
    if name and skill_dir.name != name:
        f.add("WARN", "name-dir-match", f"directory '{skill_dir.name}' != name '{name}'")

    # F3: description budgets
    desc = fm.get("description", "")
    if len(desc) > DESC_SPEC_MAX:
        f.add("FAIL", "desc-spec-limit", f"{len(desc)} chars > spec max {DESC_SPEC_MAX}")
    elif len(desc) > DESC_BUDGET:
        f.add("FAIL", "desc-budget", f"{len(desc)} chars > APEX budget {DESC_BUDGET}")
    if desc and "use when" not in desc.lower():
        f.add("WARN", "desc-trigger-clause",
              "description lacks a 'Use when…' trigger clause — selection accuracy suffers")
    if desc and "not" not in desc.lower():
        f.add("INFO", "desc-exclusion",
              "no exclusion clause ('Does not cover…') — consider one to curb over-trigger")

    # L1: line budget
    n_lines = len(text.splitlines())
    if n_lines > SKILL_LINE_BUDGET:
        f.add("FAIL", "skill-lines", f"{n_lines} lines > budget {SKILL_LINE_BUDGET}")

    # T1: body token budget (estimated)
    bt = est_tokens(body)
    if bt > BODY_TOKEN_MAX:
        f.add("FAIL", "body-tokens", f"~{bt} est. tokens > max {BODY_TOKEN_MAX}")
    elif bt > BODY_TOKEN_TARGET:
        f.add("WARN", "body-tokens", f"~{bt} est. tokens > target {BODY_TOKEN_TARGET}")

    # H1: hype lexicon (FAIL in SKILL.md incl. frontmatter; WARN in README)
    low = text.lower()
    hits = sorted({w for w in HYPE_LEXICON if w in low})
    if hits:
        f.add("FAIL", "hype-lexicon", f"banned terms in SKILL.md: {hits}")
    readme = skill_dir / "README.md"
    if readme.exists():
        rhits = sorted({w for w in HYPE_LEXICON if w in readme.read_text(encoding="utf-8").lower()})
        if rhits:
            f.add("WARN", "hype-lexicon-readme", f"hype terms in README: {rhits}")

    # H2: numeric multiplier claims require a scorecard
    has_scorecard = (skill_dir / "scorecard.json").exists()
    for label, p in (("SKILL.md", skill_md_path), ("README.md", readme)):
        if p and p.exists():
            mults = MULTIPLIER_RE.findall(p.read_text(encoding="utf-8"))
            if mults and not has_scorecard:
                sev = "FAIL" if label == "SKILL.md" else "WARN"
                f.add(sev, "unbacked-multiplier",
                      f"{label} contains multiplier claims {sorted(set(mults))} with no scorecard.json")

    # R1: reference ToC
    ref_dir = skill_dir / "references"
    if ref_dir.is_dir():
        for ref in sorted(ref_dir.glob("*.md")):
            rlines = ref.read_text(encoding="utf-8").splitlines()
            if len(rlines) > REF_TOC_THRESHOLD and not any(
                l.strip().lower().startswith("## contents") for l in rlines[:12]
            ):
                f.add("WARN", "ref-toc", f"{ref.name} is {len(rlines)} lines, no '## Contents' header")

    # S1: MANIFEST consistency
    manifest = skill_dir / "MANIFEST.json"
    if manifest.exists():
        try:
            m = json.loads(manifest.read_text(encoding="utf-8"))
            if m.get("name") != name:
                f.add("FAIL", "manifest-name", f"MANIFEST name '{m.get('name')}' != '{name}'")
            if not m.get("version"):
                f.add("FAIL", "manifest-version", "MANIFEST.json missing 'version'")
        except json.JSONDecodeError as e:
            f.add("FAIL", "manifest-json", f"MANIFEST.json invalid: {e}")
    else:
        f.add("WARN", "manifest-missing", "MANIFEST.json not found (required to pack)")

    # D1: distribution pack
    if readme.exists():
        rtext = readme.read_text(encoding="utf-8")
        if "## Install" not in rtext or "```" not in rtext.split("## Install", 1)[-1][:600]:
            f.add("WARN", "dist-install", "README lacks an '## Install' section with a command block")
        if not re.search(r"^##\s*Before\s*/\s*After", rtext, re.IGNORECASE | re.MULTILINE):
            f.add("WARN", "dist-before-after", "README lacks a '## Before / After' section")
    else:
        f.add("WARN", "dist-readme", "README.md missing — distribution pack incomplete")

    # E1: trigger eval presence
    if not (skill_dir / "evals" / "trigger-eval.json").exists():
        f.add("WARN", "trigger-eval-missing",
              "evals/trigger-eval.json not found — triggering is unmeasured")

    if strict:
        for i in f.items:
            if i["severity"] == "WARN":
                i["severity"] = "FAIL"
    return f


# ---------------------------------------------------------------- tokens
def token_ledger(skill_dir: Path) -> dict:
    skill_md_path = skill_dir / "SKILL.md"
    if not skill_md_path.exists():
        return {"error": f"SKILL.md not found in {skill_dir}",
                "method": "estimate: characters / 4"}
    skill_md = skill_md_path.read_text(encoding="utf-8")
    fm, body, _ = parse_frontmatter(skill_md)
    meta = f"{fm.get('name', '')} {fm.get('description', '')}"
    refs = {}
    ref_dir = skill_dir / "references"
    if ref_dir.is_dir():
        for ref in sorted(ref_dir.glob("*.md")):
            refs[ref.name] = est_tokens(ref.read_text(encoding="utf-8"))
    return {
        "method": "estimate: characters / 4",
        "metadata_always_loaded": est_tokens(meta),
        "description_chars": len(fm.get("description", "")),
        "skill_md_body_on_trigger": est_tokens(body),
        "skill_md_lines": len(skill_md.splitlines()),
        "references_on_demand": refs,
        "scripts_loaded_tokens": 0,
    }


# ---------------------------------------------------------------- triggers
def validate_triggers(skill_dir: Path) -> tuple[Findings, dict]:
    f = Findings()
    path = skill_dir / "evals" / "trigger-eval.json"
    stats = {"positive": 0, "negative": 0, "total": 0}
    if not path.exists():
        f.add("FAIL", "trigger-eval", f"{path} not found")
        return f, stats
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        f.add("FAIL", "trigger-eval-json", str(e))
        return f, stats
    if not isinstance(data, list):
        f.add("FAIL", "trigger-eval-shape", "top level must be a JSON array")
        return f, stats
    for i, item in enumerate(data):
        if not isinstance(item, dict) or "query" not in item or "should_trigger" not in item:
            f.add("FAIL", "trigger-eval-item", f"item {i} needs 'query' and 'should_trigger'")
            continue
        if len(str(item["query"]).strip()) < 25:
            f.add("WARN", "trigger-eval-realism",
                  f"item {i} query is very short — realistic queries carry context")
        stats["positive" if item["should_trigger"] else "negative"] += 1
    stats["total"] = stats["positive"] + stats["negative"]
    if stats["positive"] < MIN_TRIGGER_POS:
        f.add("FAIL", "trigger-eval-balance",
              f"{stats['positive']} positive < required {MIN_TRIGGER_POS}")
    if stats["negative"] < MIN_TRIGGER_NEG:
        f.add("FAIL", "trigger-eval-balance",
              f"{stats['negative']} negative < required {MIN_TRIGGER_NEG}")
    return f, stats


# ---------------------------------------------------------------- score / pack
def write_scorecard(skill_dir: Path) -> Path:
    lint = lint_skill(skill_dir)
    trig_f, trig_stats = validate_triggers(skill_dir)
    card = {
        "skill": skill_dir.name,
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tooling": "apex-skill-forge v9 forge.py",
        "lint": {"fails": lint.fails, "warns": lint.warns,
                 "findings": lint.items},
        "tokens": token_ledger(skill_dir),
        "trigger_eval": {"validated": trig_f.fails == 0, **trig_stats},
        "trigger_accuracy_live": None,
        "note": (
            "Token values are estimates (chars/4). "
            "trigger_accuracy_live: run the 18-query eval set in a live Claude Code session "
            "and record the measured rate here (e.g. 17/18 = 0.944) to complete the evidence chain."
        ),
    }
    out = skill_dir / "scorecard.json"
    # Write first so scorecard_ok() passes inside _rubric_checks()
    out.write_text(json.dumps(card, indent=2), encoding="utf-8")
    card["rubric_score"] = sum(5 for _, ok in _rubric_checks(skill_dir) if ok)
    out.write_text(json.dumps(card, indent=2), encoding="utf-8")
    return out

def pack_skill(skill_dir: Path, label: str = "") -> int:
    lint = lint_skill(skill_dir, strict=True)
    if lint.fails:
        print("PACK BLOCKED — strict lint failures:")
        print(lint.render())
        return 1
    manifest = json.loads((skill_dir / "MANIFEST.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    dist = skill_dir / "dist"
    dist.mkdir(exist_ok=True)
    suffix = f"-{label}" if label else ""
    out = dist / f"{skill_dir.name}-{version}{suffix}.skill"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(skill_dir.rglob("*")):
            if p.is_file() and "dist" not in p.parts and not p.name.startswith("."):
                z.write(p, p.relative_to(skill_dir.parent))
    sha = hashlib.sha256(out.read_bytes()).hexdigest()
    (dist / f"{out.name}.sha256").write_text(f"{sha}  {out.name}\n", encoding="utf-8")
    print(f"PACKED {out}\nSHA256 {sha}")
    return 0


# ---------------------------------------------------------------- rubric
def _rubric_checks(skill_dir: Path) -> list[tuple[str, bool]]:
    """Return the 20 binary rubric checks. Called by run_rubric (print) and
    write_scorecard (persist). Requires scorecard.json to already exist so the
    scorecard_ok() gate can evaluate correctly."""
    sp = skill_dir / "SKILL.md"
    text = sp.read_text(encoding="utf-8") if sp.exists() else ""
    fm, body, fm_err = parse_frontmatter(text) if text else ({}, "", ["missing"])
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
                l.strip().lower().startswith("## contents") for l in lines[:12]
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
        f, stats = validate_triggers(skill_dir)
        return f.fails == 0 and stats["total"] >= MIN_TRIGGER_POS + MIN_TRIGGER_NEG

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

    install_block = ("## Install" in rtext
                     and "```" in rtext.split("## Install", 1)[-1][:600])
    return [
        ("SKILL.md present, frontmatter parses", bool(text) and not fm_err),
        ("frontmatter is exactly name/description/license", set(fm) == {"name", "description", "license"}),
        ("name lowercase-hyphenated ≤64, matches directory", bool(NAME_RE.match(name)) and len(name) <= 64 and skill_dir.name == name),
        (f"description ≤{DESC_BUDGET} chars", 0 < len(desc) <= DESC_BUDGET),
        ("description has 'Use when' trigger clause", "use when" in desc.lower()),
        ("description has exclusion clause", "not" in desc.lower()),
        (f"SKILL.md ≤{SKILL_LINE_BUDGET} lines", 0 < len(text.splitlines()) <= SKILL_LINE_BUDGET),
        (f"body ≤{BODY_TOKEN_TARGET} est. tokens", est_tokens(body) <= BODY_TOKEN_TARGET),
        ("zero hype-lexicon hits in SKILL.md", not any(w in text.lower() for w in HYPE_LEXICON)),
        ("zero multiplier claims in SKILL.md + README", no_multipliers()),
        ("LICENSE.md present, names APEX Business Systems", "APEX Business Systems" in ltext),
        ("MANIFEST.json valid: name match, version, license", manifest_ok()),
        ("references >100 lines carry '## Contents'", refs_toc_ok()),
        ("all scripts/*.py compile", scripts_compile_ok()),
        ("templates/ has SKILL, README, MANIFEST templates", all((skill_dir / "templates" / f).exists() for f in ("SKILL.template.md", "README.template.md", "MANIFEST.template.json"))),
        (f"trigger eval ≥{MIN_TRIGGER_POS}+/{MIN_TRIGGER_NEG}- and valid", triggers_ok()),
        ("scorecard.json present with lint.fails == 0", scorecard_ok()),
        ("README '## Install' with command block", install_block),
        ("README '## Before / After' section", bool(re.search(r"^##\s*Before\s*/\s*After", rtext, re.IGNORECASE | re.MULTILINE))),
        ("README carries APEX attribution footer", "APEX" in rtext),
    ]


def run_rubric(skill_dir: Path) -> int:
    """20 binary checks × 5 points. Every check is machine-verifiable.

    The printed score certifies structural and evidence properties of the
    package — nothing else. A check either passes by command or it fails.
    """
    checks = _rubric_checks(skill_dir)
    score = sum(5 for _, ok in checks if ok)
    print(f"RUBRIC {skill_dir.name}: {score}/100")
    for label, ok in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
    return 0 if score == 100 else 1


# ---------------------------------------------------------------- init
def init_skill(name: str, target: Path, templates: Path) -> int:
    if not NAME_RE.match(name) or len(name) > 64:
        print(f"ERROR: invalid name '{name}' (lowercase-hyphenated, ≤64 chars)")
        return 2
    dest = target / name
    if dest.exists():
        print(f"ERROR: {dest} already exists")
        return 2
    for sub in ("scripts", "references", "templates", "evals"):
        (dest / sub).mkdir(parents=True, exist_ok=True)
    mapping = {
        "SKILL.template.md": dest / "SKILL.md",
        "README.template.md": dest / "README.md",
        "MANIFEST.template.json": dest / "MANIFEST.json",
    }
    for src_name, dst in mapping.items():
        src = templates / src_name
        if not src.exists():
            print(f"ERROR: template missing: {src}")
            return 2
        dst.write_text(src.read_text(encoding="utf-8").replace("{{SKILL_NAME}}", name),
                       encoding="utf-8")
    (dest / "evals" / "trigger-eval.json").write_text("[]\n", encoding="utf-8")
    print(f"Scaffolded {dest} — fill the {{slots}}, then run: forge.py lint {dest}")
    return 0


# ---------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser(prog="forge.py")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p_init = sub.add_parser("init"); p_init.add_argument("name"); p_init.add_argument("--dir", default=".")
    for c in ("lint", "tokens", "triggers", "score", "rubric", "pack"):
        p = sub.add_parser(c); p.add_argument("skill_dir")
        if c == "lint":
            p.add_argument("--strict", action="store_true")
        if c == "pack":
            p.add_argument("--label", default="")
    a = ap.parse_args()

    if a.cmd == "init":
        return init_skill(a.name, Path(a.dir).resolve(),
                          Path(__file__).resolve().parent.parent / "templates")
    d = Path(a.skill_dir).resolve()
    if not d.is_dir():
        print(f"ERROR: not a directory: {d}"); return 2
    if a.cmd == "lint":
        f = lint_skill(d, strict=a.strict)
        print(f"LINT {'(strict) ' if a.strict else ''}{d.name}: "
              f"{f.fails} FAIL / {f.warns} WARN")
        print(f.render())
        return 1 if f.fails else 0
    if a.cmd == "tokens":
        ledger = token_ledger(d)
        print(json.dumps(ledger, indent=2))
        return 2 if "error" in ledger else 0
    if a.cmd == "triggers":
        f, stats = validate_triggers(d)
        print(f"TRIGGER EVAL {d.name}: {stats}")
        print(f.render())
        return 1 if f.fails else 0
    if a.cmd == "score":
        out = write_scorecard(d); print(f"Wrote {out}"); return 0
    if a.cmd == "rubric":
        return run_rubric(d)
    if a.cmd == "pack":
        return pack_skill(d, label=a.label)
    return 2


if __name__ == "__main__":
    sys.exit(main())
