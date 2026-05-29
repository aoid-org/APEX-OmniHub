# APEX Security Protocols

**Reference Document - Load on security-related tasks**

---

## Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SECURITY PERIMETER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   GUARDIAN   │  │   TRIFORCE   │  │  ZERO-TRUST  │              │
│  │  Heartbeats  │  │   Policies   │  │   Registry   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┼─────────────────┘                       │
│                           │                                         │
│                    ┌──────▼──────┐                                  │
│                    │  MAN MODE   │                                  │
│                    │ (Human-in-  │                                  │
│                    │   Loop)     │                                  │
│                    └──────┬──────┘                                  │
│                           │                                         │
│         ┌─────────────────┼─────────────────┐                       │
│         │                 │                 │                       │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐              │
│  │    PROMPT    │  │     RLS      │  │    AUDIT     │              │
│  │   DEFENSE    │  │   POLICIES   │  │   LOGGING    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Guardian Heartbeat System

### Purpose
Detect stale processes, hung loops, and zombie connections.

### Implementation

```typescript
// src/guardian/heartbeat.ts

interface HeartbeatState {
  loopName: string;
  lastSeen: Date;
  ageMs: number;
  status: 'healthy' | 'stale' | 'dead';
}

const STALE_THRESHOLD_MS = 60_000;  // 1 minute
const DEAD_THRESHOLD_MS = 300_000;  // 5 minutes

const heartbeats = new Map<string, HeartbeatState>();

export function startHeartbeat(
  loopName: string,
  intervalMs: number = 30_000,
): () => void {
  // Prevent duplicate loops (idempotent)
  if (heartbeats.has(loopName)) {
    console.warn(`Heartbeat ${loopName} already running`);
    return () => {};
  }
  
  const beat = () => {
    heartbeats.set(loopName, {
      loopName,
      lastSeen: new Date(),
      ageMs: 0,
      status: 'healthy',
    });
  };
  
  beat(); // Initial beat
  const interval = setInterval(beat, intervalMs);
  
  // Return cleanup function
  return () => {
    clearInterval(interval);
    heartbeats.delete(loopName);
  };
}

export function getStatus(loopName: string): HeartbeatState | null {
  const state = heartbeats.get(loopName);
  if (!state) return null;
  
  const ageMs = Date.now() - state.lastSeen.getTime();
  let status: HeartbeatState['status'] = 'healthy';
  
  if (ageMs > DEAD_THRESHOLD_MS) {
    status = 'dead';
  } else if (ageMs > STALE_THRESHOLD_MS) {
    status = 'stale';
  }
  
  return { ...state, ageMs, status };
}

export function getAllStatuses(): HeartbeatState[] {
  return Array.from(heartbeats.keys()).map(name => getStatus(name)!);
}
```

### CLI Usage

```bash
npm run guardian:status
# Output:
# ┌──────────────┬─────────────┬────────┬──────────┐
# │ Loop Name    │ Last Seen   │ Age    │ Status   │
# ├──────────────┼─────────────┼────────┼──────────┤
# │ main-loop    │ 2s ago      │ 2000ms │ healthy  │
# │ cache-clean  │ 45s ago     │ 45000ms│ healthy  │
# │ health-check │ 90s ago     │ 90000ms│ stale    │
# └──────────────┴─────────────┴────────┴──────────┘
```

---

## MAN Mode (Manual Approval Node)

### Risk Classification

```python
# orchestrator/policies/man_policy.py

from enum import Enum
from dataclasses import dataclass
from typing import FrozenSet

class RiskLane(Enum):
    GREEN = "green"      # Auto-execute
    YELLOW = "yellow"    # Execute + audit
    RED = "red"          # Isolate + approve
    BLOCKED = "blocked"  # Never execute

# O(1) lookup sets (immutable)
BLOCKED_TOOLS: FrozenSet[str] = frozenset({
    'execute_sql_raw',
    'shell_execute',
    'eval_code',
    'system_command',
})

RED_TOOLS: FrozenSet[str] = frozenset({
    'delete_record',
    'delete_user',
    'transfer_funds',
    'send_email',
    'send_sms',
    'revoke_access',
    'modify_permissions',
})

YELLOW_PARAMS: FrozenSet[str] = frozenset({
    'password',
    'secret',
    'token',
    'api_key',
    'credit_card',
    'ssn',
})

@dataclass
class ActionIntent:
    tool: str
    params: dict
    context: dict

@dataclass
class RiskTriageResult:
    lane: RiskLane
    reason: str
    tool: str

def risk_triage(action: ActionIntent) -> RiskTriageResult:
    """
    Stateless risk classification.
    Performance: O(1) via frozenset lookups.
    """
    tool = action.tool.lower()
    
    # BLOCKED - Never execute
    if tool in BLOCKED_TOOLS:
        return RiskTriageResult(
            lane=RiskLane.BLOCKED,
            reason=f"Tool '{tool}' is permanently blocked",
            tool=tool,
        )
    
    # RED - Isolate and require approval
    if tool in RED_TOOLS:
        return RiskTriageResult(
            lane=RiskLane.RED,
            reason=f"Tool '{tool}' requires human approval",
            tool=tool,
        )
    
    # YELLOW - Check for sensitive params
    param_keys = set(k.lower() for k in action.params.keys())
    sensitive_params = param_keys & YELLOW_PARAMS
    if sensitive_params:
        return RiskTriageResult(
            lane=RiskLane.YELLOW,
            reason=f"Sensitive params detected: {sensitive_params}",
            tool=tool,
        )
    
    # GREEN - Auto-execute
    return RiskTriageResult(
        lane=RiskLane.GREEN,
        reason="Standard operation",
        tool=tool,
    )
```

### Database Schema

```sql
-- supabase/migrations/20260108120000_man_mode.sql

CREATE TABLE man_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT NOT NULL,
    action_intent JSONB NOT NULL,
    risk_triage JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Partial index for pending tasks (fast lookup)
CREATE INDEX idx_man_tasks_pending 
ON man_tasks (created_at DESC) 
WHERE status = 'pending';

-- GIN index for JSONB queries
CREATE INDEX idx_man_tasks_action_intent 
ON man_tasks USING GIN (action_intent);

-- RLS policies
ALTER TABLE man_tasks ENABLE ROW LEVEL SECURITY;

-- Admins can see all tasks
CREATE POLICY "Admins read all man_tasks"
ON man_tasks FOR SELECT
USING (auth.jwt() ->> 'role' = 'admin');

-- Admins can update (resolve) tasks
CREATE POLICY "Admins update man_tasks"
ON man_tasks FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');
```

---

## Prompt Injection Defense

### Pattern Matching Rules

```typescript
// src/security/promptDefenseConfig.ts

export interface DefenseRule {
  id: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'warn' | 'block';
  description: string;
}

export const DEFENSE_RULES: DefenseRule[] = [
  {
    id: 'IGNORE_RULES',
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(rules|instructions)/i,
    severity: 'critical',
    action: 'block',
    description: 'Attempt to override system instructions',
  },
  {
    id: 'SYSTEM_PROMPT_LEAK',
    pattern: /show\s+(me\s+)?(your|the)\s+(system\s+)?prompt/i,
    severity: 'high',
    action: 'block',
    description: 'Attempt to extract system prompt',
  },
  {
    id: 'ROLE_INJECTION',
    pattern: /you\s+are\s+(now\s+)?a?\s*(different|new|evil|unrestricted)/i,
    severity: 'high',
    action: 'block',
    description: 'Attempt to change AI role',
  },
  {
    id: 'JAILBREAK_DAN',
    pattern: /\bdan\b.*\bmode\b|\bdo\s+anything\s+now\b/i,
    severity: 'critical',
    action: 'block',
    description: 'DAN jailbreak attempt',
  },
  {
    id: 'INSTRUCTION_OVERRIDE',
    pattern: /disregard|forget|override|bypass|skip/i,
    severity: 'medium',
    action: 'warn',
    description: 'Potential instruction override attempt',
  },
  {
    id: 'CODE_INJECTION',
    pattern: /<script>|javascript:|on\w+\s*=/i,
    severity: 'high',
    action: 'block',
    description: 'XSS/code injection attempt',
  },
  {
    id: 'SQL_INJECTION',
    pattern: /('|"|;|\s)(or|and)\s+('|"|1|true)/i,
    severity: 'critical',
    action: 'block',
    description: 'SQL injection attempt',
  },
];
```

### Evaluation Function

```typescript
// src/security/promptDefense.ts

import { DEFENSE_RULES, DefenseRule } from './promptDefenseConfig';
import { auditLog } from './auditLog';

export interface EvaluationResult {
  blocked: boolean;
  sanitized: string;
  matchedRules: DefenseRule[];
}

export function evaluatePrompt(input: string): EvaluationResult {
  const matchedRules: DefenseRule[] = [];
  let blocked = false;
  
  for (const rule of DEFENSE_RULES) {
    if (rule.pattern.test(input)) {
      matchedRules.push(rule);
      
      if (rule.action === 'block') {
        blocked = true;
        auditLog.record({
          actionType: 'PROMPT_INJECTION_BLOCKED',
          resourceType: 'prompt',
          metadata: {
            ruleId: rule.id,
            severity: rule.severity,
            inputLength: input.length,
          },
        });
      }
    }
  }
  
  // Sanitize: remove potential injection patterns
  let sanitized = input;
  if (!blocked) {
    sanitized = input
      .replace(/<[^>]*>/g, '')  // Strip HTML
      .replace(/javascript:/gi, '')
      .trim();
  }
  
  return { blocked, sanitized, matchedRules };
}
```

---

## Zero-Trust Device Registry

### Device Fingerprinting

```typescript
// src/zero-trust/deviceRegistry.ts

interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  colorDepth: number;
  hardwareConcurrency: number;
}

interface RegisteredDevice {
  deviceId: string;
  userId: string;
  fingerprint: DeviceFingerprint;
  firstSeenAt: Date;
  lastSeenAt: Date;
  status: 'pending' | 'trusted' | 'suspicious' | 'blocked';
}

class DeviceRegistry {
  private devices = new Map<string, RegisteredDevice>();
  
  async register(userId: string): Promise<RegisteredDevice> {
    const fingerprint = this.captureFingerprint();
    const deviceId = await this.generateDeviceId(fingerprint);
    
    const existing = this.devices.get(deviceId);
    if (existing) {
      // Update last seen
      existing.lastSeenAt = new Date();
      return existing;
    }
    
    // New device - start as pending
    const device: RegisteredDevice = {
      deviceId,
      userId,
      fingerprint,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      status: 'pending',
    };
    
    this.devices.set(deviceId, device);
    
    // Audit log new device
    auditLog.record({
      actionType: 'DEVICE_REGISTERED',
      resourceType: 'device',
      resourceId: deviceId,
      metadata: { userId, status: 'pending' },
    });
    
    return device;
  }
  
  async verify(userId: string, deviceId: string): Promise<RegisteredDevice> {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      throw new SecurityError('Unknown device');
    }
    
    if (device.userId !== userId) {
      device.status = 'suspicious';
      auditLog.record({
        actionType: 'DEVICE_USER_MISMATCH',
        resourceType: 'device',
        resourceId: deviceId,
        metadata: { expectedUserId: device.userId, actualUserId: userId },
      });
      throw new SecurityError('Device-user mismatch');
    }
    
    if (device.status === 'blocked') {
      throw new SecurityError('Device is blocked');
    }
    
    device.lastSeenAt = new Date();
    return device;
  }
  
  private captureFingerprint(): DeviceFingerprint {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      colorDepth: screen.colorDepth,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
    };
  }
  
  private async generateDeviceId(fp: DeviceFingerprint): Promise<string> {
    const data = JSON.stringify(fp);
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const deviceRegistry = new DeviceRegistry();
```

---

## Audit Logging

### Event Types

```typescript
// src/security/auditLog.ts

type AuditActionType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_LOGIN_FAILED'
  | 'DEVICE_REGISTERED'
  | 'DEVICE_USER_MISMATCH'
  | 'DEVICE_BLOCKED'
  | 'PROMPT_INJECTION_BLOCKED'
  | 'CSRF_ATTEMPT'
  | 'RLS_VIOLATION'
  | 'MAN_TASK_CREATED'
  | 'MAN_TASK_APPROVED'
  | 'MAN_TASK_REJECTED'
  | 'DR_TEST_EXECUTED'
  | 'BACKUP_VERIFIED';

interface AuditEvent {
  id: string;
  timestamp: Date;
  actorId?: string;
  actionType: AuditActionType;
  resourceType: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
}

class AuditLog {
  private events: AuditEvent[] = [];
  private maxEvents = 10_000;
  
  record(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event,
    };
    
    this.events.push(auditEvent);
    
    // Trim if over limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // In production, also persist to Supabase
    if (import.meta.env.PROD) {
      this.persist(auditEvent);
    }
  }
  
  private async persist(event: AuditEvent): Promise<void> {
    // TODO: Persist to Supabase audit_logs table
  }
  
  query(filter: Partial<AuditEvent>): AuditEvent[] {
    return this.events.filter(e => {
      return Object.entries(filter).every(([key, value]) => {
        return e[key as keyof AuditEvent] === value;
      });
    });
  }
}

export const auditLog = new AuditLog();
```

---

## Security Checklist (Per Feature)

```
□ Input validation with Zod schema
□ RLS policy covers new table/operation
□ Audit logging for sensitive actions
□ CSRF token verified (if mutation)
□ Rate limiting considered
□ No secrets in code (env vars only)
□ No PII logged in production
□ Error messages don't leak internals
□ Tests cover security edge cases
□ Guardian heartbeat for long-running ops
```

---

**Document Status**: Reference Material
**Load When**: Security reviews, vulnerability fixes, compliance audits
