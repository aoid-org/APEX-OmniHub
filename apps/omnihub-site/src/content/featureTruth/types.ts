> **Historical Note:** This document contains legacy certification terminology. It has been superseded by the manual owner-approval process. CI now produces factual validation summaries only. CI validates. Owner certifies.

/**
 * Feature Truth Ledger — shared type contracts.
 *
 * Extracted from the former monolithic `featureTruth.ts` so the ledger data,
 * its types, and the Tech Specs projection each live as a single-responsibility
 * module under the governance module-size limit. The public surface is
 * re-exported unchanged from `content/featureTruth.ts`.
 *
 * Status discipline:
 *  - CERTIFIED_FUNCTIONING    implementation + evidence in-repo; safe to ship.
 *  - BACKEND_FOUNDATION_ONLY  substrate present; not a shipped capability.
 *  - REQUIRES_OWNER_VALIDATION needs real-device/owner action before claiming.
 *  - ROADMAP_ONLY             planned; must not appear in production.
 *  - HIDDEN_FOR_RELEASE       unsupported as worded; removed from production.
 *  - NO_GO_BLOCKER            would fail release if shown.
 */

export type FeatureTruthStatus =
  | 'CERTIFIED_FUNCTIONING'
  | 'BACKEND_FOUNDATION_ONLY'
  | 'ROADMAP_ONLY'
  | 'HIDDEN_FOR_RELEASE'
  | 'REQUIRES_OWNER_VALIDATION'
  | 'NO_GO_BLOCKER';

export type FeatureTruthCategory =
  | 'brain'
  | 'senses'
  | 'identity'
  | 'conscience'
  | 'memory'
  | 'immune';

export interface FeatureClaim {
  readonly id: string;
  readonly label: string;
  readonly category: FeatureTruthCategory;
  readonly status: FeatureTruthStatus;
  /** Original public marketing copy (pre-certification). */
  readonly publicCopy: string;
  /** Release-safe, factual copy. Required when status is CERTIFIED_FUNCTIONING. */
  readonly releaseCopy: string | null;
  readonly evidence: readonly string[];
  readonly uiRoutes: readonly string[];
  readonly apiRoutes: readonly string[];
  readonly dataStores: readonly string[];
  readonly tests: readonly string[];
  readonly ownerValidationRequired: boolean;
  readonly notes: string;
}

export interface TechSpecSection {
  readonly id: FeatureTruthCategory;
  readonly title: string;
  readonly description: string;
  readonly details: readonly string[];
}
