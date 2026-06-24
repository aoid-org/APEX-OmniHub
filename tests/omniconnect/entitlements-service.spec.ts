import { beforeEach, describe, expect, it, vi } from 'vitest';

type TenantEntitlementRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  app_id: string;
  feature_key: string;
  is_active: boolean;
};

const rows: TenantEntitlementRow[] = [];

class QueryBuilder {
  private filters: Array<[keyof TenantEntitlementRow, unknown]> = [];
  private selectedColumns = '';
  private pendingPatch: Pick<TenantEntitlementRow, 'is_active'> | null = null;

  select(columns: string): this {
    this.selectedColumns = columns;
    return this;
  }

  eq(column: keyof TenantEntitlementRow, value: unknown): this {
    this.filters.push([column, value]);
    return this;
  }

  limit(_count: number): Promise<{ data: Partial<TenantEntitlementRow>[]; error: null }> {
    return this.then((result) => result);
  }

  insert(row: Omit<TenantEntitlementRow, 'id'>): Promise<{ error: null }> {
    rows.push({ id: crypto.randomUUID(), ...row });
    return Promise.resolve({ error: null });
  }

  upsert(
    row: Omit<TenantEntitlementRow, 'id'>,
    _options: { onConflict: string },
  ): Promise<{ error: null }> {
    const existing = rows.find((candidate) =>
      candidate.tenant_id === row.tenant_id &&
      candidate.user_id === row.user_id &&
      candidate.app_id === row.app_id &&
      candidate.feature_key === row.feature_key
    );

    if (existing) {
      existing.is_active = row.is_active;
    } else {
      rows.push({ id: crypto.randomUUID(), ...row });
    }

    return Promise.resolve({ error: null });
  }

  update(patch: Pick<TenantEntitlementRow, 'is_active'>): QueryBuilder {
    this.pendingPatch = patch;
    return this;
  }

  then<TResult1 = { data: Partial<TenantEntitlementRow>[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Partial<TenantEntitlementRow>[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.projectRows(), error: null }).then(onfulfilled, onrejected);
  }

  private filteredRows(): TenantEntitlementRow[] {
    if (this.pendingPatch) {
      const patch = this.pendingPatch;
      this.pendingPatch = null;
      for (const row of rows.filter((candidate) => this.filters.every(([column, value]) => candidate[column] === value))) {
        row.is_active = patch.is_active;
      }
    }

    return rows.filter((row) => this.filters.every(([column, value]) => row[column] === value));
  }

  private projectRows(): Partial<TenantEntitlementRow>[] {
    const filtered = this.filteredRows();
    if (this.selectedColumns === 'app_id, feature_key') {
      return filtered.map(({ app_id, feature_key }) => ({ app_id, feature_key }));
    }
    if (this.selectedColumns === 'id') {
      return filtered.map(({ id }) => ({ id }));
    }
    return filtered;
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      expect(table).toBe('tenant_entitlements');
      return new QueryBuilder();
    }),
  })),
}));

describe('EntitlementsService', () => {
  beforeEach(() => {
    rows.length = 0;
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
    vi.resetModules();
  });

  it('grants, checks, lists, and soft-revokes tenant-scoped entitlements', async () => {
    const { EntitlementsService } = await import('@/omniconnect/entitlements/entitlements-service');
    const service = new EntitlementsService();

    await expect(service.checkEntitlement('tenant-1', '00000000-0000-0000-0000-000000000001', 'crm', 'sync')).resolves.toBe(false);

    await service.grantEntitlement('tenant-1', '00000000-0000-0000-0000-000000000001', 'crm', 'sync');

    await expect(service.checkEntitlement('tenant-1', '00000000-0000-0000-0000-000000000001', 'crm', 'sync')).resolves.toBe(true);
    await expect(service.listEntitlements('tenant-1', '00000000-0000-0000-0000-000000000001')).resolves.toEqual([
      { appId: 'crm', feature: 'sync', granted: true },
    ]);

    await service.revokeEntitlement('tenant-1', '00000000-0000-0000-0000-000000000001', 'crm', 'sync');

    await expect(service.checkEntitlement('tenant-1', '00000000-0000-0000-0000-000000000001', 'crm', 'sync')).resolves.toBe(false);
    await expect(service.listEntitlements('tenant-1', '00000000-0000-0000-0000-000000000001')).resolves.toEqual([]);
  });
});
