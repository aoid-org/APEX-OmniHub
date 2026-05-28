# Incident Response Runbook

## Overview
Standard operating procedures for APEX-OmniHub incidents.

## High Severity (SEV-1)
- Down time > 5 mins
- Trigger PagerDuty
- Start mitigation bridge

## Escalation
- Engineering Lead: on-call
- Support: info-outreach@apexomnihub.icu

## Security Incidents
- Rotate all Supabase keys immediately.
- Disconnect edge functions if under attack.
- Escalate to security team.
