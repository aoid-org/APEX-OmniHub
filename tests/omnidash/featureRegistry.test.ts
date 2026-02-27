import { describe, it, expect } from 'vitest';
import { OMNIDASH_FEATURE_REGISTRY, isFeatureEnabled, getFeaturesByRole } from '@/omnidash/featureRegistry';

describe('OmniDash Feature Registry', () => {
  it('contains all required feature keys', () => {
    expect(OMNIDASH_FEATURE_REGISTRY).toHaveProperty('omniboard');
    expect(OMNIDASH_FEATURE_REGISTRY).toHaveProperty('apex_agent');
    expect(OMNIDASH_FEATURE_REGISTRY).toHaveProperty('omnislate');
    expect(OMNIDASH_FEATURE_REGISTRY).toHaveProperty('integrated_apps');
  });

  it('validates feature structures', () => {
    for (const [id, feature] of Object.entries(OMNIDASH_FEATURE_REGISTRY)) {
      expect(feature.id).toBe(id);
      expect(feature.label).toBeDefined();
      expect(typeof feature.enabled).toBe('boolean');
      expect(['admin', 'user', 'public']).toContain(feature.requiredRole);
    }
  });

  it('resolves feature enablement dynamically', () => {
    expect(typeof isFeatureEnabled('omniboard')).toBe('boolean');
    // We expect unknown features to be strictly fail-closed
    expect(isFeatureEnabled('non_existent_feature_xxx')).toBe(false);
  });

  it('filters features by role authorization', () => {
    const adminFeatures = getFeaturesByRole('admin');
    const userFeatures = getFeaturesByRole('user');
    
    expect(adminFeatures.length).toBeGreaterThan(0);
    expect(userFeatures.length).toBeGreaterThan(0);
    // User role should not be able to see admin-only features
    expect(userFeatures.some(f => f.requiredRole === 'admin')).toBe(false);
  });
});
