import { z } from 'zod';

export const BridgeRiskLevelSchema = z.enum(['read', 'write', 'destructive']);

export type BridgeRiskLevel = z.infer<typeof BridgeRiskLevelSchema>;

const BridgeActionsSchema = z.object({
  read: z.array(z.string().min(1)).readonly(),
  write: z.array(z.string().min(1)).readonly(),
  destructive: z.array(z.string().min(1)).readonly(),
});

export const BRIDGE_ACTIONS = BridgeActionsSchema.parse({
  read: [
    'tools/list',
    'resources/list',
    'resources/read',
    'search',
    'fetch',
    'query',
    'get',
    'read',
  ],
  write: [
    'create',
    'update',
    'upsert',
    'append',
    'insert',
    'patch',
    'put',
    'write',
  ],
  destructive: [
    'delete',
    'purge',
    'truncate',
    'drop',
    'destroy',
    'revoke',
    'remove',
  ],
}) as const;

const BRIDGE_ACTION_ORDER: readonly BridgeRiskLevel[] = ['read', 'write', 'destructive'];

const normalizeToolName = (toolName: string): string =>
  toolName
    .trim()
    .toLowerCase()
    .replace(/[\s:/]+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');

export const resolveBridgeRiskLevel = (
  toolName: string,
  fallbackRiskLevel: BridgeRiskLevel,
): BridgeRiskLevel => {
  const normalizedToolName = normalizeToolName(toolName);

  for (const riskLevel of BRIDGE_ACTION_ORDER.slice().reverse()) {
    const actions = BRIDGE_ACTIONS[riskLevel];
    const matched = actions.some((action) =>
      normalizedToolName.includes(action.toLowerCase()),
    );
    if (matched) {
      return riskLevel;
    }
  }

  return fallbackRiskLevel;
};
