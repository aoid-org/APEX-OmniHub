import { z } from 'zod';
import { APP_REGISTRY } from './registry';

export const chaosTargetSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  routePath: z.string().startsWith('/omnidash'),
});

export type ChaosTarget = z.infer<typeof chaosTargetSchema>;

export const CHAOS_TARGETS: readonly ChaosTarget[] = chaosTargetSchema
  .array()
  .parse(
    APP_REGISTRY.filter((entry) => entry.chaosTarget === true).map((entry) => ({
      key: entry.key,
      label: entry.label,
      routePath: entry.routePath,
    })),
  );
