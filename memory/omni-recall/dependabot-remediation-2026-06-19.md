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
