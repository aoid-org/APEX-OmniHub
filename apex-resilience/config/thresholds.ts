/**
 * APEX Resilience Framework Thresholds
 * Tuned from 90 days of production data (Nov 2025 - Jan 2026)
 */

export const VERIFICATION_THRESHOLDS = {
  // Layer 1: Deductive Reasoning
  TEST_COVERAGE_MIN: 80, // % - Minimum test coverage for modified files
  TEST_TIMEOUT_MS: 30000, // 30 seconds max for test suite

  // Layer 2: Visual Truth
  PIXEL_DIFF_THRESHOLD: 5, // % - Max acceptable pixel difference
  ACCESSIBILITY_SCORE_MIN: 95, // Axe score minimum
  VISUAL_VERIFICATION_TIMEOUT_MS: 60000, // 60 seconds for Playwright

  // Layer 3: Security
  CRITICAL_VULN_TOLERANCE: 0, // Zero tolerance for critical vulnerabilities
  HIGH_VULN_TOLERANCE: 0, // Zero tolerance for high vulnerabilities
  SHADOW_PROMPT_PATTERNS: [
    /ignore\s+previous\s+instructions?/i,
    /<system_instruction>/i,
    /<user>/i,
    /new\s+instructions?:/i,
    /disregard\s+all/i,
  ],

  // Performance
  TOTAL_VERIFICATION_LATENCY_MAX_MS: 10000, // 10 seconds total overhead
} as const;

export const ESCALATION_RULES = {
  // When to require human review
  requireHumanReview: {
    visualDiffAboveThreshold: true,
    securityVulnerabilitiesFound: true,
    testCoverageBelowThreshold: true,
    firstTimeModifyingCriticalFile: true,
  },

  // Critical files that always require human approval
  criticalFilePaths: [
    /\/auth\//,
    /\/security\//,
    /\/payment\//,
    /\.env/,
    /config\/production/,
  ],
} as const;
