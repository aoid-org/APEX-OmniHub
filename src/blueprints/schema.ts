/* VALUATION_IMPACT: Declares blueprint schema for marketplace-grade extensibility */
/* Generated: 2026-02-03 */
import { z } from 'zod';

const semverPattern = /^\d+\.\d+\.\d+$/;

export const TriggerSchema = z.object({
  type: z.enum(['http', 'schedule', 'event', 'manual']),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});

export const StepSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(3),
  executor: z.string(),
  inputs: z.array(z.string()).nonempty(),
  outputs: z.array(z.string()).nonempty()
});

export const OutputSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'json'])
});

export const WorkflowSchema = z.object({
  name: z.string().min(3).max(50),
  version: z.string().regex(semverPattern),
  description: z.string().max(200),
  triggers: z.array(TriggerSchema).min(1),
  steps: z.array(StepSchema).min(1),
  outputs: z.array(OutputSchema).min(1)
});

export type WorkflowConfig = z.infer<typeof WorkflowSchema>;
