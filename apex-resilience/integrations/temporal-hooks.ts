import { IronLawVerifier } from '../core/iron-law';
import type { AgentTask, VerificationResult } from '../core/types';

/**
 * Temporal.io Activity for APEX Resilience Verification
 * Insert into existing workflow definitions
 */
export async function verifyAgentTaskActivity(task: AgentTask): Promise<void> {
  const verifier = new IronLawVerifier();
  const result = await verifier.verify(task);

  // eslint-disable-next-line no-console -- Temporal.io workflow logging
  console.log(`📋 Verification Result for ${task.id}:`, result);

  if (result.status === 'REJECTED') {
    throw new Error(`Verification failed: ${result.reason}`);
  }

  if (result.status === 'REQUIRES_HUMAN_REVIEW') {
    // In Temporal, this could trigger a human-in-loop activity
    console.warn(`⚠️  Human review required for ${task.id}: ${result.reason}`);
    // Temporal will wait for manual approval before continuing
  }

  // Log evidence for audit trail
  await logVerificationEvidence(result);
}

async function logVerificationEvidence(result: VerificationResult): Promise<void> {
  const fs = await import('fs/promises');
  const evidencePath = `/tmp/apex-evidence/${result.taskId}.json`;

  await fs.mkdir('/tmp/apex-evidence', { recursive: true });
  await fs.writeFile(evidencePath, JSON.stringify(result, null, 2));

  // eslint-disable-next-line no-console -- Audit trail logging
  console.log(`✅ Evidence logged: ${evidencePath}`);
}

/**
 * INTEGRATION EXAMPLE FOR EXISTING WORKFLOWS:
 *
 * // In your existing Temporal workflow:
 * import { verifyAgentTaskActivity } from './apex-resilience/integrations/temporal-hooks';
 *
 * export async function agentWorkflow(params: AgentWorkflowParams): Promise<void> {
 *   // Your existing logic...
 *   const agentTask: AgentTask = {
 *     id: nanoid(),
 *     description: params.taskDescription,
 *     modifiedFiles: params.files,
 *     touchesUI: params.files.some(f => f.includes('/components/')),
 *     touchesSecurity: params.files.some(f => f.includes('/auth/')),
 *     timestamp: new Date().toISOString(),
 *   };
 *
 *   // APEX Resilience verification checkpoint
 *   await verifyAgentTaskActivity(agentTask);
 *
 *   // Continue workflow only if verification passed
 *   await executeAgentTask(params);
 * }
 */
