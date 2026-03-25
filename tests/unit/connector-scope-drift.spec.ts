import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

async function checkScopeDrift(
  integrationId: string,
  requiredScopes: string[]
): Promise<{ drifted: boolean; missing: string[] }> {
  const { data, error } = await supabase
    .from('omnilink_api_keys')
    .select('scopes')
    .eq('integration_id', integrationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { drifted: false, missing: [] };  // Fail-open on query error
  }

  let granted: string[];
  if (Array.isArray(data.scopes)) {
    granted = data.scopes;
  } else if (typeof data.scopes === 'object' && data.scopes !== null) {
    granted = Object.keys(data.scopes);
  } else {
    granted = [];
  }

  const missing = requiredScopes.filter((s) => !granted.includes(s));
  return { drifted: missing.length > 0, missing };
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  }
}));

describe('ConnectorKit scope drift detection', () => {
  it('no drift: reconnect proceeds silently', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { scopes: ['read', 'write'] },
                error: null,
              })
            })
          })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    const { drifted } = await checkScopeDrift('conn-1', ['read', 'write']);
    expect(drifted).toBe(false);
  });

  it('drift detected: missing scopes returned', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { scopes: ['read'] },
                error: null,
              })
            })
          })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    const { drifted, missing } = await checkScopeDrift('conn-1', ['read', 'write', 'delete']);
    expect(drifted).toBe(true);
    expect(missing).toEqual(['write', 'delete']);
  });
});
