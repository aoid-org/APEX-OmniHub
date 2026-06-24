> **Historical Note:** This document contains legacy certification terminology. It has been superseded by the manual owner-approval process. CI now produces factual validation summaries only. CI validates. Owner certifies.

/**
 * Claim-truth gate.
 *
 * Proves the production Tech Specs page can only display claims that are
 * certified as functioning in the Feature Truth Ledger, and that no
 * unsupported / hidden / downgraded claim string can leak into the public
 * site content. This is the release tripwire for product-truth.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  featureTruthLedger,
  certifiedTechSpecSections,
  buildCertifiedTechSpecSections,
  type FeatureTruthStatus,
} from '../../apps/omnihub-site/src/content/featureTruth';

const SITE_SRC = resolve(__dirname, '../../apps/omnihub-site/src/content/site.ts');
const PAGE_SRC = resolve(__dirname, '../../apps/omnihub-site/src/pages/TechSpecs.tsx');

const VALID_STATUSES: readonly FeatureTruthStatus[] = [
  'CERTIFIED_FUNCTIONING',
  'BACKEND_FOUNDATION_ONLY',
  'ROADMAP_ONLY',
  'HIDDEN_FOR_RELEASE',
  'REQUIRES_OWNER_VALIDATION',
  'NO_GO_BLOCKER',
];

/** Literal strings that must NEVER appear in shipped public site content. */
const FORBIDDEN_PUBLIC_LITERALS: readonly string[] = [
  '40,000',
  '0% escape',
  'Armageddon L7',
  '9876',
  'Whisper',
  'Eyes: Multimodal',
  'Multimodal vision input',
  'FaceID / TouchID',
  'Workflow state visualization',
  '365-day',
  'Full reconstruction of any agent chain',
];

describe('Feature Truth Ledger integrity', () => {
  it('has no duplicate claim IDs', () => {
    const ids = featureTruthLedger.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate public labels', () => {
    const labels = featureTruthLedger.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('gives every claim a valid status and category', () => {
    for (const claim of featureTruthLedger) {
      expect(VALID_STATUSES).toContain(claim.status);
      expect(['brain', 'senses', 'identity', 'conscience', 'memory', 'immune']).toContain(
        claim.category,
      );
    }
  });

  it('requires release copy for every certified claim', () => {
    for (const claim of featureTruthLedger) {
      if (claim.status === 'CERTIFIED_FUNCTIONING') {
        expect(claim.releaseCopy, `${claim.id} must have releaseCopy`).toBeTruthy();
        expect(claim.evidence.length, `${claim.id} must cite evidence`).toBeGreaterThan(0);
      }
    }
  });

  it('flags numeric-proof and native/biometric claims as non-certified', () => {
    const mustNotBeCertified = [
      'immune.armageddon40k',
      'immune.zeroEscape',
      'senses.eyes',
      'senses.whisper',
      'identity.faceid',
      'conscience.omnilink9876',
      'brain.workflowViz',
      'memory.fullChain',
    ];
    for (const id of mustNotBeCertified) {
      const claim = featureTruthLedger.find((c) => c.id === id);
      expect(claim, `${id} must exist in ledger`).toBeDefined();
      expect(claim?.status).not.toBe('CERTIFIED_FUNCTIONING');
    }
  });
});

describe('Certified Tech Specs projection', () => {
  it('is deterministic', () => {
    expect(buildCertifiedTechSpecSections()).toEqual(certifiedTechSpecSections);
  });

  it('only contains bullets backed by a CERTIFIED_FUNCTIONING claim', () => {
    const certifiedReleaseCopy = new Set(
      featureTruthLedger
        .filter((c) => c.status === 'CERTIFIED_FUNCTIONING' && c.releaseCopy)
        .map((c) => c.releaseCopy as string),
    );
    const seen = new Set<string>();
    for (const section of certifiedTechSpecSections) {
      expect(section.details.length).toBeGreaterThan(0);
      for (const bullet of section.details) {
        expect(certifiedReleaseCopy.has(bullet), `unbacked bullet: ${bullet}`).toBe(true);
        // every visible bullet maps to exactly one claim
        expect(seen.has(bullet), `duplicate bullet: ${bullet}`).toBe(false);
        seen.add(bullet);
      }
    }
  });

  it('never surfaces a hidden/roadmap/owner-validation claim', () => {
    const nonShippable = new Set(
      featureTruthLedger
        .filter((c) => c.status !== 'CERTIFIED_FUNCTIONING')
        .map((c) => c.publicCopy),
    );
    for (const section of certifiedTechSpecSections) {
      for (const bullet of section.details) {
        expect(nonShippable.has(bullet), `leaked non-certified copy: ${bullet}`).toBe(false);
      }
    }
  });
});

describe('Public site content carries no unsupported claim literals', () => {
  const siteSource = readFileSync(SITE_SRC, 'utf8');
  const pageSource = readFileSync(PAGE_SRC, 'utf8');

  it('site.ts does not hardcode unsupported claim strings', () => {
    for (const literal of FORBIDDEN_PUBLIC_LITERALS) {
      expect(siteSource.includes(literal), `site.ts must not contain "${literal}"`).toBe(false);
    }
  });

  it('TechSpecs page does not hardcode unsupported claim strings', () => {
    for (const literal of FORBIDDEN_PUBLIC_LITERALS) {
      expect(pageSource.includes(literal), `TechSpecs.tsx must not contain "${literal}"`).toBe(
        false,
      );
    }
  });

  it('site.ts derives Tech Specs sections from the truth ledger', () => {
    expect(siteSource).toContain('certifiedTechSpecSections');
  });
});
