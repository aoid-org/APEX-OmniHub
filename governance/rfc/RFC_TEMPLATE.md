# RFC: <Title>

Status: Draft | Review | Approved | Rejected | Superseded
Owner: <Name>
Date: <YYYY-MM-DD>
Related Tickets: <Links>
Affected Domains: <Domains>

---

## 1. Problem

What problem exists?

## 2. Exact User

Who is this for?

## 3. Workflow

What workflow is being improved?

## 4. Current Pain

What pain exists today?

## 5. Current Workaround

How does the user solve this today?

## 6. Proposed Change

What are we changing?

## 7. Business Capability

Which business capability does this support?

Examples:
- Identity
- Payments
- Analytics
- League Operations
- Broadcast
- Commerce
- Notifications
- Admin Operations

## 8. Ownership Boundary

What domain owns this?
What domains may call this?
What domains may not call this?

## 9. Data Flow

Describe input, processing, persistence, emitted events, and output.

## 10. Contracts

List API schemas, event schemas, database contracts, and permission contracts.

## 11. Failure Modes

What can fail?
How does the system degrade?
Who is alerted?

## 12. Observability

Required:
- logs
- metrics
- tracing
- audit events
- health checks
- cost visibility

## 13. Rollback Strategy

How do we safely reverse this change?

## 14. Security Impact

Authentication, authorization, secrets, PII, auditability, data retention.

## 15. Scalability Impact

Expected load, concurrency, storage growth, queue growth, rate limits.

## 16. AI Impact

Does AI read, write, decide, recommend, automate, or mutate state?
If yes, define permissions, audit trail, rollback, and human override.

## 17. IN SCOPE

- <Item>

## 18. OUT OF SCOPE

- <Item>

## 19. Success Metrics

Define measurable success.

## 20. Architecture Review Checklist

- [ ] No god object introduced
- [ ] Domain boundary preserved
- [ ] Cross-domain database writes avoided
- [ ] Contracts documented
- [ ] Rollback path defined
- [ ] Observability defined
- [ ] Failure modes defined
- [ ] Security impact reviewed
- [ ] Performance impact reviewed
- [ ] Scope boundaries explicit
- [ ] User workflow improvement clear

## 21. Approval

Product Owner: <Name / Date>
Architecture Reviewer: <Name / Date>
Security Reviewer: <Name / Date if required>
Operations Reviewer: <Name / Date if required>
