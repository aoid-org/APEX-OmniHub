# Observability Baseline

## Required Production Telemetry

Every production system must expose:
- structured logs
- metrics
- tracing
- health checks
- audit trails where applicable
- cost visibility where applicable
- alerting for failure conditions

## Required Metrics

Track:
- latency
- throughput
- error rate
- retry frequency
- queue depth
- memory usage
- CPU usage where applicable
- deployment health
- rollback frequency

## Operational Rule

If operators cannot see it, debug it, or roll it back, it is not production ready.
