#!/usr/bin/env python3
"""
APEX Skill Forge v8.0 — Tri-Format Packager
Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.

Packages skills into ZIP archives for Claude, Universal, or OmniHub formats.

Usage:
    python ship.py <skill-path> --format <claude|universal|omnihub> [--output <dir>]
    python ship.py --help
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import textwrap
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "8.0.0"
COPYRIGHT = "Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved."
VALID_FORMATS = ["claude", "universal", "omnihub"]


# ---------------------------------------------------------------------------
# Format Converters
# ---------------------------------------------------------------------------
def _readme_to_skill_md(readme_path: Path, manifest: dict[str, Any]) -> str:
    """Convert README.md to Claude SKILL.md with YAML frontmatter."""
    content = readme_path.read_text(encoding="utf-8")

    # Build YAML frontmatter
    frontmatter = textwrap.dedent(f"""\
        ---
        name: {manifest.get("name", "unknown")}
        archetype: {manifest.get("archetype", "workflow")}
        version: {manifest.get("version", "1.0.0")}
        description: "{manifest.get("description", "")}"
        context_budget: medium
        ---
    """)

    # Remove any universal-specific sections
    # (e.g., "For GPT-4", "For Gemini" install sections can stay — they're informational)
    return frontmatter + "\n" + content


def _manifest_json_to_yaml(manifest: dict[str, Any]) -> str:
    """Convert MANIFEST.json to manifest.yaml for Claude Skills spec."""
    lines = [
        f"name: {manifest.get('name', 'unknown')}",
        f"version: {manifest.get('version', '1.0.0')}",
        f"archetype: {manifest.get('archetype', 'workflow')}",
        f'description: "{manifest.get("description", "")}"',
        "context_budget: medium",
    ]

    dag = manifest.get("dag", {})
    if dag:
        lines.append("dag:")
        for key, value in dag.items():
            if isinstance(value, dict):
                lines.append(f"  {key}:")
                for k2, v2 in value.items():
                    lines.append(f"    {k2}: {json.dumps(v2)}")
            elif isinstance(value, list):
                lines.append(f"  {key}:")
                for item in value:
                    lines.append(f"    - {json.dumps(item)}")
            elif isinstance(value, bool):
                lines.append(f"  {key}: {'true' if value else 'false'}")
            else:
                lines.append(f"  {key}: {value}")

    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Packager
# ---------------------------------------------------------------------------
def package_skill(
    skill_path: Path,
    fmt: str,
    output_dir: Path | None = None,
) -> Path:
    """
    Package a skill into a ZIP archive.

    Args:
        skill_path: Path to the skill directory
        fmt: 'claude', 'universal', or 'omnihub'
        output_dir: Output directory for the ZIP (default: skill_path parent)

    Returns:
        Path to the created ZIP file.
    """
    if fmt not in VALID_FORMATS:
        raise ValueError(f"Invalid format '{fmt}'. Must be one of: {VALID_FORMATS}")

    if not skill_path.is_dir():
        raise FileNotFoundError(f"Skill directory not found: {skill_path}")

    manifest_path = skill_path / "MANIFEST.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"MANIFEST.json not found in {skill_path}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    skill_name = manifest.get("name", skill_path.name)
    version = manifest.get("version", "1.0.0")

    if output_dir is None:
        output_dir = skill_path.parent

    output_dir.mkdir(parents=True, exist_ok=True)
    zip_name = f"{skill_name}-{fmt}-v{version}.zip"
    zip_path = output_dir / zip_name

    # Build staging directory
    stage_dir = output_dir / f".stage-{skill_name}-{fmt}"
    if stage_dir.exists():
        shutil.rmtree(stage_dir)

    root_dir = stage_dir / skill_name
    root_dir.mkdir(parents=True)

    # Copy common files
    for subdir in ["scripts", "references"]:
        src = skill_path / subdir
        if src.exists():
            shutil.copytree(src, root_dir / subdir)

    # Copy LICENSE
    for lic_name in ["LICENSE", "LICENSE.md", "LICENSE.txt"]:
        lic = skill_path / lic_name
        if lic.exists():
            shutil.copy2(lic, root_dir / lic_name)
            break

    # Format-specific files
    if fmt == "claude":
        # SKILL.md at root (converted from README)
        readme = skill_path / "README.md"
        if readme.exists():
            skill_md_content = _readme_to_skill_md(readme, manifest)
            (root_dir / "SKILL.md").write_text(skill_md_content, encoding="utf-8")

        # manifest.yaml
        yaml_content = _manifest_json_to_yaml(manifest)
        (root_dir / "manifest.yaml").write_text(yaml_content, encoding="utf-8")

        # Also include README for reference
        if readme.exists():
            shutil.copy2(readme, root_dir / "README.md")

    elif fmt == "universal":
        # README.md at root
        readme = skill_path / "README.md"
        if readme.exists():
            shutil.copy2(readme, root_dir / "README.md")

        # MANIFEST.json
        shutil.copy2(manifest_path, root_dir / "MANIFEST.json")

        # LLM_COMPATIBILITY.md
        compat = skill_path / "LLM_COMPATIBILITY.md"
        if compat.exists():
            shutil.copy2(compat, root_dir / "LLM_COMPATIBILITY.md")

    elif fmt == "omnihub":
        # README.md + MANIFEST.json at root
        readme = skill_path / "README.md"
        if readme.exists():
            shutil.copy2(readme, root_dir / "README.md")
        shutil.copy2(manifest_path, root_dir / "MANIFEST.json")

        # omnihub_integration directory
        omnihub_src = skill_path / "omnihub_integration"
        if omnihub_src.exists():
            shutil.copytree(omnihub_src, root_dir / "omnihub_integration")

        # install_to_omnihub.py
        installer = skill_path / "install_to_omnihub.py"
        if installer.exists():
            shutil.copy2(installer, root_dir / "install_to_omnihub.py")

        # LLM_COMPATIBILITY.md
        compat = skill_path / "LLM_COMPATIBILITY.md"
        if compat.exists():
            shutil.copy2(compat, root_dir / "LLM_COMPATIBILITY.md")

    # Generate CHANGELOG.md
    changelog = textwrap.dedent(f"""\
        # Changelog — {skill_name}

        ## [{version}] - {datetime.now(timezone.utc).strftime("%Y-%m-%d")}

        ### Added
        - Initial release via APEX Skill Forge v{VERSION}
        - DAG-compatible executor with timeout and retry support
        - 12-dimension audit validation
        - Tri-format packaging (Claude, Universal, OmniHub)

        ---

        {COPYRIGHT}
    """)
    (root_dir / "CHANGELOG.md").write_text(changelog, encoding="utf-8")

    # Create ZIP
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(root_dir.rglob("*")):
            if file_path.is_file():
                arcname = file_path.relative_to(stage_dir)
                zf.write(file_path, arcname)

    # Cleanup staging
    shutil.rmtree(stage_dir)

    # Validate
    _validate_zip(zip_path, fmt)

    print(f"[OK] Packaged: {zip_path} ({zip_path.stat().st_size:,} bytes)")
    return zip_path


def _validate_zip(zip_path: Path, fmt: str) -> None:
    """Validate ZIP structure matches expected format."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        names = zf.namelist()

    # Extract root folder name
    root = names[0].split("/")[0] if names else ""

    if fmt == "claude":
        required = [f"{root}/SKILL.md", f"{root}/manifest.yaml"]
        forbidden = [f"{root}/MANIFEST.json"]
    elif fmt == "universal":
        required = [f"{root}/README.md", f"{root}/MANIFEST.json"]
        forbidden = [f"{root}/SKILL.md", f"{root}/manifest.yaml"]
    elif fmt == "omnihub":
        required = [f"{root}/README.md", f"{root}/MANIFEST.json"]
        forbidden = [f"{root}/SKILL.md", f"{root}/manifest.yaml"]
    else:
        return

    missing = [r for r in required if r not in names]
    unexpected = [f for f in forbidden if f in names]

    if missing:
        print(f"[WARN] Missing expected files: {missing}")
    if unexpected:
        print(f"[WARN] Unexpected files for {fmt} format: {unexpected}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        prog="ship",
        description=f"APEX Skill Forge v{VERSION} — Tri-Format Packager",
        epilog=COPYRIGHT,
    )
    parser.add_argument("skill_path", type=Path, help="Path to skill directory")
    parser.add_argument(
        "--format",
        required=True,
        choices=VALID_FORMATS,
        dest="fmt",
        help="Package format: claude, universal, or omnihub",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output directory (default: skill parent directory)",
    )
    args = parser.parse_args()

    try:
        zip_path = package_skill(args.skill_path, args.fmt, args.output)
        print(f"[SHIP] Package ready: {zip_path}")
    except Exception as e:
        print(f"[FAIL] Packaging failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
