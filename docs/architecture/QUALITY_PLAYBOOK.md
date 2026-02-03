<!-- VALUATION_IMPACT: Enforces gated merges for audit-ready quality -->
<!-- Generated: 2026-02-03 -->
# APEX Gate
| Criterion | Expectation |
| --- | --- |
| Lint Pass | npm run lint -- --max-warnings 0 |
| Build Pass | npm run build |
| Security Hotspots | 0 new findings in SonarCloud |
| Test Coverage | ≥80% aggregate (Vitest + integrations) |

# Testing Pyramid
| Level | Scope | Coverage Target |
| --- | --- | --- |
| L1 – Unit | Vitest suites | 85% |
| L2 – Integration | Supabase adapters | 70% |
| L3 – E2E | Playwright critical paths | 50% |

# Audit-Ready Artifacts
| Artifact | Detail |
| --- | --- |
| Location | .sonarqube/reports/ |
| Trigger | Every push to main |
| Format | JSON summary + PDF dossier |

# Verify:
markdownlint docs/architecture/QUALITY_PLAYBOOK.md
