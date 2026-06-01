import { supabase } from '@/lib/supabase';

export async function exportAuditLogCSV(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('omnitrace_events')
    .select('id, event_type, event_text, severity, color_token, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (!data?.length) return;

  const headers = 'ID,Event Type,Event Text,Severity,Created At\n';
  const rows = data.map(row =>
    `${row.id},${row.event_type},"${row.event_text.replace(/"/g, '""')}",${row.severity},${row.created_at}`
  ).join('\n');

  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
