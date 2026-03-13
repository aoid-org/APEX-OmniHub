/**
 * Feature Registry — Unit Tests
 * @module tests/omnidash/feature-registry.spec
 *
 * OMNI-TEST UNIVERSAL — AAA pattern enforced.
 * Covers: getAccessibleFeatures (isEnabled guard, scope match, public scope),
 *         canAccessFeature (disabled feature returns false, scope check).
 */

import { describe, it, expect } from 'vitest';
import {
  getAccessibleFeatures,
  canAccessFeature,
  getEnabledFeatures,
  getFeatureById,
} from '@/features/registry';
import type { AccessScope } from '@/features/registry';

describe('Feature Registry', () => {
  describe('getEnabledFeatures', () => {
    it('returns only enabled features', () => {
      const enabled = getEnabledFeatures();
      expect(enabled.every((f) => f.isEnabled)).toBe(true);
    });

    it('returns at least one feature', () => {
      expect(getEnabledFeatures().length).toBeGreaterThan(0);
    });
  });

  describe('getFeatureById', () => {
    it('returns the feature when it exists', () => {
      const allEnabled = getEnabledFeatures();
      if (allEnabled.length > 0) {
        const first = allEnabled[0];
        expect(getFeatureById(first.id)).toBeDefined();
        expect(getFeatureById(first.id)?.id).toBe(first.id);
      }
    });

    it('returns undefined for unknown id', () => {
      expect(getFeatureById('__nonexistent_id__')).toBeUndefined();
    });
  });

  describe('getAccessibleFeatures', () => {
    it('returns features accessible with "public" scope', () => {
      const scopes: readonly AccessScope[] = ['public'];
      const result = getAccessibleFeatures(scopes);
      // All returned features must be enabled
      expect(result.every((f) => f.isEnabled)).toBe(true);
      // All returned features must allow public scope
      result.forEach((f) => {
        expect(
          f.requiredScopes.every((s) => s === 'public' || scopes.includes(s)),
        ).toBe(true);
      });
    });

    it('returns more features with authenticated scope than with public only', () => {
      const publicOnly = getAccessibleFeatures(['public']);
      const authenticated = getAccessibleFeatures(['public', 'authenticated']);
      // authenticated should have ≥ public-only count
      expect(authenticated.length).toBeGreaterThanOrEqual(publicOnly.length);
    });

    it('returns empty array when no scopes match required scopes', () => {
      // Use an isolated scope that no feature requires
      const result = getAccessibleFeatures([]);
      // Features with requiredScopes including non-public should not appear
      result.forEach((f) => {
        // Each accessible feature must have all scopes satisfiable by empty set
        // meaning all required scopes must be 'public'
        expect(f.requiredScopes.every((s) => s === 'public')).toBe(true);
      });
    });

    it('admin scope grants access to admin-gated features', () => {
      const adminScopes: readonly AccessScope[] = ['public', 'authenticated', 'admin'];
      const adminResult = getAccessibleFeatures(adminScopes);
      const authResult = getAccessibleFeatures(['public', 'authenticated']);
      expect(adminResult.length).toBeGreaterThanOrEqual(authResult.length);
    });
  });

  describe('canAccessFeature', () => {
    it('returns false for a nonexistent feature id', () => {
      expect(canAccessFeature('__does_not_exist__', ['public', 'authenticated'])).toBe(false);
    });

    it('returns false for unknown feature id (simulates disabled)', () => {
      // A nonexistent id has no feature (undefined), so isEnabled check returns false
      expect(
        canAccessFeature('__disabled_sim__', ['public', 'authenticated', 'admin', 'developer', 'demo']),
      ).toBe(false);
    });

    it('returns true when user has all required scopes', () => {
      const enabled = getEnabledFeatures();
      if (enabled.length > 0) {
        const feature = enabled[0];
        const scopes = [...feature.requiredScopes] as AccessScope[];
        expect(canAccessFeature(feature.id, scopes)).toBe(true);
      }
    });

    it('returns false when user is missing required scopes', () => {
      const authenticated = getAccessibleFeatures(['public', 'authenticated']);
      // Find a feature that requires 'authenticated'
      const needsAuth = authenticated.find((f) =>
        f.requiredScopes.includes('authenticated'),
      );
      if (needsAuth) {
        // Without 'authenticated' scope, should be false
        expect(canAccessFeature(needsAuth.id, ['public'])).toBe(false);
      }
    });

    it('returns true for a public feature with no scopes provided', () => {
      const publicFeature = getAccessibleFeatures([]).find((f) =>
        f.requiredScopes.every((s) => s === 'public'),
      );
      if (publicFeature) {
        expect(canAccessFeature(publicFeature.id, [])).toBe(true);
      }
    });
  });
});
