import { z } from 'zod';

export const ModelProviderRegistrySchema = z.object({
  provider_id: z.string().min(1),
  tenant_id: z.string().min(1),
  endpoint: z.string().url().optional(), // Used if local/self-hosted
  auth_secret_ref: z.string().min(1), // Pointer to credential vault
  provider_type: z.enum(['openai-compatible', 'anthropic-compatible', 'local-http', 'disabled']),
  allowed_models: z.array(z.string()).min(1),
  max_cost_usd: z.number().min(0),
  max_latency_ms: z.number().min(100).max(60000).default(10000),
  retention_mode: z.enum(['ephemeral', 'persistent', 'audit-only']),
  pii_policy: z.enum(['block', 'redact', 'allow_internal', 'passthrough']),
  tool_use_permissions: z.array(z.enum(['read_only', 'action_dispatch', 'none'])),
  output_validator_profile: z.string().optional(),
});

export type ModelProviderConfig = z.infer<typeof ModelProviderRegistrySchema>;

export const ByomAuditSpanSchema = z.object({
  tenant_id: z.string(),
  user_id: z.string(),
  provider_id: z.string(),
  model: z.string(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cost_incurred: z.number(),
  status: z.enum(['success', 'blocked_pii', 'blocked_budget', 'error_timeout', 'error_auth']),
});

export type ByomAuditSpan = z.infer<typeof ByomAuditSpanSchema>;
