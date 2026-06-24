> **Historical Note:** This document contains legacy certification terminology. It has been superseded by the manual owner-approval process. CI now produces factual validation summaries only. CI validates. Owner certifies.

/**
 * Feature Truth Ledger — single source of truth for public Tech Specs claims.
 *
 * Every public capability claim that appears (or could appear) on the
 * production Tech Specs page is represented here exactly once. The production
 * page renders ONLY claims with status `CERTIFIED_FUNCTIONING`, projected
 * through `certifiedTechSpecSections`. Non-certified claims are retained for
 * auditability but are never displayed as shipped capabilities.
 *
 * The ledger data is split into single-responsibility category slices under
 * `./featureTruth/` to keep every module within the governance size limit;
 * this file composes them into the canonical `featureTruthLedger` and projects
 * the certified Tech Specs sections. The public API is unchanged.
 *
 * Evidence paths are repo-relative and verifiable. Do not add a claim here
 * without a corresponding evidence path.
 */

import type {
  FeatureClaim,
  FeatureTruthCategory,
  TechSpecSection,
} from './featureTruth/types';
import { brainSensesClaims } from './featureTruth/claims.brainSenses';
import { identityConscienceClaims } from './featureTruth/claims.identityConscience';
import { memoryImmuneClaims } from './featureTruth/claims.memoryImmune';

export type {
  FeatureTruthStatus,
  FeatureTruthCategory,
  FeatureClaim,
  TechSpecSection,
} from './featureTruth/types';

export const featureTruthLedger: readonly FeatureClaim[] = [
  ...brainSensesClaims,
  ...identityConscienceClaims,
  ...memoryImmuneClaims,
];

/** Display metadata per category — release-safe, factual section framing. */
const categoryMeta: Readonly<
  Record<FeatureTruthCategory, { readonly title: string; readonly description: string }>
> = {
  brain: {
    title: 'The Brain (Durable Orchestration)',
    description:
      'Durable orchestration substrate: agent runtime with compensation paths and semantic memory.',
  },
  senses: {
    title: 'The Senses (Physical AI Perception)',
    description: 'Perception interfaces governed by zero-trust controls.',
  },
  identity: {
    title: 'The Identity (Silicon-Level Trust)',
    description: 'Device-bound trust with zero-trust registration.',
  },
  conscience: {
    title: 'The Conscience (Governance Layer)',
    description:
      'Tri-Force governance ensures intent passes policy before execution, with manual approval for high-risk actions.',
  },
  memory: {
    title: 'The Memory (Immutable Records)',
    description: 'Structured audit logging across governed actions.',
  },
  immune: {
    title: 'The Immune System (Verification)',
    description: 'Continuous verification, secret scanning, and infrastructure hardening.',
  },
};

const CATEGORY_ORDER: readonly FeatureTruthCategory[] = [
  'brain',
  'senses',
  'identity',
  'conscience',
  'memory',
  'immune',
];

/**
 * Project the ledger into the Tech Specs section shape, including ONLY
 * `CERTIFIED_FUNCTIONING` claims and using each claim's `releaseCopy`.
 * Categories with no certified claims are omitted entirely.
 */
export function buildCertifiedTechSpecSections(): readonly TechSpecSection[] {
  return CATEGORY_ORDER.map((category) => {
    const details = featureTruthLedger
      .filter(
        (claim) =>
          claim.category === category &&
          claim.status === 'CERTIFIED_FUNCTIONING' &&
          claim.releaseCopy !== null,
      )
      .map((claim) => claim.releaseCopy as string);

    return {
      id: category,
      title: categoryMeta[category].title,
      description: categoryMeta[category].description,
      details,
    };
  }).filter((section) => section.details.length > 0);
}

export const certifiedTechSpecSections: readonly TechSpecSection[] =
  buildCertifiedTechSpecSections();
