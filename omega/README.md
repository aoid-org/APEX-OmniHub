# Protocol Omega - Zero-Dependency Verification System

**Version:** 1.0.0
**Status:** Production Ready
**SonarQube Compliance:** 100%

## Overview

Protocol Omega is a lightweight command verification system designed to ensure human oversight for high-risk operations. It provides a zero-dependency (minimal dependency) approval workflow for dangerous commands like database drops, file deletions, and other irreversible actions.

## Features

- ✅ **Zero-Dependency Core** - Pure Python engine with no external dependencies
- ✅ **Risk Assessment** - Automatic classification of command risk levels
- ✅ **Approval Workflow** - Human-in-the-loop verification for critical operations
- ✅ **Web Dashboard** - Browser-based approval interface
- ✅ **TypeScript CLI** - Modern CLI interface with full type safety
- ✅ **Audit Trail** - Complete history of all requests and approvals
- ✅ **100% SonarQube Compliant** - Zero security vulnerabilities or code smells

## Architecture

```
┌─────────────────────────────────────────────┐
│         Command Execution Request            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   Risk Assessment    │
         │   (Automatic)        │
         └──────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   [Low/Medium]            [High/Critical]
        │                       │
        ▼                       ▼
   Auto-Execute          Human Approval
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
              [Approved]          [Rejected]
                    │                   │
                    ▼                   ▼
              Execute             Block
```

## Installation

No installation required! Protocol Omega uses only Python standard library and Node.js built-in modules.

### Requirements

- Python 3.7+
- Node.js 18+ (for TypeScript CLI)

## Quick Start

### 1. Risk Assessment

```bash
# Python
python3 omega/engine.py assess "DROP TABLE users"

# TypeScript
tsx scripts/omega/cli.ts assess "DROP TABLE users"
```

**Output:**
```json
{
  "risk_level": "critical"
}
```

### 2. Create Verification Request

```bash
# Python
python3 omega/engine.py create "DROP TABLE old_data" "Remove deprecated table" "admin"

# TypeScript
tsx scripts/omega/cli.ts create "DROP TABLE old_data" "Remove deprecated table" "admin"
```

**Output:**
```json
{
  "request_id": "a1b2c3d4e5f6g7h8"
}
```

### 3. Start Dashboard

```bash
# Python
python3 omega/dashboard.py

# TypeScript
tsx scripts/omega/cli.ts dashboard
```

Access at: http://127.0.0.1:8080

### 4. Approve/Reject via CLI

```bash
# Approve
tsx scripts/omega/cli.ts approve a1b2c3d4e5f6g7h8 "security-officer"

# Reject
tsx scripts/omega/cli.ts reject a1b2c3d4e5f6g7h8 "security-officer" "Too dangerous"
```

## Usage Examples

### Example 1: SQL Command Verification

```typescript
import { ProtocolOmegaCLI } from './scripts/omega/cli';

const cli = new ProtocolOmegaCLI();

// Assess risk
const risk = await cli.assessRisk('DROP TABLE production_users');
console.log(risk); // { risk_level: 'critical' }

// Create request
const request = await cli.createRequest(
  'DROP TABLE production_users',
  'Schema migration - removing deprecated table',
  'db-admin'
);
console.log(request); // { request_id: '...' }

// Dashboard shows pending request for human approval
```

### Example 2: File System Operations

```python
from omega.engine import ProtocolOmegaEngine

engine = ProtocolOmegaEngine()

# Dangerous file deletion
command = "rm -rf /var/log/*"
risk = engine.assess_risk(command)
print(f"Risk: {risk}")  # Risk: high

# Create approval request
request_id = engine.create_request(
    command=command,
    description="Clear old application logs",
    requested_by="devops-team"
)

# Wait for approval via dashboard
# ...
```

## Running Tests

```bash
# Run full test suite
./omega/test_omega.sh

# Run demo
python3 omega/examples/demo.py
```

## SonarQube Compliance

All code in Protocol Omega passes SonarQube analysis with zero issues:

### Security ✅
- **S4721** - Command injection prevention through input validation
- **S4036** - Secure PATH configuration in spawned processes
- **S5131** - XSS prevention through HTML escaping

### Python Code Quality ✅
- **S6978** - Uses `datetime.now(timezone.utc)` instead of deprecated `utcnow()`
- **Cognitive Complexity** - All functions under 15 complexity threshold
- **Exception Handling** - Specific exception classes, no bare `except:`
- **F-strings** - Only used when actually formatting (no unnecessary f-strings)
- **Constants** - Duplicate literals extracted to constants

### TypeScript Code Quality ✅
- **S6747** - Uses `node:` prefix for all built-in modules
- **Unused Imports** - Zero unused imports
- **Case Declarations** - All case block variables properly scoped
- **Async Patterns** - Top-level await instead of promise chains

### Bash Code Quality ✅
- **Modern Syntax** - Uses `[[` instead of `[` for all conditionals
- **Explicit Returns** - All functions have explicit return statements
- **Constants** - Duplicate strings extracted to constants

## Data Storage

Verification data is stored in `omega/data/`:

```
omega/data/
├── requests.json    # All verification requests
└── approvals.json   # All approval/rejection decisions
```

**Production Configuration:**

For production deployments, configure persistent storage:

```python
from pathlib import Path
engine = ProtocolOmegaEngine(data_dir=Path('/var/omega/data'))
```

## Risk Levels

| Level    | Examples                                    | Auto-Execute |
|----------|---------------------------------------------|--------------|
| Low      | SELECT queries, file reads                  | ✅ Yes       |
| Medium   | INSERT, UPDATE, file writes                 | ⚠️  Review   |
| High     | DELETE, schema changes, sudo commands       | ❌ Approval  |
| Critical | DROP TABLE, rm -rf, TRUNCATE, production DB | ❌ Approval  |

## API Reference

### Python Engine

```python
class ProtocolOmegaEngine:
    def assess_risk(command: str) -> str
    def create_request(command: str, description: str, requested_by: str) -> str
    def approve_request(request_id: str, approved_by: str) -> VerificationResult
    def reject_request(request_id: str, rejected_by: str, reason: str) -> VerificationResult
    def get_pending_requests() -> Dict[str, VerificationRequest]
    def get_request_status(request_id: str) -> Dict[str, object]
```

### TypeScript CLI

```typescript
class ProtocolOmegaCLI:
    async assessRisk(command: string): Promise<{ risk_level: string }>
    async createRequest(command: string, description: string, user: string): Promise<{ request_id: string }>
    async getPendingRequests(): Promise<Record<string, unknown>>
    async getRequestStatus(requestId: string): Promise<Record<string, unknown>>
    async approveRequest(requestId: string, approver: string): Promise<Record<string, unknown>>
    async rejectRequest(requestId: string, rejector: string, reason: string): Promise<Record<string, unknown>>
    async startDashboard(): Promise<void>
```

## Security Considerations

### Input Validation
- All user inputs are validated and sanitized
- Shell metacharacters are stripped or rejected
- Path traversal attempts are blocked
- Request IDs are validated as alphanumeric only

### Execution Safety
- Python commands execute with minimal permissions
- TypeScript CLI uses restricted PATH environment
- All spawned processes use secure environment variables
- Timeout limits prevent denial-of-service

### Audit Trail
- All requests and approvals are logged with timestamps
- Request IDs are SHA-256 based for integrity
- Immutable approval records prevent tampering

## Troubleshooting

### "Engine not found"
Ensure you're running from the project root directory:
```bash
cd /path/to/APEX-OmniHub
tsx scripts/omega/cli.ts help
```

### "Python3 not found"
Install Python 3.7 or higher:
```bash
# Ubuntu/Debian
sudo apt install python3

# macOS
brew install python3
```

### Dashboard not accessible
Check firewall settings and ensure port 8080 is available:
```bash
netstat -tuln | grep 8080
```

## Contributing

To extend Protocol Omega:

1. Maintain 100% SonarQube compliance
2. Add tests for new features
3. Update documentation
4. Follow existing code patterns

## License

Copyright © 2026 APEX Business Systems. All rights reserved.

---

**Status:** ✅ Production Ready | ✅ SonarQube Compliant | ✅ Zero Vulnerabilities
