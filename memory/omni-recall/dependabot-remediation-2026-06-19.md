# Dependabot Remediation — 2026-06-19

## Context

GitHub Dependabot reported open alerts for vulnerable frontend and local-agent dependencies, including Vite, DOMPurify, JS-YAML, React Router, `@babel/core`, launch-editor/Vite transitive dependencies, and aiohttp across root, `apps/omnihub-site`, `apps/omnihub-proof`, and `local-agents` manifests/locks.

## Decisions

- Kept Vite on patched compatible major lines rather than forcing incompatible major upgrades:
  - root app: Vite 7.3.5 line
  - `apps/omnihub-site`: Vite 7.3.5 line because `vite-react-ssg@0.9.1-beta.1` does not advertise Vite 8 peer support
  - `apps/omnihub-proof`: Vite 6.4.3 line to resolve the Vite 6 advisory without crossing framework-major boundaries
- Updated DOMPurify to 3.4.11 wherever it was directly declared.
- Updated `apps/omnihub-site` React Router and esbuild resolution to clear low-risk audit findings shown by Dependabot.
- Updated `local-agents` aiohttp pin from 3.14.0 to 3.14.1.
- Used package-manager lock updates so Dependabot/GitHub can observe patched resolved versions.

## Validation Notes

- Root `npm audit --json`: no moderate/high/critical vulnerabilities remained after targeted dependency updates; low-only Hardhat/Ethers dev-chain findings remain.
- `apps/omnihub-site npm audit --json`: found 0 vulnerabilities after targeted lockfile and override updates.
- `apps/omnihub-proof npm audit --json`: found 0 vulnerabilities after targeted lockfile updates.
- `python3 -m pip install --dry-run -r local-agents/requirements.txt`: confirmed aiohttp 3.14.1 resolves.
## Follow-up — Remaining Python Dependabot Alerts

- Rechecked the remaining GitHub screenshot findings against the repository lockfiles.
- `aiohttp` is locked at 3.14.1, which is the patched version for the listed <=3.14.0 advisories.
- Upgraded `orchestrator/uv.lock` PyTorch from 2.10.0 to 2.12.1 with `uv lock --upgrade-package torch==2.12.1` to resolve the torch.jit.script memory corruption alert.
- Exported the orchestrator lockfile and verified it with `pip-audit`; no known vulnerabilities were found.

## Follow-up — 2026-06-22 Orchestrator Python Alerts

- Reviewed the new Dependabot screenshot alerts for `aiohttp` and `pydantic-settings` against the orchestrator lockfile.
- Confirmed `aiohttp` remains locked at 3.14.1, the patched version for the listed <=3.14.0 advisories.
- Upgraded `orchestrator/uv.lock` `pydantic-settings` from 2.14.1 to 2.14.2 with `uv lock --upgrade-package pydantic-settings` to resolve GHSA-4xgf-cpjx-pc3j.
- Let `uv` refresh missing lock metadata for the already-declared `slowapi>=0.1.9` dependency in `orchestrator/pyproject.toml` so the lockfile is consistent with the manifest.
- Validation: `uv lock --check`, import/version smoke check, `uvx pip-audit --progress-spinner off --path .venv/lib/python3.12/site-packages`, and `uv run pytest tests/test_models.py -q` all passed.
