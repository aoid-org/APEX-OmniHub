/**
 * Validation Types for OmniConnect
 */

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
  code?: string;
}
