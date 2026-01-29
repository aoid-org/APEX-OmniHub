import { buildCorsHeaders, handlePreflight, isOriginAllowed } from '../_shared/cors.ts';
import { authenticateUser, createSupabaseClient } from '../_shared/auth.ts';

const MAX_AUDIT_LOGS = 100;

const EXPORT_TABLES: Record<
  string,
  { table: string; select: string; single?: boolean; orderBy?: string }
> = {
  profile: { table: 'profiles', select: 'full_name,avatar_url,created_at,updated_at', single: true },
  roles: { table: 'user_roles', select: 'role,created_at' },
  links: { table: 'links', select: 'id,title,url,created_at,updated_at' },
  files: { table: 'files', select: 'id,name,size_bytes,created_at,updated_at' },
  settings: { table: 'settings', select: 'id,key,value,updated_at' },
};

type ExportBundle = Record<string, unknown>;

async function fetchTableData(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<ExportBundle> {
  const bundle: ExportBundle = {};

  for (const [key, cfg] of Object.entries(EXPORT_TABLES)) {
    const query = supabase.from(cfg.table).select(cfg.select).eq('user_id', userId);
    const { data, error } = cfg.single ? await query.maybeSingle() : await query;
    if (error) continue; // Best-effort export; skip missing tables/policies
    bundle[key] = cfg.single ? (data ?? null) : data;
  }

  // Limit audit logs to recent entries to keep payload small
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('action_type,resource_type,resource_id,created_at,metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_AUDIT_LOGS);

  bundle.audit_logs = auditLogs ?? [];

  return bundle;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')?.replace(/\/$/, '') ?? null;
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  if (!isOriginAllowed(origin)) {
    return new Response('Origin not allowed', { status: 403, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createSupabaseClient();
    const authHeader = req.headers.get('Authorization');
    const auth = await authenticateUser(authHeader, supabase);
    if (!auth.success || !auth.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bundle = await fetchTableData(supabase, auth.user.id);

    const payload = {
      user_id: auth.user.id,
      exported_at: new Date().toISOString(),
      data: bundle,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="omnihub-export-${auth.user.id}.json"`,
      },
    });
  } catch (error) {
    console.error('user-export error:', error);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
