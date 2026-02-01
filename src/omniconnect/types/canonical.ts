/**
 * Canonical Event Schema for OmniConnect
 * Standardized event format for all provider data ingestion
 */

export enum EventType {
  // Social Media Events
  SOCIAL_POST_VIEWED = 'social_post_viewed',
  SOCIAL_POST_SAVED = 'social_post_saved',
  SOCIAL_POST_SHARED = 'social_post_shared',
  COMMENT = 'comment',
  MESSAGE = 'message',
  REACTION = 'reaction',

  // Business/Advertising Events
  AD_INSIGHT = 'ad_insight',
  PAGE_INSIGHT = 'page_insight',
  CAMPAIGN_PERFORMANCE = 'campaign_performance',
  AUDIENCE_INSIGHT = 'audience_insight',

  // Engagement Events
  PROFILE_VIEW = 'profile_view',
  CONNECTION_REQUEST = 'connection_request',
  FOLLOW = 'follow',
  UNFOLLOW = 'unfollow',

  // Content Events
  CONTENT_PUBLISHED = 'content_published',
  CONTENT_UPDATED = 'content_updated',
  CONTENT_DELETED = 'content_deleted',
}

export enum ConsentType {
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  PERSONALIZATION = 'personalization',
  THIRD_PARTY_SHARING = 'third_party_sharing',
}

export interface ConsentFlags {
  [ConsentType.ANALYTICS]?: boolean;
  [ConsentType.MARKETING]?: boolean;
  [ConsentType.PERSONALIZATION]?: boolean;
  [ConsentType.THIRD_PARTY_SHARING]?: boolean;
}

export interface CanonicalEvent {
  /** Unique event identifier */
  eventId: string;

  /** Correlation ID for tracing end-to-end */
  correlationId: string;

  /** Tenant isolation */
  tenantId: string;

  /** User isolation */
  userId: string;

  /** Data source identifier */
  source: string;

  /** Provider name (meta_business, linkedin, twitter, etc.) */
  provider: string;

  /** External system identifier */
  externalId: string;

  /** Standardized event type */
  eventType: EventType;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** User consent flags */
  consentFlags: ConsentFlags;

  /** Provider-specific metadata */
  metadata: Record<string, unknown>;

  /** Standardized payload */
  payload: Record<string, unknown>;
}

export interface EventEnvelope {
  eventId: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  eventType: EventType;
  payload: CanonicalEvent;
  timestamp: string;
  schemaVersion: string;
}

// ============================================================================
// PHYSICAL AI ORCHESTRATION: Canonical Device Primitives
// ============================================================================

/**
 * Universal Device Primitive (UDP) - Protocol-agnostic device representation
 * Normalizes Zigbee, Matter, ROS 2 DDS, and other IoT protocols into a single schema
 */
export interface CanonicalDevice {
  /** Unique device identifier (normalized across protocols) */
  deviceId: string;

  /** Device name (human-readable) */
  name: string;

  /** Device type classification */
  deviceType: DeviceType;

  /** Protocol used (zigbee, matter, ros2, mqtt, etc.) */
  protocol: DeviceProtocol;

  /** Current device state */
  state: DeviceState;

  /** Device capabilities (normalized across protocols) */
  capabilities: DeviceCapability[];

  /** Current sensor/actuator values */
  attributes: Record<string, unknown>;

  /** Device metadata (manufacturer, model, firmware, etc.) */
  metadata: DeviceMetadata;

  /** Last seen timestamp (ISO 8601) */
  lastSeen: string;

  /** Network/connectivity status */
  connectivity: ConnectivityStatus;

  /** Security context for zero-trust verification */
  security: DeviceSecurityContext;
}

/**
 * Device Type Classification
 */
export enum DeviceType {
  // Sensors
  TEMPERATURE_SENSOR = 'temperature_sensor',
  HUMIDITY_SENSOR = 'humidity_sensor',
  MOTION_SENSOR = 'motion_sensor',
  CONTACT_SENSOR = 'contact_sensor',
  LIGHT_SENSOR = 'light_sensor',
  PRESSURE_SENSOR = 'pressure_sensor',

  // Actuators
  LIGHT_BULB = 'light_bulb',
  SWITCH = 'switch',
  LOCK = 'lock',
  THERMOSTAT = 'thermostat',
  VALVE = 'valve',
  MOTOR = 'motor',

  // Robotics (ROS 2)
  ROBOT_ARM = 'robot_arm',
  MOBILE_ROBOT = 'mobile_robot',
  DRONE = 'drone',
  CONVEYOR = 'conveyor',

  // Composite
  SMART_PLUG = 'smart_plug',
  CAMERA = 'camera',
  SPEAKER = 'speaker',
  HUB = 'hub',

  // Generic
  UNKNOWN = 'unknown',
}

/**
 * Device Protocol
 */
export enum DeviceProtocol {
  ZIGBEE = 'zigbee',
  MATTER = 'matter',
  ROS2_DDS = 'ros2_dds',
  MQTT = 'mqtt',
  MODBUS = 'modbus',
  OPCUA = 'opcua',
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  UNKNOWN = 'unknown',
}

/**
 * Device State
 */
export enum DeviceState {
  ONLINE = 'online',
  OFFLINE = 'offline',
  IDLE = 'idle',
  ACTIVE = 'active',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  UNKNOWN = 'unknown',
}

/**
 * Device Capability (normalized actions)
 */
export enum DeviceCapability {
  // Read capabilities
  READ_TEMPERATURE = 'read_temperature',
  READ_HUMIDITY = 'read_humidity',
  READ_MOTION = 'read_motion',
  READ_CONTACT = 'read_contact',
  READ_LIGHT_LEVEL = 'read_light_level',
  READ_PRESSURE = 'read_pressure',
  READ_POSITION = 'read_position',

  // Write capabilities
  SET_ON_OFF = 'set_on_off',
  SET_BRIGHTNESS = 'set_brightness',
  SET_COLOR = 'set_color',
  SET_TEMPERATURE = 'set_temperature',
  SET_LOCK_STATE = 'set_lock_state',
  SET_POSITION = 'set_position',
  SET_SPEED = 'set_speed',

  // Physical actions (CRITICAL - require MAN Mode approval)
  ACTUATE_LOCK = 'actuate_lock',
  ACTUATE_VALVE = 'actuate_valve',
  MOVE_ROBOT = 'move_robot',
  EXECUTE_TRAJECTORY = 'execute_trajectory',
}

/**
 * Device Metadata
 */
export interface DeviceMetadata {
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  serialNumber?: string;
  installationDate?: string;
  location?: string;
  tags?: string[];
}

/**
 * Connectivity Status
 */
export interface ConnectivityStatus {
  online: boolean;
  signalStrength?: number; // RSSI or similar (dBm)
  linkQuality?: number; // 0-255 for Zigbee, 0-100 for others
  lastSeenTimestamp: string;
  ipAddress?: string;
  macAddress?: string;
}

/**
 * Device Security Context (Zero-Trust)
 */
export interface DeviceSecurityContext {
  /** Device registry status (from deviceRegistry.ts) */
  registryStatus: 'trusted' | 'suspect' | 'blocked' | 'unknown';

  /** Web3 verification (NFT-based device ownership) */
  web3Verified?: boolean;
  web3Owner?: string; // Ethereum address

  /** Temporal Workflow Execution ID (for RLS) */
  temporalExecutionId?: string;

  /** Last security audit timestamp */
  lastSecurityAudit?: string;

  /** Security risk score (0-100, 0 = safe, 100 = critical) */
  riskScore?: number;
}

/**
 * Device Command (for actuators)
 */
export interface DeviceCommand {
  deviceId: string;
  capability: DeviceCapability;
  parameters: Record<string, unknown>;
  requestedBy: string; // userId
  requestedAt: string;
  workflowExecutionId?: string; // Temporal execution ID for audit
  requiresManApproval?: boolean;
}