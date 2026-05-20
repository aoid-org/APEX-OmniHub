# Testing Evidence & Reports

This directory contains source-controlled testing evidence and audit reports.
Volatile runtime artifacts (JUnit XML, HTML reports) are excluded via .gitignore.

## Armageddon Test Suite

| Report | Date | Verdict |
|--------|------|---------|
| [ARMAGEDDON_LIVE_VALIDATION_RESULTS_2026_05_08.md](./ARMAGEDDON_LIVE_VALIDATION_RESULTS_2026_05_08.md) | 2026-05-08 | ✅ ALL PASS |

## Additional Test Evidence

| Report | Scope |
|--------|-------|
| [E2E_TEST_RESULTS.md](./E2E_TEST_RESULTS.md) | Browser and end-to-end validation evidence |
| [worldwide-wildcard-tests.md](./worldwide-wildcard-tests.md) | Worldwide Wildcard control-plane test documentation |

## Armageddon Certification (Level 7)

- **Platform:** APEX-OmniHub v1.6.0
- **L7 Adversarial Iterations:** 40,000
- **Escape Rate:** 0%
- **Certification:** LEVEL 7 CERTIFIED — ZERO ESCAPE
- **Run ID:** 10efa424-e2e1-4659-b684-f37401f61f2f
- **Latest run:** 2026-05-08

## Test Commands

| Command | Scope |
|---|---|
| `npm run test` | Full Vitest suite |
| `npm run test:unit` | Unit tests (`tests/lib`) |
| `npm run test:integration` | Integration tests |
| `npm run test:e2e` | Playwright E2E (all configured projects) |
| `npm run test:e2e:ci` | Playwright E2E (chromium only) |
| `npm run test:py` | Python orchestrator + omega (`pytest -q`) |
| `npm run test:coverage` | Vitest with coverage report |

Playwright projects: chromium, firefox, mobile-chrome (CI); mobile-safari, iPad (local).

Python test coverage: `pytest --cov=../omega` is included in the orchestrator CI run, covering the `omega/` APEX Resilience Protocol engine.

## Coverage Thresholds (updated 2026-05-20)

Current Vitest coverage thresholds:

| Metric | Threshold |
|---|---|
| Statements | 70 |
| Branches | 63 |
| Functions | 72 |
| Lines | 71 |

North-star target: branches → 80%. Thresholds raised 2026-05-20 (previous: statements 69, branches 60, functions 71, lines 70).

## Last Updated

2026-05-20
