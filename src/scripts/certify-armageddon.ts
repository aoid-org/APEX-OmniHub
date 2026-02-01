/**
 * Armageddon Level 7 Certification Trigger
 * 
 * Triggers the Armageddon Level 7 Workflow and reports results.
 */
import { Client, Connection } from '@temporalio/client';
import { Worker } from '@temporalio/worker';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import * as level7Activities from '../armageddon/activities/level7';
import { ArmageddonLevel7Workflow } from '../armageddon/workflows/level7';
import { ARMAGEDDON_TASK_QUEUE } from '../worker';

async function runArmageddon() {
    // Ensure SIM_MODE for safety + offline Supabase stub
    if (!process.env.SIM_MODE) {
        process.env.SIM_MODE = 'true';
    }

    const targetAddress = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
    console.log(`Connecting to Temporal at ${targetAddress}...`);

    let client: Client | null = null;
    let connection: Connection | null = null;
    let teardown: (() => Promise<void>) | null = null;
    let worker: Worker | null = null;

    try {
        connection = await Connection.connect({ address: targetAddress, tls: undefined, });
        client = new Client({ connection });
    } catch (err) {
        console.warn('Primary Temporal connection failed, falling back to in-process test environment.', err);

        // Spin up time-skipping test environment to keep Level 7 runnable without Docker
        const env = await TestWorkflowEnvironment.createTimeSkipping();
        connection = env.connection;
        client = env.client;

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const workflowsPath = path.join(__dirname, '../armageddon/workflows/level7.ts');

        worker = await Worker.create({
            connection: env.nativeConnection,
            namespace: env.nativeConnection.namespace ?? 'default',
            taskQueue: ARMAGEDDON_TASK_QUEUE,
            workflowsPath,
            activities: level7Activities,
            maxConcurrentActivityTaskExecutions: 4,
            maxConcurrentWorkflowTaskExecutions: 10,
        });

        // Run worker alongside workflow execution
        const runWorker = worker.run();
        teardown = async () => {
            await worker?.shutdown();
            await env?.teardown();
            await runWorker;
        };
    }

    const runId = uuidv4();
    console.log(`Starting Armageddon Level 7 Certification Run (ID: ${runId})...`);
    console.log('Configuration: 10,000 iterations per battery, <0.01% escape threshold');

    const handle = await client!.workflow.start(ArmageddonLevel7Workflow, {
        taskQueue: ARMAGEDDON_TASK_QUEUE,
        workflowId: `armageddon-level7-${runId}`,
        args: [{
            runId: runId,
            iterations: 10000,
            seed: Date.now(),
        }],
    });

    console.log(`Started Workflow: ${handle.workflowId}`);
    console.log('Waiting for results (timeout 1h)...');

    try {
        const result = await handle.result();

        const totalAttempts = result.batteries.reduce((acc, b) => acc + b.attempts, 0);
        const totalEscapes = result.batteries.reduce((acc, b) => acc + b.escapes, 0);

        console.log('\n--- ARMAGEDDON LEVEL 7 RESULTS ---');
        console.log(`Verdict: ${result.verdict}`);
        console.log(`Aggregate Escape Rate: ${(result.aggregateEscapeRate * 100).toFixed(4)}%`);
        console.log(`Total Attempts: ${totalAttempts}`);
        console.log(`Total Escapes: ${totalEscapes}`);
        console.log('\nBattery Details:');
        result.batteries.forEach(b => {
            console.log(`  Battery ${b.batteryId}: ${b.status} (Attempts: ${b.attempts}, Escapes: ${b.escapes})`);
        });

        if (result.verdict === 'CERTIFIED') {
            console.log('\nCERTIFICATION SUCCESSFUL');
            process.exit(0);
        } else {
            console.log('\nCERTIFICATION FAILED');
            process.exit(1);
        }
    } catch (err) {
        console.error('Workflow failed:', err);
        process.exit(1);
    } finally {
        if (teardown) {
            await teardown();
        }
        await connection?.close();
    }
}

// Use top-level await for cleaner execution
try {
    await runArmageddon();
} catch (err) {
    console.error('Script error:', err);
    process.exit(1);
}
