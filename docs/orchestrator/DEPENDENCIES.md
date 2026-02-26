# Orchestrator Dependency Management

<!-- APEX_DOC_STAMP
Owner: DevSecOps
Status: Active
Last Updated: 2026-02-25
Applies to Version: 1.4.0
-->

## Lock File Management

The orchestrator uses `pip-compile` (from `pip-tools`) to generate a deterministic, hash-pinned lock file.

### Files

| File | Purpose |
|------|---------|
| `orchestrator/pyproject.toml` | Canonical dependency source (PEP 621) |
| `orchestrator/requirements.in` | Input file for pip-compile (mirrors pyproject.toml deps) |
| `orchestrator/requirements.lock` | Pinned lock file with hashes |
| `orchestrator/requirements.txt` | Legacy compatibility file |

### Regenerating the Lock File

```bash
cd orchestrator
pip install pip-tools
pip-compile --generate-hashes -o requirements.lock requirements.in
```

### Denylist

The following system-specific packages MUST NOT appear in `requirements.lock`. They are non-portable, platform-specific libraries that break cross-platform CI:

| Package | Reason |
|---------|--------|
| `dbus-python` | Linux D-Bus binding — not portable, breaks macOS/Windows CI |
| `python-apt` | Debian/Ubuntu APT binding — distro-specific |
| `PyGObject` | GNOME GObject introspection — desktop-only dependency |
| `launchpadlib` | Ubuntu Launchpad API — distro-specific |

### CI Enforcement

The `orchestrator-ci.yml` workflow includes a denylist check that fails the build if any of these packages appear in the lock file:

```yaml
- name: Check requirements.lock denylist
  run: |
    DENYLIST="dbus-python|python-apt|PyGObject|launchpadlib"
    if grep -iE "^(${DENYLIST})==" orchestrator/requirements.lock; then
      echo "BLOCKED: Denylist package found in requirements.lock"
      exit 1
    fi
```

### Adding New Dependencies

1. Add the dependency to `pyproject.toml` under `[project].dependencies`
2. Mirror it in `requirements.in`
3. Regenerate: `pip-compile --generate-hashes -o requirements.lock requirements.in`
4. Verify no denylist packages were pulled in
5. Commit all three files together
