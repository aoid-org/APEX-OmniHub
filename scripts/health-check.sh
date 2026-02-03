#!/usr/bin/env bash
# VALUATION_IMPACT: Automates cross-service health checks to reduce ops risk
# Generated: 2026-02-03
set -euo pipefail

GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"
RESET="\033[0m"

print_status() {
  local color="$1"
  local message="$2"
  printf "%b%s%b\n" "$color" "$message" "$RESET"
  return 0
}

: "${PSQL_CONN:?[NEEDS_CONFIG: supply Supabase psql connection string]}"
: "${TEMPORAL_STATUS_URL:?[NEEDS_CONFIG: provide Temporal heartbeat URL]}"
: "${REDIS_URI:?[NEEDS_CONFIG: provide Redis URI]}"

print_status "$GREEN" "Supabase DB connectivity check"
if ! psql "$PSQL_CONN" -c '\q' >/dev/null 2>&1; then
  print_status "$RED" "Supabase DB check failed"
  exit 1
fi

print_status "$GREEN" "Temporal worker heartbeat check"
if ! curl -fs "$TEMPORAL_STATUS_URL" >/dev/null; then
  print_status "$RED" "Temporal heartbeat missing"
  exit 1
fi

redis_output=$(redis-cli -u "$REDIS_URI" INFO STATS)
if [[ -z "$redis_output" ]]; then
  print_status "$RED" "Redis unreachable"
  exit 1
fi

hit_rate=$(printf "%s" "$redis_output" | awk -F: '/keyspace_hits/ {hits=$2} /keyspace_misses/ {misses=$2} END {sum=hits+misses; print (sum==0?0:hits/sum)}')
if awk "BEGIN {exit !($hit_rate < 0.8)}"; then
  print_status "$YELLOW" "Redis hit rate ${hit_rate} (<80%)"
else
  print_status "$GREEN" "Redis hit rate ${hit_rate}"
fi

print_status "$GREEN" "Overall health check passed"
