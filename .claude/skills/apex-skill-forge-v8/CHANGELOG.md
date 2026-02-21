# Changelog — APEX Skill Forge

All notable changes to APEX Skill Forge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.0.0] - 2026-02-16

### Added

- **Core Engine Scripts**
  - `forge.py`: Skill scaffolder supporting 6 archetypes with kebab-case validation
  - `executor.py`: DAG-compatible execution wrapper with timeout/retry/idempotency
  - `audit.py`: 12-dimension quality validator with 9.5/10 threshold
  - `ship.py`: Tri-format packager (Claude/Universal/OmniHub)
- **OmniHub Integration**
  - `install_to_omnihub.py`: Auto-installer with catalog registration
  - `omnihub_integration/health_checks.py`: Runtime validation
  - `omnihub_integration/dag_registry.json`: Skill registration schema
- **Documentation**

  - `SKILL.md`: Claude-native format (206 lines, YAML frontmatter)
  - `README.md`: Universal vendor-agnostic documentation
  - `LLM_COMPATIBILITY.md`: 7-LLM integration guide
  - `INSTALLATION_GUIDE.md`: Platform-specific setup instructions
  - `VALIDATION_REPORT.md`: Comprehensive test results
  - `RELEASE_NOTES.md`: Version history and features

- **Package Artifacts**

  - `MANIFEST.json`: Self-documenting DAG metadata
  - `manifest.yaml`: Claude Skills spec compliance
  - Production ZIPs in `dist/` (Claude 25.6KB, Universal 24.1KB, OmniHub 30.8KB)

- **Quality Features**
  - Automated 12-dimension audit scoring
  - Decision trees with `├─` notation in forged skills
  - NEVER/ALWAYS anti-hallucination rules
  - **Success**/**Fails When** I/O documentation
  - Comprehensive test suite (66 tests, 100% pass rate)

### Changed

- Migrated from v4.0 `UNIVERSAL_PROMPT.md` to executable Python scripts
- Upgraded audit threshold to 9.5/10 (from unspecified)
- Enhanced forge template to generate 10.0/10 skills automatically
- Replaced Unicode emoji with ASCII markers (`[OK]`/`[FAIL]`/`[WARN]`) for Windows cp1252 compatibility

### Fixed

- Windows console encoding errors (UnicodeEncodeError on cp1252)
- Forge template missing Success criteria, decision trees, NEVER/ALWAYS rules
- Self-audit scoring (now 10.0/10 across all 12 dimensions)

## [4.0.0] - 2025-XX-XX (Baseline)

### Added

- `UNIVERSAL_PROMPT.md` prompt-based skill generation
- Basic LICENSE.md and README.md
- Manual skill engineering workflows

---

**Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.**
