import { z } from 'zod';

export const BRIDGE_ACTIONS = ['PENDING_NETWORK', 'APPROVED', 'REJECTED'] as const;

export const BridgeActionSchema = z.enum(BRIDGE_ACTIONS);

export const BridgePayloadSchema = z.object({
  action: BridgeActionSchema,
  discrepancy: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }),
  anomaly: z.string().min(1),
});

export type BridgePayload = z.infer<typeof BridgePayloadSchema>;

export const BridgeRiskLevelSchema = z.enum(['read', 'write', 'destructive']);

export type BridgeRiskLevel = z.infer<typeof BridgeRiskLevelSchema>;

const BridgeActionKeywordsSchema = z.object({
  read: z.array(z.string().min(1)).readonly(),
  write: z.array(z.string().min(1)).readonly(),
  destructive: z.array(z.string().min(1)).readonly(),
});

const BRIDGE_ACTION_KEYWORDS = BridgeActionKeywordsSchema.parse({
  read: ['tools/list', 'resources/list', 'resources/read', 'search', 'fetch', 'query', 'get', 'read'],
  write: ['create', 'update', 'upsert', 'append', 'insert', 'patch', 'put', 'write'],
  destructive: ['delete', 'purge', 'truncate', 'drop', 'destroy', 'revoke', 'remove'],
}) as const;

const BRIDGE_RISK_ORDER: readonly BridgeRiskLevel[] = ['destructive', 'write', 'read'];

const normalizeToolName = (toolName: string): string =>
  toolName
    .trim()
    .toLowerCase()
    .replaceAll(/[\s:/]+/g, '.')
    .replaceAll(/[^a-z0-9._-]/g, '');

export const resolveBridgeRiskLevel = (
  toolName: string,
  fallbackRiskLevel: BridgeRiskLevel,
): BridgeRiskLevel => {
  const normalizedToolName = normalizeToolName(toolName);

  for (const riskLevel of BRIDGE_RISK_ORDER) {
    const actions = BRIDGE_ACTION_KEYWORDS[riskLevel];
    const matched = actions.some((action) => normalizedToolName.includes(action.toLowerCase()));
    if (matched) {
      return riskLevel;
    }
  }

  return fallbackRiskLevel;
};
