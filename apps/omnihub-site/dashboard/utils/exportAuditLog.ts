import { supabase } from '@/lib/supabase';

/**
 * Exports the same `audit_logs` rows shown live in AuditsModule (RLS-scoped
 * to actor_id = auth.uid()), so the download always matches what's on screen.
 */
export async function exportAuditLogCSV(): Promise<{ ok: boolean; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Sign in required to export the audit log.' };

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action_type, resource_type, resource_id, metadata, created_at')
    .eq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) return { ok: false, message: `Export failed: ${error.message}` };
  if (!data?.length) return { ok: false, message: 'No audit log entries to export yet.' };

  const headers = 'ID,Action Type,Resource Type,Resource ID,Metadata,Created At\n';
  const rows = data.map((row) => {
    const metadata = row.metadata ? JSON.stringify(row.metadata).replaceAll('"', '""') : '';
    return `${row.id},${row.action_type},${row.resource_type ?? ''},${row.resource_id ?? ''},"${metadata}",${row.created_at}`;
  }).join('\n');

  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { ok: true, message: `Exported ${data.length} audit log ${data.length === 1 ? 'entry' : 'entries'} to CSV.` };
}
