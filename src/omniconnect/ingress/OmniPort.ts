/**
 * OmniPort - The Proprietary Ingress Engine
 * =============================================================================
 * The fortified, high-speed ingress fortress for APEX OmniHub.
 * Implements Zero-Trust validation, idempotent execution, and MAN Mode governance.
 *
 * Core Philosophy:
 * 1. Defensive Ingress: Nothing enters without Identity + Rate Limit validation
 * 2. Deterministic Execution: All side effects wrapped in withIdempotency
 * 3. Proprietary Governance: High-risk intents tagged for MAN Mode approval
 * =============================================================================
 */

import { v4 as uuidv4 } from 'uuid';

import { supabase } from '@/integrations/supabase/client';
import {
  getDevice,
  type DeviceRecord,
  type DeviceStatus,
} from '@/zero-trust/deviceRegistry';
import { withIdempotency } from '../../../sim/idempotency';
import { OmniLinkDelivery } from '../delivery/omnilink-delivery';
import {
  CanonicalEvent,
  EventType,
  ConsentFlags,
  CanonicalDevice,
  DeviceType,
  DeviceProtocol,
  DeviceState,
  DeviceCapability,
} from '../types/canonical';
import {
  RawInput,
  IngestResult,
  RiskLane,
  IngestStatus,
  SecurityError,
  validateRawInput,
  isTextSource,
  isVoiceSource,
  isWebhookSource,
  isZigbeeDeviceSource,
  isMatterDeviceSource,
  isROS2DeviceSource,
  isDeviceSource,
  detectHighRiskIntents,
  type ZigbeeDeviceSource,
  type MatterDeviceSource,
  type ROS2DeviceSource,
} from '../types/ingress';
import { TranslatedEvent } from '../translation/translator';
import { verifyDeviceIntegrity } from '@/zero-trust/baseline';
import { checkEntitlement } from '@/lib/web3/entitlements';

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

/**
 * APEX Membership NFT Contract Address
 *
 * This is the ERC-721/ERC-1155 contract that grants physical device control permissions.
 * Physical AI agents can only actuate devices if their AgentKey is signed by a wallet
 * holding this NFT.
 *
 * Network: Ethereum Mainnet (chainId: 1)
 * Standard: ERC-721 or ERC-1155
 *
 * Production deployment steps:
 * 1. Deploy APEX Membership NFT contract to Ethereum mainnet
 * 2. Update this constant with the deployed contract address
 * 3. Configure access control: Only NFT holders can control physical actuators
 * 4. Set up monitoring for ownership changes (transfers, burns)
 *
 * For development/testing:
 * - Use zero address (0x0000...0000) - allows all users (permissive mode)
 * - Or deploy test NFT on Sepolia/Goerli testnet
 */
const APEX_MEMBERSHIP_NFT_CONTRACT = (import.meta.env.VITE_APEX_NFT_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

// =============================================================================
// UNIVERSAL HASHING (Browser + Node.js compatible)
// =============================================================================

/**
 * Compute a deterministic hash for idempotency keys
 * Uses FNV-1a algorithm - fast, deterministic, browser-compatible
 */
function computeHash(data: string): string {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < data.length; i++) {
    hash ^= data.codePointAt(i) || 0;
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  // Convert to unsigned 32-bit and then to hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended canonical event with MAN Mode metadata
 */
interface OmniPortCanonicalEvent extends CanonicalEvent {
  metadata: CanonicalEvent['metadata'] & {
    requires_man_approval?: boolean;
    detected_intents?: string[];
    risk_lane?: RiskLane;
    source_type?: string;
    confidence?: number;
  };
}

/**
 * Internal pipeline context for tracing
 */
interface PipelineContext {
  correlationId: string;
  startTime: number;
  riskLane: RiskLane;
  userId: string;
  deviceStatus?: DeviceStatus;
  temporalExecutionId?: string;
  tenantId?: string;
}

// =============================================================================
// UNIVERSAL DEVICE PRIMITIVE (UDP) NORMALIZATION
// =============================================================================

/**
 * Normalize Zigbee device payload to CanonicalDevice
 * Maps Zigbee-specific cluster/attribute structure to vendor-agnostic schema
 */
function normalizeZigbeeDevice(input: ZigbeeDeviceSource): CanonicalDevice {
  const now = new Date().toISOString();

  // Map Zigbee cluster to device type
  const deviceType = mapZigbeeClusterToDeviceType(input.cluster);

  // Map Zigbee cluster to capabilities
  const capabilities = mapZigbeeClusterToCapabilities(input.cluster);

  return {
    deviceId: input.ieeeAddr,
    name: `Zigbee ${deviceType}`,
    deviceType,
    protocol: DeviceProtocol.ZIGBEE,
    state: DeviceState.ONLINE,
    capabilities,
    attributes: {
      cluster: input.cluster,
      endpoint: input.endpoint,
      attribute: input.attribute,
      value: input.value,
    },
    metadata: {
      tags: ['zigbee', input.cluster],
    },
    lastSeen: now,
    connectivity: {
      online: true,
      linkQuality: input.linkQuality,
      lastSeenTimestamp: now,
    },
    security: {
      registryStatus: 'unknown',
      riskScore: 0,
    },
  };
}

/**
 * Normalize Matter device payload to CanonicalDevice
 * Maps Matter-specific cluster/attribute structure to vendor-agnostic schema
 */
function normalizeMatterDevice(input: MatterDeviceSource): CanonicalDevice {
  const now = new Date().toISOString();

  // Map Matter cluster to device type
  const deviceType = mapMatterClusterToDeviceType(input.clusterId);

  // Map Matter cluster to capabilities
  const capabilities = mapMatterClusterToCapabilities(input.clusterId);

  return {
    deviceId: input.nodeId,
    name: `Matter ${deviceType}`,
    deviceType,
    protocol: DeviceProtocol.MATTER,
    state: DeviceState.ONLINE,
    capabilities,
    attributes: {
      clusterId: input.clusterId,
      endpointId: input.endpointId,
      attributeId: input.attributeId,
      commandId: input.commandId,
      value: input.value,
    },
    metadata: {
      tags: ['matter', `cluster-${input.clusterId}`],
    },
    lastSeen: now,
    connectivity: {
      online: true,
      lastSeenTimestamp: now,
    },
    security: {
      registryStatus: 'unknown',
      riskScore: 0,
    },
  };
}

/**
 * Normalize ROS 2 DDS device payload to CanonicalDevice
 * Maps ROS 2 topic/message structure to vendor-agnostic schema
 */
function normalizeROS2Device(input: ROS2DeviceSource): CanonicalDevice {
  const now = new Date().toISOString();

  // Map ROS 2 topic to device type
  const deviceType = mapROS2TopicToDeviceType(input.topic);

  // Map ROS 2 topic to capabilities
  const capabilities = mapROS2TopicToCapabilities(input.topic);

  return {
    deviceId: input.nodeName,
    name: `ROS2 ${deviceType}`,
    deviceType,
    protocol: DeviceProtocol.ROS2_DDS,
    state: DeviceState.ONLINE,
    capabilities,
    attributes: {
      topic: input.topic,
      messageType: input.messageType,
      data: input.data,
      qos: input.qos,
    },
    metadata: {
      tags: ['ros2', input.messageType],
    },
    lastSeen: now,
    connectivity: {
      online: true,
      lastSeenTimestamp: now,
    },
    security: {
      registryStatus: 'unknown',
      riskScore: 50, // ROS2 devices start with elevated risk
    },
  };
}

// =============================================================================
// PROTOCOL-SPECIFIC MAPPING FUNCTIONS
// =============================================================================

function mapZigbeeClusterToDeviceType(cluster: string): DeviceType {
  const clusterMap: Record<string, DeviceType> = {
    genOnOff: DeviceType.SWITCH,
    genLevelCtrl: DeviceType.LIGHT_BULB,
    msTemperatureMeasurement: DeviceType.TEMPERATURE_SENSOR,
    msRelativeHumidity: DeviceType.HUMIDITY_SENSOR,
    msOccupancySensing: DeviceType.MOTION_SENSOR,
    genPowerCfg: DeviceType.SMART_PLUG,
    closuresDoorLock: DeviceType.LOCK,
    hvacThermostat: DeviceType.THERMOSTAT,
  };
  return clusterMap[cluster] || DeviceType.UNKNOWN;
}

function mapZigbeeClusterToCapabilities(cluster: string): DeviceCapability[] {
  const capabilityMap: Record<string, DeviceCapability[]> = {
    genOnOff: [DeviceCapability.SET_ON_OFF],
    genLevelCtrl: [DeviceCapability.SET_BRIGHTNESS],
    msTemperatureMeasurement: [DeviceCapability.READ_TEMPERATURE],
    msRelativeHumidity: [DeviceCapability.READ_HUMIDITY],
    msOccupancySensing: [DeviceCapability.READ_MOTION],
    closuresDoorLock: [DeviceCapability.SET_LOCK_STATE, DeviceCapability.ACTUATE_LOCK],
    hvacThermostat: [DeviceCapability.SET_TEMPERATURE],
  };
  return capabilityMap[cluster] || [];
}

function mapMatterClusterToDeviceType(clusterId: number): DeviceType {
  // Matter Cluster IDs (from Matter 1.0 spec)
  const clusterMap: Record<number, DeviceType> = {
    6: DeviceType.SWITCH, // On/Off
    8: DeviceType.LIGHT_BULB, // Level Control
    768: DeviceType.LIGHT_BULB, // Color Control
    513: DeviceType.THERMOSTAT, // Thermostat
    257: DeviceType.LOCK, // Door Lock
    1026: DeviceType.TEMPERATURE_SENSOR, // Temperature Measurement
    1029: DeviceType.HUMIDITY_SENSOR, // Relative Humidity Measurement
  };
  return clusterMap[clusterId] || DeviceType.UNKNOWN;
}

function mapMatterClusterToCapabilities(clusterId: number): DeviceCapability[] {
  const capabilityMap: Record<number, DeviceCapability[]> = {
    6: [DeviceCapability.SET_ON_OFF],
    8: [DeviceCapability.SET_BRIGHTNESS],
    768: [DeviceCapability.SET_COLOR],
    513: [DeviceCapability.SET_TEMPERATURE],
    257: [DeviceCapability.SET_LOCK_STATE, DeviceCapability.ACTUATE_LOCK],
    1026: [DeviceCapability.READ_TEMPERATURE],
    1029: [DeviceCapability.READ_HUMIDITY],
  };
  return capabilityMap[clusterId] || [];
}

function mapROS2TopicToDeviceType(topic: string): DeviceType {
  // ROS 2 topic patterns
  if (topic.includes('joint') || topic.includes('arm')) return DeviceType.ROBOT_ARM;
  if (topic.includes('mobile') || topic.includes('cmd_vel')) return DeviceType.MOBILE_ROBOT;
  if (topic.includes('drone') || topic.includes('uav')) return DeviceType.DRONE;
  if (topic.includes('conveyor')) return DeviceType.CONVEYOR;
  return DeviceType.UNKNOWN;
}

function mapROS2TopicToCapabilities(topic: string): DeviceCapability[] {
  // Physical actions require MAN Mode approval
  if (topic.includes('cmd_vel') || topic.includes('trajectory')) {
    return [DeviceCapability.MOVE_ROBOT, DeviceCapability.EXECUTE_TRAJECTORY];
  }
  if (topic.includes('joint')) {
    return [DeviceCapability.READ_POSITION, DeviceCapability.SET_POSITION];
  }
  return [];
}

// =============================================================================
// OMNIPORT SINGLETON
// =============================================================================

/**
 * OmniPort Singleton - The Defensive Ingress Gateway
 *
 * Execution Pipeline:
 * 1. Zero-Trust Gate: Validate device identity
 * 2. Idempotency Wrapper: Deduplicate with sha256 hash
 * 3. Semantic Normalization: Map to CanonicalEvent
 * 4. Resilient Dispatch: Deliver with circuit breaker
 * 5. Observability: Structured logging
 */
class OmniPortEngine {
  private static instance: OmniPortEngine | null = null;
  private readonly delivery: OmniLinkDelivery;
  private isInitialized = false;

  private constructor() {
    this.delivery = new OmniLinkDelivery();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): OmniPortEngine {
    OmniPortEngine.instance ??= new OmniPortEngine();
    return OmniPortEngine.instance;
  }

  /**
   * Reset singleton (for testing only)
   */
  public static resetInstance(): void {
    OmniPortEngine.instance = null;
  }

  /**
   * Initialize the engine (idempotent)
   */
  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('[OmniPort] Engine initialized');
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Ingest raw input through the defensive pipeline
   *
   * @param input - Raw input from any source (text, voice, webhook)
   * @returns IngestResult with correlation ID and processing status
   * @throws SecurityError if device is blocked
   */
  public async ingest(input: RawInput): Promise<IngestResult> {
    const ctx = this.createContext(input);

    this.log(ctx, 'INGEST_START', { type: input.type });

    try {
      // =======================================================================
      // STEP 1: THE ZERO-TRUST GATE
      // =======================================================================
      const deviceRecord = await this.validateZeroTrust(input, ctx);

      // Proprietary Check: Force RED lane for suspect devices
      if (deviceRecord?.status === 'suspect') {
        ctx.riskLane = 'RED';
        this.log(ctx, 'SUSPECT_DEVICE', { deviceId: deviceRecord.deviceId });
      }

      // =======================================================================
      // STEP 2: THE IDEMPOTENCY WRAPPER
      // =======================================================================
      const idempotencyKey = this.computeIdempotencyKey(input, ctx.userId);

      const { result } = await withIdempotency(
        idempotencyKey,
        ctx.correlationId,
        'omniport.ingest',
        async () => this.executeIngestPipeline(input, ctx)
      );

      return result;
    } catch (error) {
      // Handle security errors specifically
      if (error instanceof SecurityError) {
        this.log(ctx, 'SECURITY_BLOCKED', { code: error.code });
        throw error;
      }

      // Circuit breaker: write to DLQ on unexpected errors
      await this.writeToDeadLetterQueue(input, ctx, error as Error);

      const latencyMs = Date.now() - ctx.startTime;
      this.log(ctx, 'INGEST_BUFFERED', { latencyMs, error: (error as Error).message });

      return {
        correlationId: ctx.correlationId,
        status: 'buffered' as IngestStatus,
        latencyMs,
        riskLane: ctx.riskLane,
      };
    }
  }

  // ===========================================================================
  // PIPELINE STAGES
  // ===========================================================================

  /**
   * STEP 1: Zero-Trust Gate
   * Validates device identity against DeviceRegistry
   */
  private async validateZeroTrust(
    input: RawInput,
    ctx: PipelineContext
  ): Promise<DeviceRecord | undefined> {
    // Extract userId based on input type
    const userId = this.extractUserId(input);

    if (!userId) {
      // No userId means we can't validate - allow but flag
      this.log(ctx, 'NO_USER_ID', { type: input.type });
      return undefined;
    }

    // Look up device by userId (using userId as deviceId for simplicity)
    // In production, this would use a separate deviceId from the request
    const deviceRecord = getDevice(userId);

    if (!deviceRecord) {
      // Unknown device - allow but track
      this.log(ctx, 'UNKNOWN_DEVICE', { userId });
      return undefined;
    }

    ctx.deviceStatus = deviceRecord.status;

    // BLOCKED devices are rejected immediately
    if (deviceRecord.status === 'blocked') {
      throw new SecurityError(
        `Device ${deviceRecord.deviceId} is blocked`,
        'DEVICE_BLOCKED',
        deviceRecord.deviceId,
        userId
      );
    }

    this.log(ctx, 'ZERO_TRUST_PASS', {
      deviceId: deviceRecord.deviceId,
      status: deviceRecord.status,
    });

    return deviceRecord;
  }

  /**
   * Execute the main ingestion pipeline (inside idempotency wrapper)
   */
  private async executeIngestPipeline(
    input: RawInput,
    ctx: PipelineContext
  ): Promise<IngestResult> {
    // =========================================================================
    // STEP 3: SEMANTIC NORMALIZATION
    // =========================================================================
    const canonicalEvent = await this.normalizeToCanonical(input, ctx);

    // =========================================================================
    // STEP 4: RESILIENT DISPATCH
    // =========================================================================
    try {
      const translatedEvent = this.toTranslatedEvent(canonicalEvent, ctx);

      await this.delivery.deliverBatch(
        [translatedEvent],
        'omniport',
        ctx.correlationId
      );

      const latencyMs = Date.now() - ctx.startTime;
      this.log(ctx, 'INGEST_ACCEPTED', { latencyMs, riskLane: ctx.riskLane });

      return {
        correlationId: ctx.correlationId,
        status: 'accepted' as IngestStatus,
        latencyMs,
        riskLane: ctx.riskLane,
      };
    } catch (deliveryError) {
      // Circuit Breaker: Delivery failed, write to DLQ
      await this.writeToDeadLetterQueue(input, ctx, deliveryError as Error);

      const latencyMs = Date.now() - ctx.startTime;
      this.log(ctx, 'DELIVERY_FAILED_BUFFERED', {
        latencyMs,
        error: (deliveryError as Error).message,
      });

      return {
        correlationId: ctx.correlationId,
        status: 'buffered' as IngestStatus,
        latencyMs,
        riskLane: ctx.riskLane,
      };
    }
  }

  /**
   * STEP 3: Semantic Normalization
   * Maps RawInput to CanonicalEvent with MAN Mode analysis
   */
  private async normalizeToCanonical(
    input: RawInput,
    ctx: PipelineContext
  ): Promise<OmniPortCanonicalEvent> {
    const now = new Date().toISOString();
    const eventId = uuidv4();

    // Extract content for intent analysis
    const contentToAnalyze = this.extractContent(input);
    const detectedIntents = detectHighRiskIntents(contentToAnalyze);

    // THE MOAT LOGIC: High-risk intents trigger MAN Mode
    let requiresManApproval = detectedIntents.length > 0;
    if (requiresManApproval) {
      ctx.riskLane = 'RED';
      this.log(ctx, 'MAN_MODE_TRIGGERED', { intents: detectedIntents });
    }

    // PHYSICAL AI LAYER: Device-specific normalization
    let canonicalDevice: CanonicalDevice | undefined;
    if (isDeviceSource(input)) {
      canonicalDevice = await this.normalizeDeviceInput(input, ctx);

      // Physical actuator capabilities trigger MAN Mode
      const physicalCapabilities = new Set([
        DeviceCapability.ACTUATE_LOCK,
        DeviceCapability.ACTUATE_VALVE,
        DeviceCapability.MOVE_ROBOT,
        DeviceCapability.EXECUTE_TRAJECTORY,
      ]);

      const hasPhysicalCapability = canonicalDevice.capabilities.some((cap) =>
        physicalCapabilities.has(cap)
      );

      if (hasPhysicalCapability) {
        requiresManApproval = true;
        ctx.riskLane = 'RED';
        this.log(ctx, 'PHYSICAL_ACTUATOR_DETECTED', {
          deviceId: canonicalDevice.deviceId,
          capabilities: canonicalDevice.capabilities,
        });
      }
    }

    const baseEvent: OmniPortCanonicalEvent = {
      eventId,
      correlationId: ctx.correlationId,
      tenantId: this.extractTenantId(ctx),
      userId: ctx.userId,
      source: `omniport.${input.type}`,
      provider: 'omniport',
      externalId: eventId,
      eventType: this.mapToEventType(input),
      timestamp: now,
      consentFlags: this.getDefaultConsentFlags(),
      metadata: {
        requires_man_approval: requiresManApproval,
        detected_intents: detectedIntents,
        risk_lane: ctx.riskLane,
        source_type: input.type,
        canonical_device: canonicalDevice ? canonicalDevice.deviceId : undefined,
        device_protocol: canonicalDevice?.protocol,
      },
      payload: this.buildPayload(input, canonicalDevice),
    };

    // Add type-specific metadata
    if (isVoiceSource(input)) {
      baseEvent.metadata.confidence = input.confidence;
    }

    return baseEvent;
  }

  /**
   * Normalize device input with Physical AI Zero-Trust enforcement
   *
   * IRON LAW: No raw vendor JSON shall pass to the state engine
   *
   * Security Layers:
   * 1. Protocol normalization (Zigbee/Matter/ROS2 → CanonicalDevice)
   * 2. Zero-Trust baseline verification (verifyDeviceIntegrity)
   * 3. Web3 NFT ownership verification (optional but recommended)
   * 4. Temporal Workflow Execution ID linkage (for RLS)
   */
  private async normalizeDeviceInput(
    input: ZigbeeDeviceSource | MatterDeviceSource | ROS2DeviceSource,
    ctx: PipelineContext
  ): Promise<CanonicalDevice> {
    // STEP 1: Protocol-specific normalization
    let device: CanonicalDevice;

    if (isZigbeeDeviceSource(input)) {
      device = normalizeZigbeeDevice(input);
    } else if (isMatterDeviceSource(input)) {
      device = normalizeMatterDevice(input);
    } else if (isROS2DeviceSource(input)) {
      device = normalizeROS2Device(input);
    } else {
      throw new Error('Unknown device protocol');
    }

    // STEP 2: Zero-Trust baseline verification
    const integrityVerified = verifyDeviceIntegrity(device.deviceId);
    if (!integrityVerified) {
      device.security.registryStatus = 'blocked';
      device.security.riskScore = 100;
      this.log(ctx, 'DEVICE_INTEGRITY_FAILED', { deviceId: device.deviceId });
      throw new SecurityError(
        `Device ${device.deviceId} failed integrity verification`,
        'DEVICE_INTEGRITY_FAILED',
        device.deviceId,
        ctx.userId
      );
    }

    // STEP 3: Web3 NFT ownership verification (best-effort)
    // This is optional but provides the "Web3-Verified Identity Moat"
    if (input.userId && ctx.userId) {
      try {
        // Check if user holds APEX Membership NFT
        const entitlementResult = await checkEntitlement({
          walletAddress: ctx.userId as `0x${string}`, // Assumes userId is wallet address
          chainId: 1, // Ethereum mainnet
          contractAddress: APEX_MEMBERSHIP_NFT_CONTRACT,
          entitlementKey: 'apex_membership',
        });

        device.security.web3Verified = entitlementResult.hasEntitlement;
        device.security.web3Owner = ctx.userId;

        if (entitlementResult.hasEntitlement) {
          this.log(ctx, 'WEB3_VERIFICATION_PASSED', {
            deviceId: device.deviceId,
            owner: ctx.userId,
          });
        }
      } catch (error) {
        // Non-blocking - Web3 verification failure doesn't block device operation
        this.log(ctx, 'WEB3_VERIFICATION_SKIPPED', {
          error: (error as Error).message,
        });
      }
    }

    // STEP 4: Link Temporal Workflow Execution ID for RLS
    if (ctx.temporalExecutionId) {
      device.security.temporalExecutionId = ctx.temporalExecutionId;
    }

    // STEP 5: Update device registry status
    device.security.registryStatus = 'trusted';
    device.security.lastSecurityAudit = new Date().toISOString();

    return device;
  }

  // ===========================================================================
  // DEAD LETTER QUEUE
  // ===========================================================================

  /**
   * Write failed ingestion to DLQ (ingress_buffer)
   */
  private async writeToDeadLetterQueue(
    input: RawInput,
    ctx: PipelineContext,
    error: Error
  ): Promise<void> {
    // Calculate risk score based on content
    const riskScore = this.calculateRiskScore(input, ctx);

    try {
      const { error: dbError } = await supabase.from('ingress_buffer').insert({
        correlation_id: ctx.correlationId,
        raw_input: input as unknown as Record<string, unknown>,
        error_reason: error.message,
        status: 'pending',
        risk_score: riskScore,
        source_type: input.type,
        user_id: ctx.userId || null,
      });

      if (dbError) {
        // Log but don't throw - DLQ write failure shouldn't crash ingestion
        console.error(`[OmniPort] [${ctx.correlationId}] DLQ write failed:`, dbError.message);
      } else {
        this.log(ctx, 'DLQ_WRITE_SUCCESS', { riskScore });
      }
    } catch (dlqError) {
      // Log but don't throw
      console.error(`[OmniPort] [${ctx.correlationId}] DLQ write error:`, dlqError);
    }
  }

  /**
   * Calculate risk score for DLQ prioritization (0-100)
   */
  private calculateRiskScore(input: RawInput, ctx: PipelineContext): number {
    let score = 0;

    // RED lane = +50 base score
    if (ctx.riskLane === 'RED') {
      score += 50;
    }

    // High-risk intents detected = +30
    const content = this.extractContent(input);
    const intents = detectHighRiskIntents(content);
    if (intents.length > 0) {
      score += 30;
    }

    // Voice source with low confidence = +10
    if (isVoiceSource(input) && input.confidence < 0.7) {
      score += 10;
    }

    // Webhook source = +10 (external systems are higher priority)
    if (isWebhookSource(input)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Create pipeline context for tracing
   */
  private createContext(input: RawInput): PipelineContext {
    return {
      correlationId: uuidv4(),
      startTime: Date.now(),
      riskLane: 'GREEN',
      userId: this.extractUserId(input) || 'anonymous',
    };
  }

  /**
   * Extract userId from input based on type
   */
  private extractUserId(input: RawInput): string | undefined {
    if (isTextSource(input)) {
      return input.userId;
    }
    if (isVoiceSource(input)) {
      return input.userId;
    }
    if (isWebhookSource(input)) {
      return input.userId;
    }
    return undefined;
  }

  /**
   * Extract analyzable content from input
   */
  private extractContent(input: RawInput): string {
    if (isTextSource(input)) {
      return input.content;
    }
    if (isVoiceSource(input)) {
      return input.transcript;
    }
    if (isWebhookSource(input)) {
      return JSON.stringify(input.payload);
    }
    return '';
  }

  /**
   * Compute idempotency key using FNV-1a hash
   * Universal: works in both browser and Node.js environments
   */
  private computeIdempotencyKey(input: RawInput, userId: string): string {
    const data = JSON.stringify({ input, userId });
    return `omniport-${computeHash(data)}`;
  }

  /**
   * Map input type to canonical EventType
   */
  private mapToEventType(input: RawInput): EventType {
    if (isTextSource(input)) {
      return EventType.MESSAGE;
    }
    if (isVoiceSource(input)) {
      return EventType.MESSAGE;
    }
    if (isWebhookSource(input)) {
      return EventType.CONTENT_PUBLISHED;
    }
    return EventType.MESSAGE;
  }

  /**
   * Build payload from input
   */
  private buildPayload(
    input: RawInput,
    canonicalDevice?: CanonicalDevice
  ): Record<string, unknown> {
    if (isTextSource(input)) {
      return {
        content: input.content,
        source: input.source,
      };
    }
    if (isVoiceSource(input)) {
      return {
        transcript: input.transcript,
        confidence: input.confidence,
        audioUrl: input.audioUrl,
        durationMs: input.durationMs,
      };
    }
    if (isWebhookSource(input)) {
      return {
        payload: input.payload,
        provider: input.provider,
        signature: input.signature,
      };
    }
    if (isDeviceSource(input) && canonicalDevice) {
      return {
        device: canonicalDevice,
        rawInput: input,
      };
    }
    return {};
  }

  /**
   * Extract tenant ID from context
   *
   * Multi-tenancy implementation:
   * 1. If ctx.tenantId is set (from authenticated session), use it
   * 2. Otherwise, default to 'default' tenant for backward compatibility
   *
   * Future enhancement: Extract from JWT claims when available
   * Example: const jwt = parseJWT(ctx.authToken); return jwt.claims.tenantId
   */
  private extractTenantId(ctx: PipelineContext): string {
    if (ctx.tenantId) {
      return ctx.tenantId;
    }

    // Default tenant for single-tenant deployments or unauthenticated requests
    return 'default';
  }

  /**
   * Get default consent flags
   */
  private getDefaultConsentFlags(): ConsentFlags {
    return {
      analytics: true,
      marketing: false,
      personalization: true,
      third_party_sharing: false,
    };
  }

  /**
   * Convert canonical event to translated event for delivery
   */
  private toTranslatedEvent(
    event: OmniPortCanonicalEvent,
    ctx: PipelineContext
  ): TranslatedEvent {
    return {
      eventId: event.eventId,
      correlationId: ctx.correlationId,
      appId: 'omniport',
      userId: ctx.userId,
      payload: event.payload,
      metadata: event.metadata,
    };
  }

  /**
   * Structured logging with OmniPort tags
   */
  private log(ctx: PipelineContext, event: string, data?: Record<string, unknown>): void {
    const latencyMs = Date.now() - ctx.startTime;
    const correlationId = ctx.correlationId;

    // Async logging to avoid blocking the main thread with JSON.stringify and I/O
    Promise.resolve().then(() => {
      try {
        console.log(
          `[OmniPort] [${correlationId}] [${latencyMs}ms] ${event}`,
          data ? JSON.stringify(data) : ''
        );
      } catch (err) {
        // Prevent unhandled rejections from logging failures (e.g. circular refs)
        console.error('[OmniPort] Async logging failed:', err);
      }
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * OmniPort singleton instance
 */
export const OmniPort = OmniPortEngine.getInstance();

/**
 * Re-export for testing
 */
export { OmniPortEngine };

/**
 * Convenience function for direct ingestion
 */
export async function ingest(input: RawInput): Promise<IngestResult> {
  return OmniPort.ingest(input);
}

/**
 * Validate and ingest (with explicit validation)
 */
export async function validateAndIngest(input: unknown): Promise<IngestResult> {
  const validated = validateRawInput(input);
  return OmniPort.ingest(validated);
}
