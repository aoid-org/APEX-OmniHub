import { z } from 'zod';

// Evidence schemas (enforces Iron Law)
export const TestEvidenceSchema = z.object({
  type: z.literal('test_result'),
  timestamp: z.string().datetime(),
  exitCode: z.number(),
  coverage: z.number().min(0).max(100),
  logPath: z.string(),
  modifiedFiles: z.array(z.string()),
});

export const VisualEvidenceSchema = z.object({
  type: z.literal('visual_verification'),
  timestamp: z.string().datetime(),
  screenshotPath: z.string(),
  videoPath: z.string().optional(),
  pixelDiffScore: z.number().min(0).max(100),
  accessibilityScore: z.number().min(0).max(100),
  viewports: z.array(z.enum(['mobile', 'tablet', 'desktop'])),
});

export const SecurityEvidenceSchema = z.object({
  type: z.literal('security_scan'),
  timestamp: z.string().datetime(),
  vulnerabilities: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  shadowPromptAttempts: z.number(),
  reportPath: z.string(),
});

export const VerificationResultSchema = z.object({
  taskId: z.string(),
  status: z.enum(['APPROVED', 'REJECTED', 'REQUIRES_HUMAN_REVIEW']),
  evidence: z.array(
    z.union([TestEvidenceSchema, VisualEvidenceSchema, SecurityEvidenceSchema])
  ),
  reason: z.string().optional(),
  timestamp: z.string().datetime(),
  verificationLatencyMs: z.number(),
});

export type TestEvidence = z.infer<typeof TestEvidenceSchema>;
export type VisualEvidence = z.infer<typeof VisualEvidenceSchema>;
export type SecurityEvidence = z.infer<typeof SecurityEvidenceSchema>;
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

// Agent task interface
export interface AgentTask {
  id: string;
  description: string;
  modifiedFiles: string[];
  touchesUI: boolean;
  touchesSecurity: boolean;
  timestamp: string;
}
