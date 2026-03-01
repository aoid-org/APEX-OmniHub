/**
 * Entitlements Service
 * Manages feature access and paywall gating for OmniConnect connectors.
 *
 * Current implementation: in-memory store, fail-closed by default.
 * Entitlements must be explicitly granted via grantEntitlement() before
 * checkEntitlement() will return true. This prevents accidental feature
 * exposure on new deployments.
 *
 * Integration path: replace the in-memory Map with a Supabase query
 * against the user_roles / subscriptions table once the billing system
 * is wired. The interface contract (checkEntitlement / grantEntitlement /
 * revokeEntitlement) is stable and must not change.
 */

export interface EntitlementCheck {
  tenantId: string;
  userId: string;
  appId: string;
  feature: string;
  granted: boolean;
  reason?: string;
}

export class EntitlementsService {
  private entitlements = new Map<string, boolean>();

  async checkEntitlement(
    tenantId: string,
    userId: string,
    appId: string,
    feature: string
  ): Promise<boolean> {
    const key = `${tenantId}:${userId}:${appId}:${feature}`;
    // Fail-closed: deny unless explicitly granted via grantEntitlement().
    return this.entitlements.get(key) ?? false;
  }

  async grantEntitlement(
    tenantId: string,
    userId: string,
    appId: string,
    feature: string
  ): Promise<void> {
    const key = `${tenantId}:${userId}:${appId}:${feature}`;
    this.entitlements.set(key, true);
  }

  async revokeEntitlement(
    tenantId: string,
    userId: string,
    appId: string,
    feature: string
  ): Promise<void> {
    const key = `${tenantId}:${userId}:${appId}:${feature}`;
    this.entitlements.set(key, false);
  }

  async listEntitlements(
    tenantId: string,
    userId: string
  ): Promise<Array<{ appId: string; feature: string; granted: boolean }>> {
    const result = [];

    for (const [key, granted] of this.entitlements.entries()) {
      const [keyTenantId, keyUserId, appId, feature] = key.split(':');
      if (keyTenantId === tenantId && keyUserId === userId) {
        result.push({ appId, feature, granted });
      }
    }

    return result;
  }
}
