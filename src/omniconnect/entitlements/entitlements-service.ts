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

import { LRUCache } from 'lru-cache';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export interface EntitlementCheck {
  tenantId: string;
  userId: string;
  appId: string;
  feature: string;
  granted: boolean;
  reason?: string;
}

export class EntitlementsService {
  private readonly cache: LRUCache<string, boolean>;
  private readonly supabase: SupabaseClient<Database> | null = null;

  constructor() {
    this.cache = new LRUCache<string, boolean>({
      max: 500,
      ttl: 60000,
    });

    // Assume environment variables are provided
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    } else {
      console.warn('Supabase credentials missing for EntitlementsService');
    }
  }

  async checkEntitlement(
    tenantId: string,
    userId: string,
    appId: string,
    feature: string
  ): Promise<boolean> {
    const key = `${tenantId}:${userId}:${appId}:${feature}`;

    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    if (!this.supabase) return false;

    try {
      const { data, error } = await this.supabase
        .from('tenant_entitlements')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .eq('app_id', appId)
        .eq('feature_key', feature)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('Error checking entitlement:', error);
        return false;
      }

      const granted = data && data.length > 0;
      this.cache.set(key, granted);
      return granted;
    } catch (e) {
      console.error('Exception checking entitlement:', e);
      return false;
    }
  }

  async grantEntitlement(
    tenantId: string,
    userId: string,
    appId: string,
    feature: string
  ): Promise<void> {
    const key = `${tenantId}:${userId}:${appId}:${feature}`;

    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('tenant_entitlements')
        .upsert({
          tenant_id: tenantId,
          user_id: userId,
          app_id: appId,
          feature_key: feature,
          is_active: true,
        }, { onConflict: 'tenant_id,user_id,app_id,feature_key' });

      if (error) {
        console.error('Error granting entitlement:', error);
      } else {
        // Invalidate cache
        this.cache.delete(key);
      }
    } catch (e) {
      console.error('Exception granting entitlement:', e);
    }
  }

  async revokeEntitlement(
    tenantId: string,
    userId: string,
    appId: string,
    feature: string
  ): Promise<void> {
    const key = `${tenantId}:${userId}:${appId}:${feature}`;

    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('tenant_entitlements')
        .update({ is_active: false })
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .eq('app_id', appId)
        .eq('feature_key', feature);

      if (error) {
        console.error('Error revoking entitlement:', error);
      } else {
        // Invalidate cache
        this.cache.delete(key);
      }
    } catch (e) {
      console.error('Exception revoking entitlement:', e);
    }
  }

  async listEntitlements(
    tenantId: string,
    userId: string
  ): Promise<Array<{ appId: string; feature: string; granted: boolean }>> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('tenant_entitlements')
        .select('app_id, feature_key')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error listing entitlements:', error);
        return [];
      }

      return (data || []).map((row: Record<string, unknown>) => ({
        appId: typeof row.app_id === 'string' ? row.app_id : '',
        feature: typeof row.feature_key === 'string' ? row.feature_key : '',
        granted: true
      }));
    } catch (e) {
      console.error('Exception listing entitlements:', e);
      return [];
    }
  }
}
