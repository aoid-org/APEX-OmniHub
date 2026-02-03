<!-- VALUATION_IMPACT: Maps engineer KPIs to investor-grade dashboards -->
<!-- Generated: 2026-02-03 -->
| Category | Metric | Target | Dashboard |
| --- | --- | --- | --- |
| Build Performance | Build Time | < 4 minutes | Grafana (https://grafana.example.com/builds) |
| Build Performance | Deployment Frequency | Daily | Grafana (https://grafana.example.com/deployments) |
| Build Performance | Rollback Rate | < 1% | Grafana (https://grafana.example.com/rollbacks) |
| Code Quality | Test Coverage | ≥ 85% | SonarCloud (https://sonarcloud.io/dashboard?id=apex-omnihub) |
| Code Quality | Technical Debt Ratio | < 3% | SonarCloud (same) |
| Reliability | Uptime | 99.95% | DataDog (https://datadog.example.com/uptime) |
| Reliability | Latency P50/P95/P99 | <50/120/250ms | Grafana (https://grafana.example.com/latency) |
| Reliability | Error Rate | <0.2% | Sentry (https://sentry.example.com/apex-omnihub) |
| Security | Vulnerability Count | 0 critical | SonarCloud (see above) |
| Security | Time to Patch | < 24h | DataDog Security (https://datadog.example.com/security) |
| Velocity | Cycle Time | < 5 days | Grafana (https://grafana.example.com/cycle) |
| Velocity | PR Merge Time | < 6 hours | Grafana (https://grafana.example.com/prs) |
| Velocity | Deployment Lead Time | < 1 day | Grafana (https://grafana.example.com/lead-time) |
| Scale Metrics | Tenant Count | 10,000+ | Grafana (https://grafana.example.com/tenants) |
| Scale Metrics | Workflow Runs/Day | 50K | Grafana (https://grafana.example.com/workflows) |
| Scale Metrics | Vector Search QPS | 5K | Grafana (https://grafana.example.com/vector-qps) |

# Verify:
markdownlint docs/metrics/ENGINEERING_KPIs.md
