import { describe, expect, it } from 'vitest';

import { resolveOmniSkills, type OmniSkillsClient } from '../../supabase/functions/omnilink-port/omniskills';

function resultBuilder(result: { data: unknown; error: unknown; count?: number }) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    limit: () => builder,
    maybeSingle: async () => result,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

describe('OmniSkills state resolver', () => {
  it('uses RLS-backed entitlement and active-skill counts', async () => {
    const calls: string[] = [];
    const client = {
      from(table: string) {
        calls.push(table);
        return table === 'user_entitlements'
          ? resultBuilder({ data: { tier: 'BASIC' }, error: null })
          : resultBuilder({ data: null, error: null, count: 3 });
      },
    } as unknown as OmniSkillsClient;

    const state = await resolveOmniSkills(client);
    expect(calls).toEqual(['user_entitlements', 'user_generated_skills']);
    expect(state.count).toBe(3);
    expect(state.items[0].detail).toBe('3/5');
    expect(state.stats).toContainEqual({ label: 'Plan', value: 'BASIC' });
  });

  it('reports PRO usage without inventing a finite limit', async () => {
    const client = {
      from(table: string) {
        return table === 'user_entitlements'
          ? resultBuilder({ data: { tier: 'PRO' }, error: null })
          : resultBuilder({ data: null, error: null, count: 12 });
      },
    } as unknown as OmniSkillsClient;
    const state = await resolveOmniSkills(client);
    expect(state.items[0].detail).toBe('12');
    expect(state.stats).toContainEqual({ label: 'Free Skills Used', value: '12/Unlimited' });
  });

  it('fails closed on either database error', async () => {
    const client = {
      from(table: string) {
        return table === 'user_entitlements'
          ? resultBuilder({ data: null, error: new Error('denied') })
          : resultBuilder({ data: null, error: null, count: 0 });
      },
    } as unknown as OmniSkillsClient;
    await expect(resolveOmniSkills(client)).rejects.toThrow('omniskills_query_failed');
  });
});
