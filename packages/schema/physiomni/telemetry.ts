import { z } from 'zod';

export const PhysiOmniTelemetrySchema = z.object({
  device_id: z.string().min(1),
  tenant_id: z.string().min(1),
  timestamp: z.string().datetime(),
  nonce: z.string().min(16), // Prevent replay attacks
  signature: z.string().min(64), // HMAC or similar verifying the payload
  payload: z.object({
    vibration_x: z.number(),
    vibration_y: z.number(),
    vibration_z: z.number(),
    temp_c: z.number(),
  }),
});

export type PhysiOmniTelemetry = z.infer<typeof PhysiOmniTelemetrySchema>;

export const PhysiOmniActionSchema = z.object({
  device_id: z.string().min(1),
  tenant_id: z.string().min(1),
  action: z.enum(['MAN_MODE_TRIGGER', 'EMERGENCY_STOP', 'CALIBRATE', 'RESTART']),
  approved_by: z.string().nullable().optional(), // Must be present if RSI approval required
  bypass_policy: z.string().nullable().optional(), // Reason if auto-approved
});

export type PhysiOmniAction = z.infer<typeof PhysiOmniActionSchema>;
