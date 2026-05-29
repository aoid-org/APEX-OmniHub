# APEX Architecture Deep Dive

**Reference Document - Load on explicit need only**

---

## Canonical Data Model (CDM)

The APEX ecosystem uses a universal event schema that works across TypeScript frontend and Python orchestrator:

### Event Types

```python
# orchestrator/models/events.py

@dataclass
class EventEnvelope:
    """Universal event wrapper"""
    id: str                    # UUID
    timestamp: datetime        # ISO 8601
    event_type: str           # GoalReceived, PlanGenerated, etc.
    payload: Dict[str, Any]   # Event-specific data
    correlation_id: str       # Links related events
    
# Core Event Types:
# - GoalReceived: User intent capture
# - PlanGenerated: LLM planning output
# - ToolExecuted: Action execution record
# - GoalCompleted: Terminal success state
# - GoalFailed: Terminal failure state
```

### TypeScript Contract

```typescript
// src/types/events.ts

interface EventEnvelope<T = unknown> {
  id: string;
  timestamp: string;  // ISO 8601
  eventType: EventType;
  payload: T;
  correlationId: string;
}

type EventType = 
  | 'GOAL_RECEIVED'
  | 'PLAN_GENERATED'
  | 'TOOL_EXECUTED'
  | 'GOAL_COMPLETED'
  | 'GOAL_FAILED';
```

---

## Temporal.io Workflow Patterns

### Saga Pattern Implementation

```python
# orchestrator/workflows/agent_saga.py

@workflow.defn
class AgentSagaWorkflow:
    """
    Event-sourced workflow with LIFO compensation.
    Survives process crashes via Temporal durable execution.
    """
    
    @workflow.run
    async def run(self, goal: Goal) -> GoalResult:
        events: List[EventEnvelope] = []
        compensation_stack: List[CompensationStep] = []
        
        # Emit: GoalReceived
        events.append(self._create_event('GOAL_RECEIVED', goal))
        
        # Generate plan via LLM
        plan = await workflow.execute_activity(
            generate_plan,
            goal,
            start_to_close_timeout=timedelta(seconds=60),
        )
        events.append(self._create_event('PLAN_GENERATED', plan))
        
        try:
            for step in plan.steps:
                # Risk triage (MAN Mode)
                triage = await workflow.execute_activity(
                    risk_triage,
                    step,
                    start_to_close_timeout=timedelta(seconds=5),
                )
                
                if triage.lane == 'BLOCKED':
                    raise ApplicationError(f"Blocked tool: {step.tool}")
                
                if triage.lane == 'RED':
                    # Isolate, don't block workflow
                    await workflow.execute_activity(
                        create_man_task,
                        step,
                        start_to_close_timeout=timedelta(seconds=10),
                    )
                    events.append(self._create_event('TOOL_ISOLATED', step))
                    continue  # Non-blocking
                
                # Execute tool
                result = await workflow.execute_activity(
                    execute_tool,
                    step,
                    start_to_close_timeout=timedelta(seconds=30),
                    retry_policy=RetryPolicy(
                        initial_interval=timedelta(seconds=1),
                        maximum_interval=timedelta(seconds=60),
                        maximum_attempts=3,
                    ),
                )
                
                events.append(self._create_event('TOOL_EXECUTED', result))
                compensation_stack.append(step.compensation)
            
            events.append(self._create_event('GOAL_COMPLETED', {}))
            return GoalResult(status='completed', events=events)
            
        except Exception as e:
            # LIFO compensation
            for comp in reversed(compensation_stack):
                await workflow.execute_activity(
                    compensate,
                    comp,
                    start_to_close_timeout=timedelta(seconds=30),
                )
            
            events.append(self._create_event('GOAL_FAILED', {'error': str(e)}))
            raise
```

### Continue-As-New Pattern

Prevents unbounded workflow history:

```python
@workflow.run
async def run(self, state: WorkflowState) -> WorkflowResult:
    if len(state.events) > 1000:
        # Checkpoint and restart with fresh history
        workflow.continue_as_new(state.checkpoint())
    
    # Normal execution...
```

---

## Semantic Caching (70% Cost Reduction)

### How It Works

```python
# orchestrator/infrastructure/cache.py

class SemanticCache:
    """
    Cache LLM responses by semantic similarity.
    Uses Redis HNSW for vector search.
    """
    
    def __init__(self, redis_client, embedding_model):
        self.redis = redis_client
        self.embedder = embedding_model  # all-MiniLM-L6-v2
        self.similarity_threshold = 0.85
    
    async def get(self, query: str) -> Optional[CachedPlan]:
        # 1. Extract entities (dates, locations, amounts)
        entities = self._extract_entities(query)
        
        # 2. Create generic template
        template = self._create_template(query, entities)
        
        # 3. Compute embedding
        embedding = self.embedder.encode(template)
        
        # 4. HNSW search in Redis
        results = await self.redis.ft_search(
            index='plans',
            query=f'*=>[KNN 5 @embedding $vec AS score]',
            query_params={'vec': embedding.tobytes()},
        )
        
        # 5. Check similarity threshold
        if results and results[0].score > self.similarity_threshold:
            cached = results[0]
            # 6. Inject current entities into cached plan
            return self._hydrate(cached.plan, entities)
        
        return None
    
    def _extract_entities(self, text: str) -> Dict[str, str]:
        """Regex-based NER for common entity types"""
        entities = {}
        
        # Dates
        date_match = re.search(r'\d{4}-\d{2}-\d{2}', text)
        if date_match:
            entities['DATE'] = date_match.group()
        
        # Amounts
        amount_match = re.search(r'\$[\d,]+(?:\.\d{2})?', text)
        if amount_match:
            entities['AMOUNT'] = amount_match.group()
        
        # Emails
        email_match = re.search(r'\b[\w.-]+@[\w.-]+\.\w+\b', text)
        if email_match:
            entities['EMAIL'] = email_match.group()
        
        return entities
```

---

## Supabase Integration Patterns

### RLS (Row Level Security) Policies

```sql
-- supabase/migrations/xxx_rls_policies.sql

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Service role bypasses RLS for admin operations
-- (Use sparingly, audit all usage)
```

### Edge Function Pattern

```typescript
// supabase/functions/health/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    
    // Health check query
    const { data, error } = await supabase
      .from('health_checks')
      .insert({ timestamp: new Date().toISOString() })
      .select()
      .single();
    
    if (error) throw error;
    
    return new Response(
      JSON.stringify({ status: 'healthy', timestamp: data.timestamp }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ status: 'unhealthy', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
```

---

## Web3 Integration Patterns

### SIWE (Sign-In with Ethereum)

```typescript
// src/lib/web3/siwe.ts

import { SiweMessage } from 'siwe';

export async function createSiweMessage(
  address: string,
  chainId: number,
  nonce: string,
): Promise<SiweMessage> {
  return new SiweMessage({
    domain: window.location.host,
    address,
    statement: 'Sign in with Ethereum to APEX OmniHub',
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
  });
}

export async function verifySiweMessage(
  message: SiweMessage,
  signature: string,
): Promise<boolean> {
  try {
    const result = await message.verify({ signature });
    return result.success;
  } catch {
    return false;
  }
}
```

### Smart Contract Interaction Pattern

```typescript
// src/lib/web3/contracts.ts

import { ethers } from 'ethers';

// Type-safe contract interface
interface ApexNFTContract {
  mint(to: string, tokenURI: string): Promise<ethers.ContractTransaction>;
  ownerOf(tokenId: number): Promise<string>;
  balanceOf(owner: string): Promise<ethers.BigNumber>;
}

export async function getApexNFTContract(
  provider: ethers.providers.Provider,
): Promise<ApexNFTContract> {
  const abi = [/* ABI from compilation */];
  const address = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
  
  return new ethers.Contract(address, abi, provider) as unknown as ApexNFTContract;
}
```

---

## OmniLink Integration Protocol

### Event Bus Pattern

```typescript
// src/lib/omnilink/events.ts

interface OmniLinkEvent {
  type: string;
  source: string;  // App identifier
  target?: string; // Specific app or 'broadcast'
  payload: unknown;
  correlationId: string;
  timestamp: string;
}

class OmniLinkEventBus {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<(event: OmniLinkEvent) => void>> = new Map();
  
  async connect(): Promise<void> {
    this.ws = new WebSocket(import.meta.env.VITE_OMNILINK_WS_URL);
    
    this.ws.onmessage = (msg) => {
      const event: OmniLinkEvent = JSON.parse(msg.data);
      const handlers = this.handlers.get(event.type);
      handlers?.forEach(h => h(event));
    };
  }
  
  emit(event: Omit<OmniLinkEvent, 'timestamp'>): void {
    this.ws?.send(JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
    }));
  }
  
  on(eventType: string, handler: (event: OmniLinkEvent) => void): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => this.handlers.get(eventType)?.delete(handler);
  }
}

export const omnilink = new OmniLinkEventBus();
```

---

## Chaos Engineering Configuration

### Deterministic Chaos Parameters

| Parameter | Default | Light | Heavy | None |
|-----------|---------|-------|-------|------|
| Duplicate Rate | 15% | 5% | 25% | 0% |
| Out-of-Order Rate | 10% | 3% | 20% | 0% |
| Timeout Rate | 5% | 2% | 15% | 0% |
| Network Failure Rate | 3% | 1% | 10% | 0% |

### Guard Rails (Production Protection)

```typescript
// tests/chaos/guard-rails.ts

export function validateChaosEnvironment(): void {
  const checks = [
    {
      name: 'SIM_MODE',
      check: () => process.env.SIM_MODE === 'true',
      error: 'SIM_MODE must be true for chaos tests',
    },
    {
      name: 'SANDBOX_TENANT',
      check: () => !!process.env.SANDBOX_TENANT,
      error: 'SANDBOX_TENANT must be set',
    },
    {
      name: 'NO_PRODUCTION_URL',
      check: () => !process.env.API_URL?.includes('prod'),
      error: 'Cannot run chaos tests against production',
    },
  ];
  
  for (const { name, check, error } of checks) {
    if (!check()) {
      console.error(`❌ Guard rail failed: ${name}`);
      console.error(`   ${error}`);
      process.exit(1);
    }
  }
}
```

---

**Document Status**: Reference Material
**Load When**: Architecture decisions, deep debugging, new developer onboarding
