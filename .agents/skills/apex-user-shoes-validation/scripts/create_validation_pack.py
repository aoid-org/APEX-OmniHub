#!/usr/bin/env python3
"""Create a repeatable user-shoes validation evidence pack."""

from __future__ import annotations

import argparse
from pathlib import Path
from textwrap import dedent


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dedent(content).lstrip(), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="create user-shoes validation evidence templates")
    parser.add_argument("output_dir", help="directory where evidence templates should be written")
    parser.add_argument("--scope", default="product-surface", help="short scope name for headings")
    args = parser.parse_args()

    root = Path(args.output_dir)
    scope = args.scope

    write(
        root / "00-product-truth.md",
        f"""
        # {scope} product truth

        | Surface | Claimed purpose | Canonical purpose | Drift found? | Required correction |
        |---|---|---|---|---|
        """,
    )
    write(
        root / "01-surface-validation.md",
        """
        # Surface validation matrix

        | Surface | Intended product purpose | User action | Expected behavior | Actual behavior | Works or gated honestly? | Visual unity preserved? | Evidence | Result |
        |---|---|---|---|---|---|---|---|---|
        """,
    )
    write(
        root / "02-action-validation.md",
        """
        # Action validation matrix

        | Surface | Action | Expected | Actual | Backend call? | User-visible result | Decision |
        |---|---|---|---|---:|---|---|
        """,
    )
    write(
        root / "03-visual-review.md",
        """
        # Visual review

        | Surface | Before screenshot | After screenshot | Visual degradation? | Purpose clearer? | Approved? |
        |---|---|---|---|---|---|
        """,
    )
    write(
        root / "04-final-report.md",
        f"""
        # {scope} user-shoes validation report

        Decision: GO / NO-GO / BLOCKED

        ## Scope

        ## Confirmed product truth

        ## Surfaces validated

        ## Actions validated

        ## Visual preservation

        ## Tests

        ## Security

        ## Remaining blockers

        ## Next executable action
        """,
    )

    print(f"created validation pack at {root}")


if __name__ == "__main__":
    main()
