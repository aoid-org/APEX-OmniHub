<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
# Incident Response Playbook

**Version:** 1.0.0
**Last Updated:** 2026-01-28

## 1. Severity Levels

| Level     | Severity | Criteria                                  | Response Time |
| --------- | -------- | ----------------------------------------- | ------------- |
| **SEV-1** | Critical | Service Down, Data Loss, Security Breach  | < 15 mins     |
| **SEV-2** | High     | Core Feature Broken, Performance Degraded | < 1 hour      |
| **SEV-3** | Medium   | Minor Bug, UI Issue, Non-Blocking         | < 4 hours     |
| **SEV-4** | Low      | Documentation, Typos, Suggestions         | < 24 hours    |

## 2. Response Workflow

### Phase 1: Detection & Triage

1.  **Alert Received**: OmniSentry, User Report, or Automated Monitoring.
2.  **Verify**: Confirm the issue is real (not a false positive).
3.  **Classify**: Assign Severity Level (SEV-1 to SEV-4).
4.  **Declare**: Open an Incident Ticket (Jira/Linear) and Slack Channel (`#inc-YYYYMMDD-name`).

### Phase 2: Containment & Mitigation

1.  **Rollback**: If caused by a recent deploy, immediate rollback (`vercel rollback`).
2.  **Isolate**: If security breach, revoke tokens, block IPs, or enable Maintenance Mode.
3.  **Communicate**: Update Status Page (`status.apexomnihub.icu`) with "Investigating".

### Phase 3: Resolution

1.  **Debug**: Use "One-Pass-Debug" protocol.
2.  **Fix**: Apply surgical fix.
3.  **verify**: Test in staging, then deploy to production.

### Phase 4: Post-Mortem

1.  **Review**: What happened? Why? How to prevent recurrence?
2.  **Action Items**: Create tasks to fix root cause and improve monitoring.
3.  **Report**: Publish internal (and external if public impact) report within 24 hours.

## 3. Contacts

- **Incident Commander**: CTO / Lead Engineer
- **Security Lead**: Security Officer
- **Support**: support@apexomnihub.icu
