/**
 * PATCH 3: Post-Login Routing Tests
 *
 * Tests intelligent routing after authentication:
 * - Deep-link preservation
 * - Role-based routing (admin → /omnidash, paid → /dashboard, free → /pricing)
 * - Access validation
 */

import { describe, it, expect } from 'vitest';
import { getPostLoginDestination, requiresPaidAccess, requiresAdminAccess } from '@/utils/postLoginRouter';

describe('getPostLoginDestination', () => {
  describe('Default routing (no intended destination)', () => {
    it('should route admin to /omnidash', () => {
      const destination = getPostLoginDestination({
        isAdmin: true,
        isPaid: false,
        tier: 'free',
      });

      expect(destination).toBe('/omnidash');
    });

    it('should route paid user to /dashboard', () => {
      const destination = getPostLoginDestination({
        isAdmin: false,
        isPaid: true,
        tier: 'pro',
      });

      expect(destination).toBe('/dashboard');
    });

    it('should route free user to /pricing', () => {
      const destination = getPostLoginDestination({
        isAdmin: false,
        isPaid: false,
        tier: 'free',
      });

      expect(destination).toBe('/pricing');
    });

    it('should prefer admin routing even if user is also paid', () => {
      const destination = getPostLoginDestination({
        isAdmin: true,
        isPaid: true,
        tier: 'enterprise',
      });

      expect(destination).toBe('/omnidash');
    });
  });

  describe('Deep-link preservation (intended destination)', () => {
    it('should honor accessible intended destination for admin', () => {
      const destination = getPostLoginDestination({
        isAdmin: true,
        isPaid: false,
        tier: 'free',
        intendedDestination: '/omnidash/pipeline',
      });

      expect(destination).toBe('/omnidash/pipeline');
    });

    it('should honor accessible intended destination for paid user', () => {
      const destination = getPostLoginDestination({
        isAdmin: false,
        isPaid: true,
        tier: 'pro',
        intendedDestination: '/dashboard',
      });

      expect(destination).toBe('/dashboard');
    });

    it('should preserve query params in intended destination', () => {
      const destination = getPostLoginDestination({
        isAdmin: false,
        isPaid: true,
        tier: 'starter',
        intendedDestination: '/dashboard?tab=links&sort=name',
      });

      expect(destination).toBe('/dashboard?tab=links&sort=name');
    });

    it('should redirect to /pricing if intended destination requires paid access', () => {
      const destination = getPostLoginDestination({
        isAdmin: false,
        isPaid: false,
        tier: 'free',
        intendedDestination: '/dashboard',
      });

      expect(destination).toMatch(/^\/pricing\?reason=premium/);
      expect(destination).toContain('return=%2Fdashboard');
    });

    it('should redirect to /pricing if free user tries to access OmniDash', () => {
      const destination = getPostLoginDestination({
        isAdmin: false,
        isPaid: false,
        tier: 'free',
        intendedDestination: '/omnidash',
      });

      expect(destination).toMatch(/^\/pricing\?reason=omnidash/);
      expect(destination).toContain('return=%2Fomnidash');
    });

    it('should allow paid user to access OmniDash (not admin-only)', () => {
      const destination = getPostLoginDestination({
        isAdmin: false,
        isPaid: true,
        tier: 'pro',
        intendedDestination: '/omnidash/kpis',
      });

      expect(destination).toBe('/omnidash/kpis');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string intended destination', () => {
      const destination = getPostLoginDestination({
        isAdmin: false,
        isPaid: true,
        tier: 'pro',
        intendedDestination: '',
      });

      // Empty string is falsy, so default routing applies
      expect(destination).toBe('/dashboard');
    });

    it('should handle public route as intended destination', () => {
      const destination = getPostLoginDestination({
        isAdmin: false,
        isPaid: false,
        tier: 'free',
        intendedDestination: '/privacy',
      });

      // Public routes are accessible to all
      expect(destination).toBe('/privacy');
    });

    it('should handle nested OmniDash routes', () => {
      const destination = getPostLoginDestination({
        isAdmin: true,
        isPaid: false,
        tier: 'free',
        intendedDestination: '/omnidash/pipeline/item/123',
      });

      expect(destination).toBe('/omnidash/pipeline/item/123');
    });
  });
});

describe('requiresPaidAccess', () => {
  it('should return true for /dashboard', () => {
    expect(requiresPaidAccess('/dashboard')).toBe(true);
  });

  it('should return true for /links', () => {
    expect(requiresPaidAccess('/links')).toBe(true);
  });

  it('should return true for /files', () => {
    expect(requiresPaidAccess('/files')).toBe(true);
  });

  it('should return true for /omnidash', () => {
    expect(requiresPaidAccess('/omnidash')).toBe(true);
  });

  it('should return false for /pricing', () => {
    expect(requiresPaidAccess('/pricing')).toBe(false);
  });

  it('should return false for /privacy', () => {
    expect(requiresPaidAccess('/privacy')).toBe(false);
  });

  it('should return false for /', () => {
    expect(requiresPaidAccess('/')).toBe(false);
  });
});

describe('requiresAdminAccess', () => {
  it('should return false for /omnidash (paid users can access)', () => {
    // OmniDash is accessible to paid users, not admin-only
    expect(requiresAdminAccess('/omnidash')).toBe(false);
  });

  it('should return false for /dashboard (paid users can access)', () => {
    expect(requiresAdminAccess('/dashboard')).toBe(false);
  });

  it('should return false for public routes', () => {
    expect(requiresAdminAccess('/pricing')).toBe(false);
    expect(requiresAdminAccess('/')).toBe(false);
  });
});

describe('Comprehensive routing scenarios', () => {
  const scenarios = [
    // Admin scenarios
    {
      name: 'Admin, no intent',
      options: { isAdmin: true, isPaid: false, tier: 'free' as const },
      expected: '/omnidash',
    },
    {
      name: 'Admin, wants /omnidash/pipeline',
      options: { isAdmin: true, isPaid: false, tier: 'free' as const, intendedDestination: '/omnidash/pipeline' },
      expected: '/omnidash/pipeline',
    },
    {
      name: 'Admin, wants /dashboard (allowed)',
      options: { isAdmin: true, isPaid: true, tier: 'enterprise' as const, intendedDestination: '/dashboard' },
      expected: '/dashboard',
    },

    // Paid user scenarios
    {
      name: 'Pro user, no intent',
      options: { isAdmin: false, isPaid: true, tier: 'pro' as const },
      expected: '/dashboard',
    },
    {
      name: 'Starter user, wants /omnidash',
      options: { isAdmin: false, isPaid: true, tier: 'starter' as const, intendedDestination: '/omnidash' },
      expected: '/omnidash',
    },
    {
      name: 'Enterprise user, wants /links',
      options: { isAdmin: false, isPaid: true, tier: 'enterprise' as const, intendedDestination: '/links' },
      expected: '/links',
    },

    // Free user scenarios
    {
      name: 'Free user, no intent',
      options: { isAdmin: false, isPaid: false, tier: 'free' as const },
      expected: '/pricing',
    },
    {
      name: 'Free user, wants /dashboard (blocked)',
      options: { isAdmin: false, isPaid: false, tier: 'free' as const, intendedDestination: '/dashboard' },
      expectedPattern: /^\/pricing\?reason=premium/,
    },
    {
      name: 'Free user, wants /omnidash (blocked)',
      options: { isAdmin: false, isPaid: false, tier: 'free' as const, intendedDestination: '/omnidash' },
      expectedPattern: /^\/pricing\?reason=omnidash/,
    },
    {
      name: 'Free user, wants /privacy (allowed)',
      options: { isAdmin: false, isPaid: false, tier: 'free' as const, intendedDestination: '/privacy' },
      expected: '/privacy',
    },
  ];

  scenarios.forEach(({ name, options, expected, expectedPattern }) => {
    it(name, () => {
      const destination = getPostLoginDestination(options);

      if (expected) {
        expect(destination).toBe(expected);
      } else if (expectedPattern) {
        expect(destination).toMatch(expectedPattern);
      }
    });
  });
});
