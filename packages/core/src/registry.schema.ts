import { z } from 'zod';
import type { AppRegistryEntry } from './registry';

export const appRegistryEntrySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  routePath: z.string().startsWith('/omnidash'),
  category: z.enum(['control-plane', 'security', 'automation', 'operations', 'platform']),
  iconAssetKey: z.string().min(1),
  logoDomain: z.string().min(1),
  chaosTarget: z.boolean(),
  comingSoon: z.boolean(),
  healthContext: z.object({
    health: z.enum(['green', 'yellow', 'red']),
    insight: z.string().min(1),
  }),
  dashboard: z.object({
    syncedMinutesAgo: z.number().int().nonnegative(),
    status: z.enum(['Live', 'Partial']),
  }),
});

export const appRegistrySchema = appRegistryEntrySchema.array().length(14);

export const parseAppRegistry = (input: readonly AppRegistryEntry[]): readonly AppRegistryEntry[] => {
  return appRegistrySchema.parse(input);
};
