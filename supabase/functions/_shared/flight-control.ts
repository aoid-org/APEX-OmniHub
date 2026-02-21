
import { PiiScanner } from "./pii-scanner.ts";
import type { LLMMessage } from "./llm.ts";

/**
 * Flight Control - Safety Orchestration Layer
 * Enforces safety policies on input (pre-flight) and output (post-flight).
 */

export interface SafetyResult {
  allowed: boolean;
  redacted?: boolean;
  violation?: string;
  modifiedContent?: string;
}

export class FlightControl {
  /**
   * Pre-Flight Checks: Input Validation
   * Detects prompt injection attempts before they reach the LLM.
   */
  public static preFlight(messages: LLMMessage[]): SafetyResult {
    const combinedInput = messages.map(m => m.content).join("\n");
    
    // Basic Prompt Injection Patterns (Regex-based)
    // "Ignore all previous instructions", "You are now DAN", etc.
    const injectionPatterns = [
      /ignore\s+all\s+previous\s+instructions/i,
      /you\s+are\s+now\s+dan/i,
      /jailbreak/i,
      /system\s+override/i
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(combinedInput)) {
        return {
          allowed: false,
          violation: "PROMPT_INJECTION_DETECTED",
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Post-Flight Checks: Output Safety
   * Scans LLM output for PII leakage.
   */
  public static postFlight(content: string): SafetyResult {
    const scanResult = PiiScanner.scan(content);

    if (scanResult.hasPii) {
      return {
        allowed: true, // We allow the response but Redact it (Sanitize)
        redacted: true,
        violation: "PII_LEAKAGE_SANITIZED",
        modifiedContent: scanResult.redactedText,
      };
    }

    return { allowed: true };
  }
}
