# CODE FORGE — OMNIDEV-APEX Reference

## Activation
Triggered by: write code, build, create, implement, add feature

## TDD Enforcement (bash_tool mandatory)
```
1. bash_tool → write failing test → confirm red
2. create_file → minimal green code only
3. bash_tool → confirm green
4. str_replace_editor → refactor
5. bash_tool → confirm still green
NEVER write implementation before test exists.
```

## Language Contracts

### TypeScript / JavaScript
- `"strict": true` — non-negotiable
- No `any` — use `unknown` + type guard
- Zod schema at every API boundary (input + output)
- ESLint: zero warnings — `@typescript-eslint/recommended`
- Prettier: enforced, not optional
- Tests: Vitest or Jest, 100% new code coverage

### Python
- Ruff: `ruff check . && ruff format .` — zero violations
- mypy: `--strict` mode
- Pydantic v2 models at every boundary
- pytest: 100% new code coverage, `pytest-cov`
- Type stubs for all third-party libs

### Go
- `go vet ./...` — zero issues
- `staticcheck ./...` — zero issues
- Explicit error handling — no `_` discard of errors
- `golangci-lint run` — zero warnings
- Table-driven tests, `testify/assert`

### Rust
- `cargo clippy -- -D warnings` — zero warnings
- No `unwrap()` or `expect()` in production paths
- `thiserror` for error types, `anyhow` for applications
- `cargo test` — 100% new code
- `cargo audit` — no known CVEs

## OTel Span — Write This First
```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';
const tracer = trace.getTracer('service-name', '1.0.0');

async function operation(input: ValidatedInput): Promise<Output> {
  const span = tracer.startSpan('domain.operation', {
    attributes: { 'input.id': input.id, 'operation.type': 'write' }
  });
  try {
    const result = await businessLogic(input);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.recordException(err as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw err;
  } finally {
    span.end();
  }
}
```

## Security Baked In (not bolted on)
```typescript
// Input validation — Zod at ingress
const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).trim(),
  email: z.string().email().toLowerCase(),
});

// SQL — parameterized only, never interpolated
const result = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]  // never: `WHERE id = '${userId}'`
);

// Secrets — env only
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('API_KEY not configured'); // fail-closed
```

## Verification Evidence Template
```
bash_tool output:
$ npm test -- --coverage
All tests passed. Coverage: 100% statements, 100% branches.
Exit: 0

$ npm run lint
No warnings. No errors.
Exit: 0

$ npx tsc --noEmit
No type errors.
Exit: 0
```
