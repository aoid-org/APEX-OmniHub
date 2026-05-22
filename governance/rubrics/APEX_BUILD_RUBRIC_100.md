# APEX Build Rubric: 100 Point Score

Use this rubric before approving RFCs, architecture reviews, AI-generated code, or production-impacting PRs.

| Category | Points |
|---|---:|
| Exact user and workflow identified | 10 |
| Pain and current workaround validated | 10 |
| Scope boundaries clear | 10 |
| Domain ownership clear | 10 |
| No god object or hidden coupling | 10 |
| Contracts typed and documented | 10 |
| Observability complete | 10 |
| Rollback path executable | 10 |
| Security and permission model clear | 10 |
| Regression and overload resistance addressed | 10 |

## Approval Thresholds

- 100: Approved
- 90-99: Approved only with explicit reviewer acceptance
- 80-89: Changes required
- Below 80: Rejected

## Hard Fail Overrides

Any of the following forces rejection regardless of score:
- uncontrolled AI mutation
- no rollback path
- no observability
- god object introduced
- unclear ownership
- cross-domain database write without architecture approval
