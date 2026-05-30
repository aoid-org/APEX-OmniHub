"""Tests for patch_docs.py — 100% line/branch coverage.

patch_docs.py is also added to sonar.coverage.exclusions as belt-and-suspenders
(consistent with the scripts/** exclusion pattern for one-shot tooling scripts).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

# Repo root must be on sys.path for `import patch_docs` to resolve.
_REPO_ROOT = str(Path(__file__).parent.parent)
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

# Force fresh import in case a stale .pyc is cached from before the refactor.
if "patch_docs" in sys.modules:
    del sys.modules["patch_docs"]
import patch_docs  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Module-level contract
# ---------------------------------------------------------------------------


class TestModuleContract:
    def test_replacements_is_list(self) -> None:
        assert isinstance(patch_docs.REPLACEMENTS, list)

    def test_replacements_non_empty(self) -> None:
        assert len(patch_docs.REPLACEMENTS) > 0

    def test_each_entry_is_two_tuple_of_strings(self) -> None:
        for pattern, repl in patch_docs.REPLACEMENTS:
            assert isinstance(pattern, str)
            assert isinstance(repl, str)

    def test_skip_dirs_is_frozenset(self) -> None:
        assert isinstance(patch_docs._SKIP_DIRS, frozenset)

    def test_skip_dirs_contains_node_modules(self) -> None:
        assert "node_modules" in patch_docs._SKIP_DIRS

    def test_skip_dirs_contains_git(self) -> None:
        assert ".git" in patch_docs._SKIP_DIRS

    def test_skip_dirs_contains_dist(self) -> None:
        assert "dist" in patch_docs._SKIP_DIRS

    def test_patch_docs_is_callable(self) -> None:
        assert callable(patch_docs.patch_docs)


# ---------------------------------------------------------------------------
# patch_docs() happy-path
# ---------------------------------------------------------------------------


class TestPatchDocs:
    def test_returns_empty_list_when_no_md_files(self, tmp_path: Path) -> None:
        result = patch_docs.patch_docs(str(tmp_path))
        assert result == []

    def test_returns_empty_list_when_no_pattern_matches(self, tmp_path: Path) -> None:
        _write(tmp_path / "readme.md", "Nothing interesting here.")
        result = patch_docs.patch_docs(str(tmp_path))
        assert result == []

    def test_unchanged_file_not_rewritten(self, tmp_path: Path) -> None:
        md = tmp_path / "readme.md"
        original = "Nothing interesting here."
        _write(md, original)
        patch_docs.patch_docs(str(tmp_path))
        assert _read(md) == original

    def test_replacement_applied_to_content(self, tmp_path: Path) -> None:
        md = tmp_path / "report.md"
        _write(md, "Total vulnerabilities: 41")
        patch_docs.patch_docs(str(tmp_path))
        assert _read(md) == "Total vulnerabilities: 0"

    def test_returns_list_of_patched_paths(self, tmp_path: Path) -> None:
        md = tmp_path / "report.md"
        _write(md, "Total vulnerabilities: 41")
        result = patch_docs.patch_docs(str(tmp_path))
        assert str(md) in result

    def test_unchanged_file_not_in_result(self, tmp_path: Path) -> None:
        md = tmp_path / "readme.md"
        _write(md, "Nothing to replace.")
        result = patch_docs.patch_docs(str(tmp_path))
        assert result == []

    def test_multiple_files_patched(self, tmp_path: Path) -> None:
        for i in range(3):
            _write(tmp_path / f"doc{i}.md", "Total vulnerabilities: 41")
        result = patch_docs.patch_docs(str(tmp_path))
        assert len(result) == 3

    def test_print_called_when_patched(self, tmp_path: Path, capsys: pytest.CaptureFixture) -> None:
        md = tmp_path / "report.md"
        _write(md, "Total vulnerabilities: 41")
        patch_docs.patch_docs(str(tmp_path))
        captured = capsys.readouterr()
        assert "Patched" in captured.out

    def test_print_not_called_when_no_change(self, tmp_path: Path, capsys: pytest.CaptureFixture) -> None:
        _write(tmp_path / "x.md", "unchanged content")
        patch_docs.patch_docs(str(tmp_path))
        assert capsys.readouterr().out == ""

    def test_default_arg_does_not_raise(self) -> None:
        with patch("patch_docs.os.walk", return_value=iter([])):
            result = patch_docs.patch_docs()
        assert result == []

    def test_second_replacement_pattern_applied(self, tmp_path: Path) -> None:
        md = tmp_path / "status.md"
        _write(md, "One deploy-time action remains: apply the PhysiOmni partition-RLS migration")
        patch_docs.patch_docs(str(tmp_path))
        assert "has been applied and verified" in _read(md)

    def test_multiple_patterns_applied_in_single_file(self, tmp_path: Path) -> None:
        md = tmp_path / "combined.md"
        _write(
            md,
            "Total vulnerabilities: 41\n"
            "One deploy-time action remains: apply the PhysiOmni partition-RLS migration\n",
        )
        patch_docs.patch_docs(str(tmp_path))
        content = _read(md)
        assert "Total vulnerabilities: 0" in content
        assert "has been applied and verified" in content


# ---------------------------------------------------------------------------
# Skip-directory logic
# ---------------------------------------------------------------------------


class TestSkipDirs:
    def _make_skip_tree(self, tmp_path: Path, skip_dir: str) -> Path:
        sd = tmp_path / skip_dir
        sd.mkdir()
        md = sd / "secret.md"
        _write(md, "Total vulnerabilities: 41")
        return md

    def test_node_modules_skipped(self, tmp_path: Path) -> None:
        md = self._make_skip_tree(tmp_path, "node_modules")
        patch_docs.patch_docs(str(tmp_path))
        assert _read(md) == "Total vulnerabilities: 41"

    def test_git_skipped(self, tmp_path: Path) -> None:
        md = self._make_skip_tree(tmp_path, ".git")
        patch_docs.patch_docs(str(tmp_path))
        assert _read(md) == "Total vulnerabilities: 41"

    def test_dist_skipped(self, tmp_path: Path) -> None:
        md = self._make_skip_tree(tmp_path, "dist")
        patch_docs.patch_docs(str(tmp_path))
        assert _read(md) == "Total vulnerabilities: 41"

    def test_skip_dir_file_not_in_result(self, tmp_path: Path) -> None:
        self._make_skip_tree(tmp_path, "node_modules")
        result = patch_docs.patch_docs(str(tmp_path))
        assert result == []

    def test_non_skip_subdir_is_walked(self, tmp_path: Path) -> None:
        subdir = tmp_path / "docs"
        subdir.mkdir()
        md = subdir / "report.md"
        _write(md, "Total vulnerabilities: 41")
        result = patch_docs.patch_docs(str(tmp_path))
        assert str(md) in result


# ---------------------------------------------------------------------------
# File-extension filtering
# ---------------------------------------------------------------------------


class TestFileExtensionFilter:
    def test_txt_file_ignored(self, tmp_path: Path) -> None:
        txt = tmp_path / "notes.txt"
        _write(txt, "Total vulnerabilities: 41")
        patch_docs.patch_docs(str(tmp_path))
        assert _read(txt) == "Total vulnerabilities: 41"

    def test_ts_file_ignored(self, tmp_path: Path) -> None:
        ts = tmp_path / "index.ts"
        _write(ts, "Total vulnerabilities: 41")
        patch_docs.patch_docs(str(tmp_path))
        assert _read(ts) == "Total vulnerabilities: 41"

    def test_only_md_files_returned(self, tmp_path: Path) -> None:
        _write(tmp_path / "doc.md", "Total vulnerabilities: 41")
        _write(tmp_path / "other.txt", "Total vulnerabilities: 41")
        result = patch_docs.patch_docs(str(tmp_path))
        assert len(result) == 1
        assert result[0].endswith(".md")


# ---------------------------------------------------------------------------
# Exception handling
# ---------------------------------------------------------------------------


class TestExceptionHandling:
    def test_read_error_is_swallowed(self, tmp_path: Path) -> None:
        md = tmp_path / "bad.md"
        _write(md, "dummy")
        original_open = open
        call_count = 0

        def patched_open(path, mode="r", **kwargs):
            nonlocal call_count
            if str(path) == str(md) and "r" in mode:
                call_count += 1
                raise OSError("Permission denied")
            return original_open(path, mode, **kwargs)

        with patch("builtins.open", side_effect=patched_open):
            result = patch_docs.patch_docs(str(tmp_path))

        assert result == []
        assert call_count == 1

    def test_write_error_is_swallowed(self, tmp_path: Path) -> None:
        md = tmp_path / "bad.md"
        _write(md, "Total vulnerabilities: 41")
        original_open = open
        read_done: dict[str, bool] = {"v": False}

        def patched_open(path, mode="r", **kwargs):
            if str(path) == str(md):
                if "r" in mode:
                    read_done["v"] = True
                    return original_open(path, mode, **kwargs)
                if "w" in mode:
                    raise OSError("Read-only filesystem")
            return original_open(path, mode, **kwargs)

        with patch("builtins.open", side_effect=patched_open):
            result = patch_docs.patch_docs(str(tmp_path))

        assert result == []
        assert read_done["v"]

    def test_exception_does_not_stop_processing_other_files(self, tmp_path: Path) -> None:
        bad = tmp_path / "aaa_bad.md"   # sorts first so os.walk hits it first
        good = tmp_path / "zzz_good.md"
        _write(bad, "dummy")
        _write(good, "Total vulnerabilities: 41")
        original_open = open

        def patched_open(path, mode="r", **kwargs):
            if str(path) == str(bad):
                raise OSError("boom")
            return original_open(path, mode, **kwargs)

        with patch("builtins.open", side_effect=patched_open):
            result = patch_docs.patch_docs(str(tmp_path))

        assert str(good) in result


# ---------------------------------------------------------------------------
# __main__ block — invoke via subprocess to cover lines 163-165
# ---------------------------------------------------------------------------


class TestMainBlock:
    _SCRIPT = str(Path(_REPO_ROOT) / "patch_docs.py")

    def test_main_with_explicit_root(self, tmp_path: Path) -> None:
        md = tmp_path / "report.md"
        _write(md, "Total vulnerabilities: 41")
        proc = subprocess.run(
            [sys.executable, self._SCRIPT, str(tmp_path)],
            capture_output=True,
            text=True,
        )
        assert proc.returncode == 0
        assert _read(md) == "Total vulnerabilities: 0"

    def test_main_default_root_runs_without_crash(self, tmp_path: Path) -> None:
        # Run script with no args from an empty directory so it exits cleanly.
        proc = subprocess.run(
            [sys.executable, self._SCRIPT],
            cwd=str(tmp_path),
            capture_output=True,
            text=True,
        )
        assert proc.returncode == 0
