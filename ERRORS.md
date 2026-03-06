build-and-test
failed now in 1m 11s
Search logs
2s
2s
2s
1s
3s
1s
49s
0s
0s
8s
Run npm run lint

> apex-omnihub@1.3.9 lint
> eslint .


/home/runner/work/APEX-OmniHub/APEX-OmniHub/tests/omnidash/zindex-manager.stress.spec.ts
Error:   182:9  error  'layouts' is never reassigned. Use 'const' instead  prefer-const

✖ 1 problem (1 error, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.

Error: Process completed with exit code 1.


=================================================================================================================================================================================================================================




Production Readiness Summary
failed 1 minute ago in 3s
Search logs
0s
0s
Run if [ "failure" != "success" ] || \
❌ Production readiness gate FAILED
Quality Gates: failure
Security Gates: success
Smoke Tests: skipped
Error: Process completed with exit code 1.




=================================================================================================================================================================================================================================



Quality Gates
failed 1 minute ago in 1m 1s
Search logs
2s
3s
3s
1s
42s
1s
8s
Run npx eslint . --max-warnings 0

/home/runner/work/APEX-OmniHub/APEX-OmniHub/tests/omnidash/zindex-manager.stress.spec.ts
Error:   182:9  error  'layouts' is never reassigned. Use 'const' instead  prefer-const

✖ 1 problem (1 error, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.

Error: Process completed with exit code 1.




=================================================================================================================================================================================================================================




Skip to content
apexbusiness-systems
APEX-OmniHub
Repository navigation
Code
Issues
Pull requests
2
 (2)
Actions
Projects
Wiki
Security
3
 (3)
Insights
Settings
Back to pull request #722
feat(omnidash): implement Spatial 2D Canvas Architecture v6.1.0 #1804
All jobs
Run details
Annotations
2 errors
Code Quality Gates
failed 1 minute ago in 1m 35s
Search logs
1s
2s
6s
40s
1s
0s
42s
stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Shield - Zero-Trust Gate > should allow unknown devices but flag them
[OmniPort] [test-correlation-id-000017] [0ms] INGEST_ACCEPTED {"latencyMs":0,"riskLane":"GREEN"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Shield - Zero-Trust Gate > should handle voice input without userId gracefully
[OmniPort] Engine initialized

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Shield - Zero-Trust Gate > should handle voice input without userId gracefully
[OmniPort] [test-correlation-id-000019] [0ms] INGEST_START {"type":"voice"}
[OmniPort] [test-correlation-id-000019] [0ms] NO_USER_ID {"type":"voice"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Shield - Zero-Trust Gate > should handle voice input without userId gracefully
[OmniPort] [test-correlation-id-000019] [0ms] INGEST_ACCEPTED {"latencyMs":0,"riskLane":"GREEN"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should write to DLQ on delivery failure and return buffered status
[OmniPort] Engine initialized

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should write to DLQ on delivery failure and return buffered status
[OmniPort] [test-correlation-id-00001b] [0ms] INGEST_START {"type":"text"}
[OmniPort] [test-correlation-id-00001b] [0ms] ZERO_TRUST_PASS {"deviceId":"550e8400-e29b-41d4-a716-446655440000","status":"trusted"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should write to DLQ on delivery failure and return buffered status
[OmniPort] [test-correlation-id-00001b] [1ms] DLQ_WRITE_SUCCESS {"riskScore":0}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should write to DLQ on delivery failure and return buffered status
[OmniPort] [test-correlation-id-00001b] [1ms] DELIVERY_FAILED_BUFFERED {"latencyMs":1,"error":"Delivery service unavailable"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should calculate higher risk score for RED lane failures
[OmniPort] Engine initialized

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should calculate higher risk score for RED lane failures
[OmniPort] [test-correlation-id-00001d] [0ms] INGEST_START {"type":"text"}
[OmniPort] [test-correlation-id-00001d] [0ms] ZERO_TRUST_PASS {"deviceId":"550e8400-e29b-41d4-a716-446655440000","status":"trusted"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should calculate higher risk score for RED lane failures
[OmniPort] [test-correlation-id-00001d] [0ms] MAN_MODE_TRIGGERED {"intents":["delete"]}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should calculate higher risk score for RED lane failures
[OmniPort] [test-correlation-id-00001d] [0ms] DLQ_WRITE_SUCCESS {"riskScore":80}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should calculate higher risk score for RED lane failures
[OmniPort] [test-correlation-id-00001d] [0ms] DELIVERY_FAILED_BUFFERED {"latencyMs":0,"error":"Network error"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should calculate higher risk score for webhook failures
[OmniPort] Engine initialized

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should calculate higher risk score for webhook failures
[OmniPort] [test-correlation-id-00001f] [0ms] INGEST_START {"type":"webhook"}
[OmniPort] [test-correlation-id-00001f] [0ms] ZERO_TRUST_PASS {"deviceId":"550e8400-e29b-41d4-a716-446655440002","status":"trusted"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should calculate higher risk score for webhook failures
[OmniPort] [test-correlation-id-00001f] [0ms] DLQ_WRITE_SUCCESS {"riskScore":10}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should calculate higher risk score for webhook failures
[OmniPort] [test-correlation-id-00001f] [0ms] DELIVERY_FAILED_BUFFERED {"latencyMs":0,"error":"Webhook delivery failed"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should continue even if DLQ write fails
[OmniPort] Engine initialized

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should continue even if DLQ write fails
[OmniPort] [test-correlation-id-000021] [0ms] INGEST_START {"type":"text"}
[OmniPort] [test-correlation-id-000021] [0ms] ZERO_TRUST_PASS {"deviceId":"550e8400-e29b-41d4-a716-446655440000","status":"trusted"}

stderr | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should continue even if DLQ write fails
[OmniPort] [test-correlation-id-000021] DLQ write failed: DLQ write failed

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should continue even if DLQ write fails
[OmniPort] [test-correlation-id-000021] [4ms] DELIVERY_FAILED_BUFFERED {"latencyMs":4,"error":"Delivery failed"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should include user_id in DLQ entry when available
[OmniPort] Engine initialized

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should include user_id in DLQ entry when available
[OmniPort] [test-correlation-id-000023] [0ms] INGEST_START {"type":"text"}
[OmniPort] [test-correlation-id-000023] [0ms] ZERO_TRUST_PASS {"deviceId":"550e8400-e29b-41d4-a716-446655440088","status":"trusted"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should include user_id in DLQ entry when available
[OmniPort] [test-correlation-id-000023] [1ms] DLQ_WRITE_SUCCESS {"riskScore":0}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Test: The Safety Net - Circuit Breaker / DLQ > should include user_id in DLQ entry when available
[OmniPort] [test-correlation-id-000023] [1ms] DELIVERY_FAILED_BUFFERED {"latencyMs":1,"error":"Timeout"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Singleton Pattern > should return same instance on multiple getInstance calls
[OmniPort] Engine initialized

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Singleton Pattern > should reset singleton correctly
[OmniPort] Engine initialized

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Singleton Pattern > should be idempotent on initialize
[OmniPort] Engine initialized

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Input Type Coverage > should process TextSource input correctly
[OmniPort] Engine initialized

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Input Type Coverage > should process TextSource input correctly
[OmniPort] [test-correlation-id-000025] [0ms] INGEST_START {"type":"text"}
[OmniPort] [test-correlation-id-000025] [0ms] ZERO_TRUST_PASS {"deviceId":"550e8400-e29b-41d4-a716-446655440000","status":"trusted"}

stdout | tests/omniconnect/omniport.spec.ts > OmniPort - The Proprietary Ingress Engine > Input Type Coverage > should process TextSource input correctly
[OmniPort] [test-correlation-id-000025] [0ms] INGEST_ACCEPTED {"latencyMs":0,"riskLane":"GREEN"}






=================================================================================================================================================================================================================================





apps/omnihub-site/src/hooks/useHealthStatus.ts


Remove this use of the "void" operator.

Intentionality
Maintainability


4
High
confusing
type-dependent
+
Open
Not assigned
L53
5min effort
20 minutes ago
Code Smell
Critical


Remove this use of the "void" operator.

Intentionality
Maintainability


4
High
confusing
type-dependent
+
Open
Not assigned
L54
5min effort
20 minutes ago
Code Smell
Critical
apps/omnihub-site/src/hooks/useOmniTheme.ts


Compare with `undefined` directly instead of using `typeof`.

Consistency
Maintainability


3
Low
readability
style
+
Open
Not assigned
L15
2min effort
20 minutes ago
Code Smell
Minor


Compare with `undefined` directly instead of using `typeof`.

Consistency
Maintainability


3
Low
readability
style
+
Open
Not assigned
L26
2min effort
20 minutes ago
Code Smell
Minor
apps/omnihub-site/src/layouts/OmniDashLayout.tsx


Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed.

Adaptability
Maintainability


4
High
brain-overload
+
Open
Not assigned
L98
12min effort
20 minutes ago
Code Smell
Critical


Use <input type="button">, <input type="image">, <input type="reset">, <input type="submit">, or <button> instead of the "button" role to ensure accessibility across all devices.

Consistency
Maintainability


2
Medium
accessibility
react
+
Open
Not assigned
L148
5min effort
20 minutes ago
Code Smell
Major


Use <input type="button">, <input type="image">, <input type="reset">, <input type="submit">, or <button> instead of the "button" role to ensure accessibility across all devices.

Consistency
Maintainability


2
Medium
accessibility
react
+
Open
Not assigned
L299
5min effort
20 minutes ago
Code Smell
Major


Ambiguous spacing after previous element span

Consistency
Reliability


3
Low
Maintainability


2
Medium
react
+
Open
Not assigned
L315
5min effort
20 minutes ago
Code Smell
Major


Extract this nested ternary operation into an independent statement.

Intentionality
Maintainability


2
Medium
confusing
+
Open
Not assigned
L352
5min effort
20 minutes ago
Code Smell
Major


Extract this nested ternary operation into an independent statement.

Intentionality
Maintainability


2
Medium
confusing
+
Open
Not assigned
L352
5min effort
20 minutes ago
Code Smell
Major


Extract this nested ternary operation into an independent statement.

Intentionality
Maintainability


2
Medium
confusing
+
Open
Not assigned
L371
5min effort
20 minutes ago
Code Smell
Major


Extract this nested ternary operation into an independent statement.

Intentionality
Maintainability


2
Medium
confusing
+
Open
Not assigned
L373
5min effort
20 minutes ago
Code Smell
Major


Use <input type="button">, <input type="image">, <input type="reset">, <input type="submit">, or <button> instead of the "button" role to ensure accessibility across all devices.

Consistency
Maintainability


2
Medium
accessibility
react
+
Open
Not assigned
L403
5min effort
20 minutes ago
Code Smell
Major


Non-interactive elements should not be assigned mouse or keyboard event listeners.

Consistency
Reliability


3
Low
Maintainability


2
Medium
accessibility
react
+
Open
Not assigned
L404
5min effort
20 minutes ago
Code Smell
Major


Use <dialog> instead of the "dialog" role to ensure accessibility across all devices.

Consistency
Maintainability


2
Medium
accessibility
react
+
Open
Not assigned
L404
5min effort
20 minutes ago
Code Smell
Major
apps/omnihub-site/src/pages/DashboardOverview.tsx


Extract this nested ternary operation into an independent statement.

Intentionality
Maintainability


2
Medium
confusing
+
Open
Not assigned
L460
5min effort
20 minutes ago
Code Smell
Major
apps/omnihub-site/src/styles/omnidash-layout.css


Unexpected duplicate selector ".omnislate-drop-active", first used at line 679

Intentionality
Maintainability


2
Medium
No tags
+
Open
Not assigned
L1077
1min effort
20 minutes ago
Code Smell
Major


Unexpected duplicate selector ".app-tile", first used at line 427

Intentionality
Maintainability


2
Medium
No tags
+
Open
Not assigned
L1097
1min effort
20 minutes ago
Code Smell
Major


Unexpected duplicate selector ".app-tile:active", first used at line 451

Intentionality
Maintainability


2
Medium
No tags
+
Open
Not assigned
L1103
1min effort
20 minutes ago
Code Smell
Major




=================================================================================================================================================================================================================================



Duplicated Lines (%) on New Code
80.2%
/**
 * useOmniTrace — Local Realtime trace event hook for apps/omnihub-site.
 *
 * Mirrors src/hooks/useOmniTrace.ts but uses the local @/lib/supabase client
 * to avoid cross-app path alias breakage (@/integrations/supabase/client
 * doesn't exist in apps/omnihub-site).
 *
 * Fetches last 50 events from omni_run_events (desc by created_at).
 * Subscribes via Supabase Realtime for live updates.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
export interface TraceEvent {
  id: string;
  workflow_id: string;
  event_key: string;
  kind: 'tool' | 'model' | 'policy' | 'cache' | 'system';
  name: string;
  latency_ms: number | null;
  data_redacted: Record<string, unknown>;
  data_hash: string;
  created_at: string;
}
export function useOmniTrace(workflowId?: string) {
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [isTracing, setIsTracing] = useState(true);
  useEffect(() => {
    let mounted = true;
    setIsTracing(true);
    const fetchTraces = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('omni_run_events')
        .select('id, workflow_id, event_key, kind, name, latency_ms, data_redacted, data_hash, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }
      const { data, error } = await query;
      if (!error && data && mounted) {
        setTraces(data as TraceEvent[]);
      }
      if (mounted) setIsTracing(false);
    };
    fetchTraces().catch(console.error);
    const channel = supabase
      .channel(`omnitrace-live-${workflowId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'omni_run_events',
        },
        (payload: { new: unknown }) => {
          const row = payload.new as TraceEvent;
          if (!workflowId || row.workflow_id === workflowId) {
            setTraces((prev) => [row, ...prev].slice(0, 50));
          }
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [workflowId]);
  return { traces, isTracing };
}
