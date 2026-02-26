# Repo Inventory — Phase 0 Preflight

**Date:** 2026-02-25
**Branch:** claude/setup-devsecops-pipeline-XaDPj (from main)
**Scan performed by:** DevSecOps automation

---

## Root Files

| File | Type | Size |
|------|------|------|
| `.env.demo.example` | Config template | 700 B |
| `.env.example` | Config template | 4,334 B |
| `.env.sandbox.example` | Config template | 2,558 B |
| `.gitignore` | Git config | 1,486 B |
| `.gitleaks.toml` | Security config | 590 B |
| `.prettierignore` | Formatter config | 86 B |
| `.stylelintignore` | Linter config | 86 B |
| `.trufflehog-exclude-paths.txt` | Security config | 546 B |
| `APEX Bible.zip` | **Binary artifact** | 32,203 B |
| `APEX_RECON_ENGINE_V2.html` | HTML document | 7,805 B |
| `CHANGELOG.md` | Documentation | 15,812 B |
| `LICENSE` | License | 373 B |
| `Makefile` | Build config | 185 B |
| `OPS_RUNBOOKS.md` | Documentation | 3,498 B |
| `README.md` | Documentation | 10,956 B |
| `SUPABASE_SETUP.md` | Documentation | 1,739 B |
| `THIRD_PARTY_NOTICES.md` | Documentation | 1,257 B |
| `bun.lockb` | **Binary lockfile** | 648,854 B |
| `capacitor.config.ts` | Capacitor config | 502 B |
| `components.json` | UI config | 414 B |
| `deno.lock` | Deno lockfile | 9,170 B |
| `ecosystem.config.js` | PM2 config | 433 B |
| `eslint.config.js` | Linter config | 2,244 B |
| `eslint.config.shared.js` | Linter config | 1,049 B |
| `hardhat.config.cts` | Web3 config | 1,983 B |
| `index.html` | Entry HTML | 4,129 B |
| `package-lock.json` | **npm lockfile** | 943,453 B |
| `package.json` | Package manifest | 8,147 B |
| `playwright.config.ts` | E2E config | 1,305 B |
| `postcss.config.cjs` | CSS config | 95 B |
| `pyproject.toml` | Python config | 271 B |
| `sonar-project.properties` | SonarQube config | 1,106 B |
| `start-dev.sh` | Dev script | 609 B |
| `stop-dev.sh` | Dev script | 471 B |
| `tailwind.config.ts` | CSS framework config | 3,521 B |
| `tsconfig.app.json` | TypeScript config | 686 B |
| `tsconfig.json` | TypeScript config | 385 B |
| `tsconfig.node.json` | TypeScript config | 481 B |
| `turbo.json` | Turborepo config | 453 B |
| `vercel.json` | Vercel config | 2,869 B |
| `vite.config.ts` | Build config | 4,752 B |
| `vitest.config.ts` | Test config | 2,049 B |

## Root Directories

| Directory | Description |
|-----------|-------------|
| `.claude/` | Claude AI config & skills |
| `.cursor/` | Cursor IDE config |
| `.github/` | GitHub Actions & workflows |
| `.vscode/` | VS Code config |
| `android/` | Android (Capacitor) platform |
| `apex-resilience/` | Resilience testing framework |
| `apps/` | Sub-applications (omnihub-site) |
| `contracts/` | Smart contracts (Solidity) |
| `docs/` | Documentation |
| `e2e/` | End-to-end tests |
| `ios/` | iOS (Capacitor) platform |
| `local-agents/` | Local AI agents |
| `omega/` | Omega subsystem |
| `orchestrator/` | Python orchestrator |
| `public/` | Static assets |
| `sandbox/` | Sandbox configs |
| `scripts/` | Build/dev scripts |
| `security/` | Security scan artifacts |
| `services/` | Backend services |
| `sim/` | Simulation subsystem |
| `src/` | Main source code |
| `supabase/` | Supabase edge functions & config |
| `terraform/` | Infrastructure as Code |
| `tests/` | Unit/integration tests |

## GitHub Workflows (`.github/workflows/*.yml`)

| # | Workflow File | Purpose |
|---|--------------|---------|
| 1 | `cd-staging.yml` | CD pipeline for staging deploys |
| 2 | `chaos-simulation-ci.yml` | Chaos engineering simulation CI |
| 3 | `ci-runtime-gates.yml` | CI runtime quality gates |
| 4 | `compliance.yml` | Compliance checks |
| 5 | `deploy-web3-functions.yml` | Web3 edge function deployment |
| 6 | `guardrail-alert.yml` | Guardrail alerting |
| 7 | `nightly-evaluation.yml` | Nightly evaluation runs |
| 8 | `orchestrator-ci.yml` | Python orchestrator CI |
| 9 | `production-readiness.yml` | Production readiness gates |
| 10 | `secret-scanning.yml` | Secret scanning (TruffleHog, Gitleaks) |
| 11 | `security-regression-guard.yml` | Security regression guard |

## Root Artifacts Scan

### `lint_*.txt` files
- **Root:** None found
- **`apps/omnihub-site/`:** `lint_log.txt`, `lint_log_v2.txt`, `lint_log_v3.txt` (stale CI artifacts)

### `*.zip` files
| File | Location |
|------|----------|
| `APEX Bible.zip` | Root (32 KB) — **FLAGGED for Phase 3** |
| `apex-frontend-universal-skill.zip` | `.claude/skills/` |
| `apex-skill-forge-universal.zip` | `.claude/skills/` |
| `creative-director-skill.zip` | `.claude/skills/` |
| `media-generation-mastery.zip` | `.claude/skills/` |
| `omnidev-v2.zip` | `.claude/skills/` |

### `*.webm` files
- **None found** in repo (script `scripts/record_app_demo.ts` generates `OMNILINK_APP_DEMO.webm` at runtime to `evidence/` dir, which is gitignored)

### `security/*.json` files
- **None found** — `security/` directory contains only `.gitleaks.toml`
- `.gitignore` already covers `security/npm-audit-latest.json` and `security/npm-audit-prod.json`

### `coverage/` directory
- **Not present** (gitignored)

### `playwright-report/` directory
- **Not present** (gitignored)

## Lockfile Conflict

**FLAGGED:** Both `package-lock.json` (npm) and `bun.lockb` (Bun) exist simultaneously at root. Must be resolved in Phase 2.
