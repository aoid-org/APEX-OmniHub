# MAN Mode

**Manual Authorization Needed**

---

## Overview

MAN Mode (Manual Authorization Needed) is APEX OmniHub's intelligent human-in-the-loop mechanism for high-risk operations. Unlike traditional approval systems that block entire workflows, MAN Mode allows processes to continue seamlessly while flagging specific items for human review. This ensures both operational velocity and appropriate human oversight.

**The Philosophy:** Automation accelerates business, but critical decisions require human judgment. MAN Mode gives you the best of both worlds.

## How MAN Mode Works

### The MAN Mode Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow Execution                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Risk Assessment │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        ┌──────────────┐          ┌──────────────────┐
        │  Low Risk    │          │  High Risk       │
        │  Auto-Approve│          │  MAN Mode        │
        └──────────────┘          └──────────────────┘
                │                           │
                │                           ▼
                │                 ┌──────────────────┐
                │                 │ Skip & Continue  │
                │                 │ Add to Queue     │
                │                 │ Notify User      │
                │                 └──────────────────┘
                │                           │
                └───────────┬───────────────┘
                            ▼
                   ┌─────────────────┐
                   │ Manual Review   │
                   │ (Async)         │
                   └─────────────────┘
                            │
                ┌───────────┴──────────┐
                ▼                      ▼
        ┌─────────────┐        ┌─────────────┐
        │  Approved   │        │  Rejected   │
        └─────────────┘        └─────────────┘
                │                      │
                ▼                      ▼
        ┌─────────────┐        ┌─────────────┐
        │  Execute    │        │  Archive    │
        │  Action     │        │  & Log      │
        └─────────────┘        └─────────────┘
```

### Key Features

#### High-Risk Items Are Flagged, Not Blocked

Traditional approval workflows stop everything when they encounter an item requiring approval. This creates bottlenecks and delays.

**MAN Mode Difference:**
- Workflow continues execution
- Risky item is marked for review
- All other operations complete normally
- No waiting for approval to proceed

**Example:**
```
Workflow: Customer Onboarding
├─ Create customer record ✓ (completed)
├─ Setup billing account ✓ (completed)
├─ Grant system access ⚠ (MAN Mode - pending review)
├─ Send welcome email ✓ (completed)
└─ Add to CRM ✓ (completed)

Status: 4/5 completed, 1 pending manual review
Workflow: NOT blocked
```

#### Workflow Continues with Zero Interruption

The workflow engine intelligently routes around items in MAN Mode:

**Dependency Handling:**
- Operations that don't depend on MAN Mode items proceed normally
- Dependent operations are deferred until approval
- Workflow completes with partial success status
- Clear reporting of pending items

**Partial Completion:**
- Most operations complete successfully
- Business value delivered immediately
- Only high-risk items wait for approval
- Workflow can be fully completed later

#### User Notified for Manual Review

Users are immediately notified when items require their attention:

**Notification Channels:**
- In-app notifications
- Email alerts with action links
- Slack/Teams integration
- SMS for critical items (configurable)
- Webhook callbacks to external systems

**Notification Content:**
- Clear description of item requiring approval
- Risk assessment and reasoning
- Recommended action (approve/reject)
- Direct link to approval interface
- Timeout information

#### Full Audit Trail Maintained

Every MAN Mode operation is completely logged:

**Audit Information:**
- Why was item flagged (risk score, policy match)
- When was it flagged (timestamp)
- Who was notified (users/channels)
- When was it reviewed (approval timestamp)
- Who approved/rejected (user identity)
- Decision rationale (required comment)
- Final outcome (executed or archived)

## Risk Assessment

### Configurable Risk Thresholds

Define what constitutes "high-risk" for your organization:

```yaml
risk-policies:
  financial-transactions:
    - condition: amount > 10000
      risk-level: high
      man-mode: required
      approvers: [finance-team, cfo]
    - condition: amount > 1000 && customer.new == true
      risk-level: medium
      man-mode: required
      approvers: [finance-team]

  data-access:
    - condition: scope includes "pii" && environment == "production"
      risk-level: high
      man-mode: required
      approvers: [security-team, data-owner]

  infrastructure:
    - condition: action == "delete" && resource == "production"
      risk-level: critical
      man-mode: required
      approvers: [sre-lead, engineering-director]
      multi-party-approval: true
```

### Dynamic Risk Scoring

MAN Mode uses machine learning to assess risk dynamically:

**Factors Considered:**
- Historical patterns (is this unusual?)
- User behavior (out of character?)
- Time of day (middle of the night?)
- Location (unexpected geography?)
- Velocity (too fast?)
- Amount (unusually high value?)
- Combination of factors (multiple red flags?)

**Learning & Adaptation:**
- Risk models improve with each decision
- False positive reduction over time
- Context-aware scoring
- Organization-specific baselines

### Risk Categories

**Financial Risk:**
- Large transactions
- Unusual payment patterns
- New vendor payments
- Cross-border transfers

**Security Risk:**
- Privileged access requests
- Data export operations
- Configuration changes
- Production deployments

**Compliance Risk:**
- PII/PHI data access
- Regulatory reporting
- Audit log modifications
- Policy violations

**Operational Risk:**
- Production infrastructure changes
- Service disruptions
- Mass operations (bulk delete, etc.)
- Reversible actions

## Approval Workflows

### Single Approver

Simple approval for standard high-risk items:

```yaml
approval:
  type: single
  approvers:
    - role: finance-manager
  timeout: 24h
  auto-reject-on-timeout: false
```

### Multi-Party Approval

Critical operations require multiple approvers:

```yaml
approval:
  type: multi-party
  required-approvals: 2
  approvers:
    - role: cfo
    - role: ceo
    - role: board-member
  approval-mode: any-2-of-3
  timeout: 48h
```

### Escalation

Automatic escalation for time-sensitive items:

```yaml
approval:
  primary-approver: team-lead
  escalation:
    - after: 4h
      to: department-head
    - after: 12h
      to: director
    - after: 24h
      to: vp
  urgent: true
```

### Delegation

Approvers can delegate authority:

```yaml
delegation:
  enabled: true
  deputy-approvers:
    - user: jane.doe
      delegate-to: john.smith
      valid-until: 2024-12-31
      scope: financial-transactions
```

## User Interface

### Approval Queue

Dedicated interface for reviewing MAN Mode items:

**Features:**
- Filterable by risk level, age, category
- Sortable by priority, amount, risk score
- Bulk operations (approve/reject multiple)
- Search across all pending items
- Export to CSV/JSON

**Information Display:**
- Risk score and reasoning
- Full context of the operation
- Related workflow information
- Historical similar items and decisions
- Recommendations based on patterns

### Mobile Access

Review and approve items from mobile devices:

- Native iOS and Android apps
- Biometric authentication
- Push notifications
- Quick approve/reject actions
- Full detail view

### Slack/Teams Integration

Approve directly from chat:

```
OmniHub Bot:
⚠️ MAN Mode Approval Required

Transaction: Wire transfer to new vendor
Amount: $25,000
Risk: High (new vendor, large amount)
Requested by: john.doe@company.com

/approve man-12345 "Vendor verified by procurement"
/reject man-12345 "Need additional documentation"
/details man-12345
```

## Timeout Policies

### Auto-Reject

Items automatically rejected after timeout:

```yaml
timeout-policy:
  type: auto-reject
  duration: 48h
  notification:
    - at: 24h
    - at: 40h
    - at: 47h
```

### Auto-Approve (Safe Default)

Low-risk items approved if not reviewed:

```yaml
timeout-policy:
  type: auto-approve
  duration: 72h
  conditions:
    - risk-level: medium
    - amount < 5000
```

### Escalate

Pass to higher authority:

```yaml
timeout-policy:
  type: escalate
  duration: 24h
  escalate-to: management-team
```

### Pause Workflow

Hold workflow until reviewed:

```yaml
timeout-policy:
  type: pause
  duration: infinite
  notification: daily-digest
```

## Analytics & Reporting

### Approval Metrics

Track MAN Mode effectiveness:

- **Approval Rate**: % of items approved vs rejected
- **Average Review Time**: How long approvals take
- **False Positive Rate**: Items flagged unnecessarily
- **False Negative Rate**: Risky items not flagged
- **Timeout Rate**: Items reaching timeout

### Risk Distribution

Understand your risk profile:

- Volume by risk category
- Risk score distribution
- Trend analysis over time
- Seasonal patterns

### Approver Performance

Monitor reviewer efficiency:

- Reviews per approver
- Average decision time
- Approval/rejection ratios
- Quality of decisions (post-review analysis)

## Integration Examples

### Financial System

```yaml
workflow: expense-approval
steps:
  - id: validate-expense
    adapter: expense-system
  - id: check-policy
    adapter: policy-engine
  - id: approve-expense
    adapter: financial-system
    man-mode:
      enabled: true
      threshold: amount > 1000
      approvers: [manager, finance]
      reason: "Large expense requires approval"
```

### Infrastructure Change

```yaml
workflow: production-deployment
steps:
  - id: run-tests
    adapter: ci-system
  - id: deploy-to-staging
    adapter: kubernetes
  - id: deploy-to-production
    adapter: kubernetes
    man-mode:
      enabled: true
      threshold: always
      approvers: [sre-lead, engineering-manager]
      multi-party: true
      reason: "Production deployment requires SRE approval"
```

### Data Access

```yaml
workflow: data-export
steps:
  - id: validate-request
    adapter: access-control
  - id: export-data
    adapter: database
    man-mode:
      enabled: true
      threshold: contains_pii == true
      approvers: [data-owner, compliance-officer]
      reason: "PII export requires compliance approval"
```

## Best Practices

### Defining Risk Thresholds

1. **Start Conservative**: Flag more items initially, relax over time
2. **Use Data**: Analyze false positives to refine rules
3. **Context Matters**: Same action may have different risk in different contexts
4. **Document Rationale**: Explain why thresholds are set

### Managing Approvers

1. **Distribute Load**: Don't bottleneck on single approver
2. **Set Expectations**: Clear SLAs for approval turnaround
3. **Enable Delegation**: Allow deputies during PTO
4. **Monitor Burnout**: Track approval fatigue

### Notification Strategy

1. **Right Channel**: Critical items via SMS, routine via email
2. **Batching**: Group non-urgent items into digest
3. **Actionable**: Include approve/reject links
4. **Context**: Provide enough info to decide

### Continuous Improvement

1. **Review False Positives**: Adjust thresholds monthly
2. **Analyze Patterns**: Look for systemic issues
3. **User Feedback**: Survey approvers on effectiveness
4. **Automation**: Gradually automate low-risk approvals

## Security Considerations

- All approvals require MFA
- Approval decisions are immutable (audit log)
- Time-limited approval sessions
- IP restrictions for sensitive approvals
- Video verification for critical operations

## Support

For MAN Mode configuration and support:

- Documentation: [/docs/man-mode](https://apexomnihub.icu/docs/man-mode)
- Configuration Guide: [/docs/man-mode/configuration](https://apexomnihub.icu/docs/man-mode/configuration)
- Community Forum: [community.apexomnihub.icu](https://community.apexomnihub.icu)
- Enterprise Support: support@apexomnihub.icu

---

**Related Documentation:**
- [Fortress Protocol](./fortress-protocol.md)
- [Workflow Design](../guides/workflow-design.md)
- [Risk Assessment](../guides/risk-assessment.md)
- [Approval Workflows](../guides/approval-workflows.md)
