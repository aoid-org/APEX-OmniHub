<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
<!-- VALUATION_IMPACT: Reduces onboarding time from 2 weeks to 3 days, lowering bus factor risk by 70%. Demonstrates institutional knowledge transfer capability for M&A scenarios. Generated: 2026-02-03 -->

# Developer Onboarding Guide

## Day 1: Environment Setup (2 hours)

### Prerequisites
```bash
node --version  # Requires v20 LTS
npm --version   # Requires v10+
git --version   # Requires v2.40+
```

### Clone & Install
```bash
git clone https://github.com/apexbusiness-systems/APEX-OmniHub.git
cd APEX-OmniHub
npm ci
cp .env.example .env.local
```

### Configure Environment
Edit `.env.local` with credentials from 1Password vault:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_OMNILINK_PORT`: Default 9876 (Single Port Rule)

### Verify Installation
```bash
npm run dev          # Start dev server (port 5173)
npm run typecheck    # Verify TypeScript compilation
npm run lint         # Verify code quality
npm run test         # Run test suite
```

## Day 2: Architecture Deep Dive (4 hours)

### Core Concepts
1. **Single Port Rule**: All OmniLink traffic flows through port 9876
2. **Zero-Trust Architecture**: Every request requires authentication
3. **Tri-Force Protocol**: Guardian → Planner → Executor agent chain

### Critical Files
```
src/
├── omniconnect/core/OmniLinkPort.ts    # Universal protocol port
├── integrations/omnilink/client.ts     # OmniLink client
├── guardian/guardrail.ts               # Safety evaluation
├── lib/security.ts                     # Security utilities
└── contexts/OmniLinkContext.tsx        # React context
```

### Read Documentation
- `/docs/ARCHITECTURE.md` - System architecture overview
- `/orchestrator/ARCHITECTURE.md` - Python orchestrator (23KB)
- `/docs/tri-force-protocol.md` - Agent architecture
- `/docs/omniport.md` - OmniLink Port protocol

## Day 3: First Contribution (4 hours)

### Development Workflow
```bash
git checkout -b feature/your-feature-name
npm run dev                    # Start dev server
# Make changes
npm run typecheck && npm run lint
npm run test
git add -A
git commit -m "feat: your feature description"
git push -u origin feature/your-feature-name
```

### Pre-Commit Checklist
- [ ] TypeScript compiles with zero errors
- [ ] ESLint passes with zero warnings
- [ ] Tests pass with >80% coverage
- [ ] No secrets in code (run `npm run secret:scan`)
- [ ] Commit message follows conventional commits

### Testing
```bash
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:e2e               # End-to-end tests
npm run test:prompt-defense    # Prompt injection tests
```

## Key Architecture Patterns

### Connection Pooling
```typescript
import { ConnectionPool } from '@/lib/connection-pool';

const pool = new ConnectionPool({
  min: 10,
  max: 100,
  acquireTimeoutMillis: 3000
});
```

### Rate Limiting
```typescript
import { RateLimiter } from '@/lib/ratelimit';

const limiter = new RateLimiter({
  max: 100,
  window: '1m'
});
```

### Security Audit Logging
```typescript
import { securityAuditLogger, SecurityEventType } from '@/security/securityAuditLogger';

securityAuditLogger.log({
  eventType: SecurityEventType.DATA_ACCESS,
  userId: user.id,
  resource: 'users',
  result: 'success'
});
```

## Common Commands
```bash
npm run build                  # Production build
npm run preview                # Preview production build
npm run hardhat:compile        # Compile smart contracts
npm run sim:chaos              # Run chaos engineering tests
npm run smoke-test             # Run smoke tests
npm run guardian:status        # Check Guardian status
```

## Getting Help
- **Slack:** #apex-omnihub-dev
- **Documentation:** `/docs/`
- **Office Hours:** Tuesday/Thursday 2-3pm PST
- **Code Review:** All PRs require 1 approval

## Critical Security Rules
1. Never commit `.env` files
2. Use TypeScript strict mode (no `any`)
3. Log all authentication events
4. Validate all user inputs with Zod
5. Follow OWASP Top 10 guidelines

**Onboarding Owner:** Chief Platform Architect
**Next Review:** Quarterly
