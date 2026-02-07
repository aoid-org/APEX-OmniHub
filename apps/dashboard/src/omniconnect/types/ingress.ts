/**
 * OmniPort Ingress Type Definitions
 * =============================================================================
 * Strict runtime validation schemas for all ingress sources.
 * Uses Zod for type-safe validation at the defensive perimeter.
 * =============================================================================
 */

import { z } from 'zod';

// =============================================================================
// BASE SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 */
const UUIDSchema = z.string().uuid('Invalid UUID format');

/**
 * URL validation schema
 */
const URLSchema = z.string().url('Invalid URL format');

// =============================================================================
// INPUT SOURCE SCHEMAS
// =============================================================================

/**
 * TextSource - Web and SMS text inputs
 * @example { type: 'text', content: 'Hello world', source: 'web', userId: 'uuid' }
 */
export const TextSourceSchema = z.object({
  type: z.literal('text'),
  content: z.string().min(1, 'Content cannot be empty'),
  source: z.enum(['web', 'sms'], {
    errorMap: () => ({ message: "Source must be 'web' or 'sms'" }),
  }),
  userId: UUIDSchema,
});

export type TextSource = z.infer<typeof TextSourceSchema>;

/**
 * VoiceSource - Voice transcription inputs
 * @example { type: 'voice', transcript: 'Hello', confidence: 0.95, audioUrl: 'https://...', durationMs: 1500 }
 */
export const VoiceSourceSchema = z.object({
  type: z.literal('voice'),
  transcript: z.string().min(1, 'Transcript cannot be empty'),
  confidence: z
    .number()
    .min(0, 'Confidence must be >= 0')
    .max(1, 'Confidence must be <= 1'),
  audioUrl: URLSchema,
  durationMs: z.number().int().positive('Duration must be positive'),
  userId: UUIDSchema.optional(),
});

export type VoiceSource = z.infer<typeof VoiceSourceSchema>;

/**
 * WebhookSource - External webhook payloads
 * @example { type: 'webhook', payload: {...}, provider: 'stripe', signature: 'sha256=...' }
 */
export const WebhookSourceSchema = z.object({
  type: z.literal('webhook'),
  payload: z.record(z.unknown()),
  provider: z.string().min(1, 'Provider cannot be empty'),
  signature: z.string().min(1, 'Signature cannot be empty'),
  userId: UUIDSchema.optional(),
});

export type WebhookSource = z.infer<typeof WebhookSourceSchema>;

/**
 * ZigbeeDeviceSource - Zigbee protocol device events
 * @example { type: 'zigbee_device', ieeeAddr: '0x00158d0001a2b3c4', endpoint: 1, cluster: 'genOnOff', attribute: 'onOff', value: true }
 */
export const ZigbeeDeviceSourceSchema = z.object({
  type: z.literal('zigbee_device'),
  ieeeAddr: z.string().min(1, 'IEEE address cannot be empty'),
  endpoint: z.number().int().positive(),
  cluster: z.string().min(1, 'Cluster cannot be empty'),
  attribute: z.string().optional(),
  command: z.string().optional(),
  value: z.unknown(),
  linkQuality: z.number().int().min(0).max(255).optional(),
  userId: UUIDSchema.optional(),
});

export type ZigbeeDeviceSource = z.infer<typeof ZigbeeDeviceSourceSchema>;

/**
 * MatterDeviceSource - Matter protocol device events
 * @example { type: 'matter_device', nodeId: 'matter-0x1234', endpointId: 1, clusterId: 6, attributeId: 0, value: true }
 */
export const MatterDeviceSourceSchema = z.object({
  type: z.literal('matter_device'),
  nodeId: z.string().min(1, 'Node ID cannot be empty'),
  endpointId: z.number().int().nonnegative(),
  clusterId: z.number().int().nonnegative(),
  attributeId: z.number().int().nonnegative().optional(),
  commandId: z.number().int().nonnegative().optional(),
  value: z.unknown(),
  userId: UUIDSchema.optional(),
});

export type MatterDeviceSource = z.infer<typeof MatterDeviceSourceSchema>;

/**
 * ROS2DeviceSource - ROS 2 DDS protocol device events
 * @example { type: 'ros2_device', nodeName: '/robot_arm', topic: '/joint_states', messageType: 'sensor_msgs/JointState', data: {...} }
 */
export const ROS2DeviceSourceSchema = z.object({
  type: z.literal('ros2_device'),
  nodeName: z.string().min(1, 'Node name cannot be empty'),
  topic: z.string().min(1, 'Topic cannot be empty'),
  messageType: z.string().min(1, 'Message type cannot be empty'),
  data: z.record(z.unknown()),
  qos: z
    .object({
      reliability: z.enum(['RELIABLE', 'BEST_EFFORT']).optional(),
      durability: z.enum(['VOLATILE', 'TRANSIENT_LOCAL']).optional(),
    })
    .optional(),
  userId: UUIDSchema.optional(),
});

export type ROS2DeviceSource = z.infer<typeof ROS2DeviceSourceSchema>;

/**
 * RawInput - Discriminated union of all input sources
 * Validates at runtime to ensure type-safe processing
 */
export const RawInputSchema = z.discriminatedUnion('type', [
  TextSourceSchema,
  VoiceSourceSchema,
  WebhookSourceSchema,
  ZigbeeDeviceSourceSchema,
  MatterDeviceSourceSchema,
  ROS2DeviceSourceSchema,
]);

export type RawInput = z.infer<typeof RawInputSchema>;

// =============================================================================
// RESULT SCHEMAS
// =============================================================================

/**
 * Risk lane classification for governance routing
 * - GREEN: Standard processing, no elevated risk
 * - RED: Elevated risk, may require MAN Mode approval
 */
export const RiskLaneSchema = z.enum(['GREEN', 'RED']);
export type RiskLane = z.infer<typeof RiskLaneSchema>;

/**
 * Ingestion status indicating processing outcome
 * - accepted: Successfully processed and delivered
 * - blocked: Rejected by security gate (Zero-Trust)
 * - buffered: Delivery failed, queued in DLQ for retry
 */
export const IngestStatusSchema = z.enum(['accepted', 'blocked', 'buffered']);
export type IngestStatus = z.infer<typeof IngestStatusSchema>;

/**
 * IngestResult - The outcome of an ingestion attempt
 */
export const IngestResultSchema = z.object({
  correlationId: z.string().min(1),
  status: IngestStatusSchema,
  latencyMs: z.number().int().nonnegative(),
  riskLane: RiskLaneSchema,
});

export type IngestResult = z.infer<typeof IngestResultSchema>;

// =============================================================================
// DLQ SCHEMAS (for database operations)
// =============================================================================

/**
 * DLQ Entry status
 */
export const DLQStatusSchema = z.enum(['pending', 'replaying', 'failed']);
export type DLQStatus = z.infer<typeof DLQStatusSchema>;

/**
 * DLQ Entry - Dead Letter Queue record
 */
export const DLQEntrySchema = z.object({
  id: UUIDSchema,
  correlationId: z.string(),
  rawInput: RawInputSchema,
  errorReason: z.string(),
  status: DLQStatusSchema,
  riskScore: z.number().int().min(0).max(100),
  createdAt: z.date(),
  retryCount: z.number().int().nonnegative().default(0),
  lastRetryAt: z.date().nullable().optional(),
  sourceType: z.string().nullable().optional(),
  userId: UUIDSchema.nullable().optional(),
});

export type DLQEntry = z.infer<typeof DLQEntrySchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates raw input and returns parsed result or throws
 * @param input Unknown input to validate
 * @returns Validated RawInput
 * @throws z.ZodError if validation fails
 */
export function validateRawInput(input: unknown): RawInput {
  return RawInputSchema.parse(input);
}

/**
 * Safe validation that returns result with error info
 * @param input Unknown input to validate
 * @returns SafeParseResult with success flag and data/error
 */
export function safeValidateRawInput(input: unknown): z.SafeParseReturnType<unknown, RawInput> {
  return RawInputSchema.safeParse(input);
}

/**
 * Type guard to check if input is TextSource
 */
export function isTextSource(input: RawInput): input is TextSource {
  return input.type === 'text';
}

/**
 * Type guard to check if input is VoiceSource
 */
export function isVoiceSource(input: RawInput): input is VoiceSource {
  return input.type === 'voice';
}

/**
 * Type guard to check if input is WebhookSource
 */
export function isWebhookSource(input: RawInput): input is WebhookSource {
  return input.type === 'webhook';
}

/**
 * Type guard to check if input is ZigbeeDeviceSource
 */
export function isZigbeeDeviceSource(input: RawInput): input is ZigbeeDeviceSource {
  return input.type === 'zigbee_device';
}

/**
 * Type guard to check if input is MatterDeviceSource
 */
export function isMatterDeviceSource(input: RawInput): input is MatterDeviceSource {
  return input.type === 'matter_device';
}

/**
 * Type guard to check if input is ROS2DeviceSource
 */
export function isROS2DeviceSource(input: RawInput): input is ROS2DeviceSource {
  return input.type === 'ros2_device';
}

/**
 * Type guard to check if input is any device source (Physical AI)
 */
export function isDeviceSource(
  input: RawInput
): input is ZigbeeDeviceSource | MatterDeviceSource | ROS2DeviceSource {
  return (
    input.type === 'zigbee_device' ||
    input.type === 'matter_device' ||
    input.type === 'ros2_device'
  );
}

// =============================================================================
// HIGH-RISK INTENT KEYWORDS (MAN Mode Triggers)
// =============================================================================

/**
 * Keywords that trigger MAN Mode (Manual Approval Node)
 * These intents require human oversight before execution
 */
export const HIGH_RISK_INTENTS = ['delete', 'transfer', 'grant_access'] as const;

export type HighRiskIntent = (typeof HIGH_RISK_INTENTS)[number];

/**
 * Check if content contains high-risk intents
 * @param content The content to analyze
 * @returns Array of detected high-risk intents
 */
export function detectHighRiskIntents(content: string): HighRiskIntent[] {
  const lowerContent = content.toLowerCase();
  return HIGH_RISK_INTENTS.filter((intent) => lowerContent.includes(intent));
}

// =============================================================================
// SECURITY ERROR
// =============================================================================

/**
 * Custom error for security-related rejections
 */
export class SecurityError extends Error {
  public readonly code: string;
  public readonly deviceId?: string;
  public readonly userId?: string;

  constructor(
    message: string,
    code: string = 'SECURITY_BLOCKED',
    deviceId?: string,
    userId?: string
  ) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.deviceId = deviceId;
    this.userId = userId;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecurityError);
    }
  }
}
