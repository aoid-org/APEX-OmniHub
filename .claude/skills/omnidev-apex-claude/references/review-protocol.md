# REVIEW PROTOCOL — OMNIDEV-APEX Reference

## Pre-Ship Checklist (every PR, zero exceptions)
- [ ] Tests written BEFORE code (TDD — bash_tool proves RED first)
- [ ] 100% coverage on new code (bash_tool captures report)
- [ ] Zero linter warnings (tsc --noEmit | eslint | ruff | go vet)
- [ ] Security scan clean — zero high/crit (npm audit + semgrep + trivy)
- [ ] OTel spans on all new I/O boundaries
- [ ] Breaking changes: flagged with migration path in PR description
- [ ] Rollback plan documented
- [ ] ADR updated if architecture changed
- [ ] SBOM updated if dependencies changed

## Review Evidence Template
```
bash_tool captures — attach to PR:

$ npx tsc --noEmit            → Exit 0 (zero errors)
$ npx eslint . --max-warnings 0 → Exit 0 (zero warnings)
$ npm test -- --coverage      → Exit 0 | Coverage: 100% new code
$ npm audit --audit-level=high → Exit 0 (no high/crit)
$ semgrep --config=auto --error . → Exit 0 (no findings)
$ npm run build               → Exit 0 (build succeeds)
$ git rev-parse HEAD          → <commit SHA>
```

## Code Review Lens (in order)
1. **Correctness** — does it do what the spec says?
2. **Security** — injection, auth, secrets, OWASP Top 10
3. **Observability** — OTel spans on every I/O?
4. **Tests** — TDD enforced? Coverage 100% new code?
5. **Complexity** — cognitive complexity < 15? Can a new engineer read this?
6. **Performance** — N+1 queries? Unbounded loops? Missing index?
7. **IP** — novel algorithm? Document in ip-registry.
