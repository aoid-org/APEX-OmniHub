/**
 * APEX Resilience Protocol - Main Entry Point
 * Production-grade verification framework for APEX-OmniHub
 */

export { IronLawVerifier } from './core/iron-law';
export { verifyAgentTaskActivity } from './integrations/temporal-hooks';
export { VERIFICATION_THRESHOLDS, ESCALATION_RULES } from './config/thresholds';
export {
  writeSecureEvidence,
  getSecureEvidenceDir,
  createSecureEvidenceDir,
  generateEvidenceHash,
  cleanupEvidenceDir,
} from './core/evidence-storage';
export type {
  AgentTask,
  VerificationResult,
  TestEvidence,
  VisualEvidence,
  SecurityEvidence,
} from './core/types';
export {
  TestEvidenceSchema,
  VisualEvidenceSchema,
  SecurityEvidenceSchema,
  VerificationResultSchema,
} from './core/types';
