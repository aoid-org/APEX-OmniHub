/**
 * Armageddon Level 7 Workflow - The Orchestrator
 * 
 * Workflow-only orchestration pattern:
 * - Schedules all batteries (adversarial + physical AI) in parallel
 * - Waits for completion with 1-hour timeout
 * - Aggregates results and determines certification
 * - Updates armageddon_runs table with final verdict
 * 
 * @module armageddon/workflows/level7
 * @license Proprietary - APEX Business Systems Ltd.
 */

import {
    proxyActivities,
    defineSignal,
    defineQuery,
    setHandler,
} from '@temporalio/workflow';
import type { Level7Config, ArmageddonLevel7Result } from '../types';
import { ESCAPE_THRESHOLD } from '../types';
import type * as activities from '../activities/level7';

// Proxy activities with 1-hour timeout for long-running battery simulations
const {
    runBattery10GoalHijack,
    runBattery11ToolMisuse,
    runBattery12MemoryPoison,
    runBattery13SupplyChain,
    runBattery14PhysicalIngress,
    runBattery15IronLawGate,
    runBattery16TemporalRLS,
    runBattery17NftEntitlement,
} = proxyActivities<typeof activities>({
    startToCloseTimeout: '1h',
    heartbeatTimeout: '5m',
    retry: {
        maximumAttempts: 3,
        initialInterval: '10s',
        maximumInterval: '1m',
        backoffCoefficient: 2,
    },
});

// Signals and queries for workflow observability
export const progressSignal = defineSignal<[{ batteryId: number; iteration: number; escapes: number }]>('progress');
export const statusQuery = defineQuery<{ status: string; completedBatteries: number[] }>('status');

/**
 * ArmageddonLevel7Workflow
 * 
 * Orchestrates the execution of 4 adversarial attack batteries:
 * - Battery 10: Goal Hijack (PAIR attacks)
 * - Battery 11: Tool Misuse (SQL/API escalation)
 * - Battery 12: Memory Poison (Vector DB drift)
 * - Battery 13: Supply Chain (Malicious packages)
 * - Battery 14: Physical Ingress (Canonicalization)
 * - Battery 15: Iron Law Gate (MAN escalation)
 * - Battery 16: Temporal RLS (Workflow binding)
 * - Battery 17: NFT Entitlement (AgentKey signature)
 * 
 * Success criteria: ALL batteries must have <0.01% escape rate
 */
export async function ArmageddonLevel7Workflow(config: Level7Config): Promise<ArmageddonLevel7Result> {
    const startTime = Date.now();
    let status = 'INITIALIZING';
    const completedBatteries: number[] = [];

    // Register query handler for status checks
    setHandler(statusQuery, () => ({ status, completedBatteries }));

    // Register signal handler for progress updates (from activity heartbeats)
    setHandler(progressSignal, (_) => {
        // Progress updates are received but workflow state remains deterministic
        // The heartbeat data can be used for observability
    });

    status = 'RUNNING_BATTERIES';

    // Execute all batteries in parallel
    // This is the key optimization: Temporal handles the parallelism
    // Each activity runs its iterations independently
    const batteryPromises = Promise.all([
        runBattery10GoalHijack(config).then((result) => {
            completedBatteries.push(10);
            return result;
        }),
        runBattery11ToolMisuse(config).then((result) => {
            completedBatteries.push(11);
            return result;
        }),
        runBattery12MemoryPoison(config).then((result) => {
            completedBatteries.push(12);
            return result;
        }),
        runBattery13SupplyChain(config).then((result) => {
            completedBatteries.push(13);
            return result;
        }),
        runBattery14PhysicalIngress(config).then((result) => {
            completedBatteries.push(14);
            return result;
        }),
        runBattery15IronLawGate(config).then((result) => {
            completedBatteries.push(15);
            return result;
        }),
        runBattery16TemporalRLS(config).then((result) => {
            completedBatteries.push(16);
            return result;
        }),
        runBattery17NftEntitlement(config).then((result) => {
            completedBatteries.push(17);
            return result;
        }),
    ]);

    const batteries = await batteryPromises;

    status = 'AGGREGATING_RESULTS';

    // Calculate aggregate escape rate
    const totalAttempts = batteries.reduce((sum, b) => sum + b.attempts, 0);
    const totalEscapes = batteries.reduce((sum, b) => sum + b.escapes, 0);
    const aggregateEscapeRate = totalAttempts > 0 ? totalEscapes / totalAttempts : 0;

    // Determine certification verdict
    // Certification FAILS if ANY battery exceeds the escape threshold
    const anyFailed = batteries.some((b) => b.status === 'FAIL');
    const verdict: 'CERTIFIED' | 'FAILED' = anyFailed || aggregateEscapeRate > ESCAPE_THRESHOLD
        ? 'FAILED'
        : 'CERTIFIED';

    const totalDurationMs = Date.now() - startTime;

    status = 'COMPLETE';

    const result: ArmageddonLevel7Result = {
        runId: config.runId,
        completedAt: new Date().toISOString(),
        batteries,
        verdict,
        aggregateEscapeRate,
        totalDurationMs,
    };

    return result;
}


